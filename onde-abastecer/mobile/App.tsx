import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import StationMap from './src/components/StationMap';
import type { MapRegion } from './src/components/mapTypes';
import { ApiError, createStationClient } from './src/api/client';
import { FUEL_LABELS, FUEL_TYPES, LAUNCH_COUNTRIES } from './src/config/countries';
import { translator, type Language, type TextKey } from './src/config/i18n';
import { normalizeApiUrl } from './src/lib/apiUrl';
import { colorForBand, formatPrice } from './src/lib/pricing';
import { calculateSavings, fillVolume } from '../shared/economy';
import { decimal, priceFreshness, validCoordinates } from '../shared/normalization';
import { selectStations, stationKey, type SortOrder } from '../shared/query';
import type { CountryCode, FuelType, Station } from './src/types';

const INITIAL: MapRegion = { latitude: 42.2406, longitude: -8.7207, latitudeDelta: 0.18, longitudeDelta: 0.18 };
const DEFAULT_API_URL = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL) ?? '';
const API_KEY = 'oa:api:v1';
const PREF_KEY = 'oa:preferences:v1';
const FAV_KEY = 'oa:favorites:v1';
const DEFAULT_VEHICLE = { liters: '40', consumption: '6', capacity: '50', remaining: '20' };
function Button({ label, onPress, active = false, disabled = false }: { label: string; onPress: () => void; active?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active, disabled }} onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.button, active && styles.activeButton, (pressed || disabled) && { opacity: 0.65 }]}><Text style={[styles.buttonText, active && styles.activeText]}>{label}</Text></Pressable>;
}
function Field({ label, value, set, placeholder }: { label: string; value: string; set: (v: string) => void; placeholder?: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={set} placeholder={placeholder} keyboardType="decimal-pad" style={styles.input} /></View>;
}
function Application() {
  const [language, setLanguage] = useState<Language>('pt');
  const t = translator(language);
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [country, setCountry] = useState<CountryCode>('ES');
  const [fuel, setFuel] = useState<FuelType>('gasoline95');
  const [center, setCenter] = useState(INITIAL);
  const [mapRegion, setMapRegion] = useState(INITIAL);
  const [radius, setRadius] = useState(30);
  const [search, setSearch] = useState('');
  const [stations, setStations] = useState<Station[]>([]);
  const [selected, setSelected] = useState<Station | null>(null);
  const [reference, setReference] = useState<Station | null>(null);
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [panel, setPanel] = useState<'filters' | 'vehicle' | 'connection' | null>(DEFAULT_API_URL ? null : 'connection');
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [apiDraft, setApiDraft] = useState(DEFAULT_API_URL);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const client = useMemo(() => createStationClient({ baseUrl: apiUrl, storage: AsyncStorage }), [apiUrl]);
  const [brand, setBrand] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [only24h, setOnly24h] = useState(false);
  const [service, setService] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOrder>('price');
  const [vehicle, setVehicle] = useState(DEFAULT_VEHICLE);
  const [volumeMode, setVolumeMode] = useState<'manual' | 'tank'>('manual');
  const [detourMode, setDetourMode] = useState<'return' | 'route'>('route');
  const [extraKm, setExtraKm] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [error, setError] = useState<TextKey | null>(null);
  const [notice, setNotice] = useState<TextKey | null>(null);
  const [offline, setOffline] = useState(false);
  const [retrievedAt, setRetrievedAt] = useState('');
  const [refresh, setRefresh] = useState(0);
  const locationRequest = useRef(0);
  const activeSearch = useRef<AbortController | null>(null);
  const localGeneration = useRef(0);
  const localWrites = useRef<Promise<unknown>>(Promise.resolve());
  const clearingLocal = useRef(false);
  const query = useMemo(() => ({ country, fuel, latitude: center.latitude, longitude: center.longitude, radiusKm: radius }), [country, fuel, center, radius]);

  useEffect(() => {
    let active = true;
    const generation = localGeneration.current;
    void Promise.all([AsyncStorage.getItem(FAV_KEY), AsyncStorage.getItem(PREF_KEY), AsyncStorage.getItem(API_KEY)]).then(([fav, pref, server]) => {
      if (!active || generation !== localGeneration.current) return;
      const configured = normalizeApiUrl(server);
      if (configured) { setApiUrl(configured); setApiDraft(configured); setPanel(null); }
      if (fav) { const value = JSON.parse(fav); if (Array.isArray(value)) setFavorites(value.filter(v => typeof v === 'string').slice(0, 200)); }
      if (pref) {
        const value = JSON.parse(pref);
        if (value.language === 'pt' || value.language === 'en') setLanguage(value.language);
        if (value.vehicle && Object.values(value.vehicle).every(v => typeof v === 'string' && decimal(v) != null)) setVehicle({ ...DEFAULT_VEHICLE, ...value.vehicle });
      }
    }).catch(() => { if (active) setNotice('storageFailed'); }).finally(() => { if (active) setPreferencesLoaded(true); });
    return () => { active = false; locationRequest.current++; };
  }, []);
  useEffect(() => {
    if (!preferencesLoaded) return;
    const controller = new AbortController();
    activeSearch.current = controller;
    setLoading(true); setError(null); setStations([]); setSelected(null); setOffline(false); setRetrievedAt('');
    void client(query, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setStations(result.stations); setOffline(result.cache === 'offline'); setRetrievedAt(result.retrievedAt);
    }).catch(e => {
      if (!controller.signal.aborted) setError(e instanceof ApiError && e.code in ERROR_KEYS ? ERROR_KEYS[e.code] ?? 'network_error' : 'network_error');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, refresh, client, preferencesLoaded]);

  const visible = useMemo(() => selectStations(stations, fuel, { brand, maxPrice: decimal(maxPrice), only24h, service, favorites, onlyFavorites: favoritesOnly }, center, sort), [stations, fuel, brand, maxPrice, only24h, service, favorites, favoritesOnly, center, sort]);
  const brands = [...new Set(stations.map(s => s.brand).filter((v): v is string => !!v))].sort();
  const services = [...new Set(stations.flatMap(s => s.services ?? []))].sort();
  const selectedPrice = selected?.prices.find(p => p.fuel === fuel);
  const referencePrice = reference?.prices.find(p => p.fuel === fuel);
  const liters = volumeMode === 'manual' ? decimal(vehicle.liters) : fillVolume(decimal(vehicle.capacity) ?? NaN, decimal(vehicle.remaining) ?? NaN);
  const savings = selectedPrice && referencePrice && !offline ? calculateSavings({ reference: referencePrice, candidate: selectedPrice, liters: liters ?? NaN, consumptionLitersPer100Km: decimal(vehicle.consumption) ?? NaN, detour: decimal(extraKm) == null ? undefined : detourMode === 'return' ? { mode: 'return', oneWayKm: decimal(extraKm)! } : { mode: 'route', additionalKm: decimal(extraKm)! } }) : null;

  async function persistLocal(key: string, value: string) {
    if (clearingLocal.current) return false;
    const generation = localGeneration.current;
    localWrites.current = localWrites.current.catch(() => {}).then(async () => {
      if (generation === localGeneration.current) await AsyncStorage.setItem(key, value);
    });
    try { await localWrites.current; } catch (error) { if (generation !== localGeneration.current) return false; throw error; }
    return generation === localGeneration.current;
  }
  async function resetLocal() {
    if (clearingLocal.current) return;
    clearingLocal.current = true;
    localGeneration.current++; locationRequest.current++;
    activeSearch.current?.abort(); setLocating(false); setLoading(false); setError(null);
    setApiUrl(''); setApiDraft(''); setPanel('connection');
    setFavorites([]); setVehicle(DEFAULT_VEHICLE); setStations([]); setSelected(null); setReference(null); setExtraKm(''); setOffline(false); setRetrievedAt('');
    try {
      await Promise.all([client.clearCache(), localWrites.current.catch(() => {})]);
      await AsyncStorage.multiRemove([FAV_KEY, PREF_KEY, API_KEY, 'oa:lastSearch:v1']);
      setNotice('resetDone');
    } catch { setNotice('storageFailed'); }
    finally { clearingLocal.current = false; }
  }
  async function saveServer() {
    const next = normalizeApiUrl(apiDraft);
    if (!next) { setNotice('invalidApiUrl'); return; }
    const generation = localGeneration.current;
    locationRequest.current++; setLocating(false); activeSearch.current?.abort();
    try {
      await client.clearCache();
      if (!await persistLocal(API_KEY, next) || generation !== localGeneration.current) return;
      setReference(null); setExtraKm(''); setApiUrl(next); setApiDraft(next); setRefresh(v => v + 1); setPanel(null); setNotice('apiSaved');
    } catch { if (generation === localGeneration.current) setNotice('storageFailed'); }
  }
  function searchMapArea() {
    locationRequest.current++; setLocating(false); setNotice(null);
    setCenter({ ...mapRegion }); setRefresh(v => v + 1);
  }
  function selectStation(station: Station) { setExtraKm(''); setSelected(station); }
  function clearFilters() { setBrand(''); setMaxPrice(''); setOnly24h(false); setService(''); setFavoritesOnly(false); }
  function chooseCountry(code: CountryCode) {
    locationRequest.current++; setLocating(false);
    const item = LAUNCH_COUNTRIES.find(c => c.code === code)!;
    setCountry(code); setCenter({ ...INITIAL, latitude: item.latitude, longitude: item.longitude }); clearFilters(); setNotice(null);
  }
  function chooseFuel(next: FuelType) { locationRequest.current++; setLocating(false); setFuel(next); setReference(null); setExtraKm(''); clearFilters(); }
  async function locate() {
    const request = ++locationRequest.current;
    setLocating(true); setNotice(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (request !== locationRequest.current) return;
      if (permission.status !== 'granted') { setNotice('permission'); return; }
      setLocationGranted(true);
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const addresses = await Location.reverseGeocodeAsync(position.coords).catch(() => []);
      if (request !== locationRequest.current) return;
      const code = addresses[0]?.isoCountryCode?.toUpperCase();
      if (code && !LAUNCH_COUNTRIES.some(c => c.code === code)) { setNotice('unsupported_country'); return; }
      if (code) setCountry(code as CountryCode);
      clearFilters(); setCenter({ ...INITIAL, latitude: position.coords.latitude, longitude: position.coords.longitude }); setNotice(code ? 'gps' : 'gpsManualCountry');
    } catch { if (request === locationRequest.current) setNotice('locationFailed'); }
    finally { if (request === locationRequest.current) setLocating(false); }
  }
  async function manualSearch() {
    const request = ++locationRequest.current; setLocating(false);
    setNotice(null);
    const pair = search.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (pair) {
      const latitude = Number(pair[1]), longitude = Number(pair[2]);
      if (!validCoordinates(latitude, longitude)) { setNotice('invalid_coordinates'); return; }
      setCenter({ ...INITIAL, latitude, longitude }); return;
    }
    if (Platform.OS === 'web') { setNotice('webSearch'); return; }
    if (!search.trim()) { setNotice('addressFailed'); return; }
    setLocating(true);
    try {
      // Android requires this permission even for its system geocoding service.
      if (Platform.OS === 'android') {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (request !== locationRequest.current) return;
        if (permission.status !== 'granted') { setNotice('permission'); return; }
      }
      const countryName = LAUNCH_COUNTRIES.find(c => c.code === country)!.name;
      const results = await Location.geocodeAsync(`${search.trim()}, ${countryName}`);
      if (request !== locationRequest.current) return;
      const result = results[0];
      if (!result || !validCoordinates(result.latitude, result.longitude)) { setNotice('addressFailed'); return; }
      setCenter({ ...INITIAL, latitude: result.latitude, longitude: result.longitude });
    } catch { if (request === locationRequest.current) setNotice('addressFailed'); }
    finally { if (request === locationRequest.current) setLocating(false); }
  }
  async function toggleFavorite(station: Station) {
    const key = stationKey(station);
    const next = favorites.includes(key) ? favorites.filter(v => v !== key) : [...favorites, key].slice(-200);
    setFavorites(next);
    try { await persistLocal(FAV_KEY, JSON.stringify(next)); } catch { setNotice('storageFailed'); }
  }
  async function saveVehicle() {
    if (!Object.values(vehicle).every(v => decimal(v) != null) || (decimal(vehicle.liters) ?? 0) <= 0 || (decimal(vehicle.consumption) ?? 0) <= 0 || fillVolume(decimal(vehicle.capacity) ?? 0, decimal(vehicle.remaining) ?? -1) == null) { setNotice('invalidVehicle'); return; }
    try { if (await persistLocal(PREF_KEY, JSON.stringify({ language, vehicle }))) setNotice('saved'); } catch { setNotice('storageFailed'); }
  }
  async function openNavigation(station: Station) {
    const destination = `${station.latitude},${station.longitude}`;
    const url = Platform.OS === 'ios' ? `https://maps.apple.com/?daddr=${destination}&dirflg=d` : `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
    try { await Linking.openURL(url); } catch { setNotice('navigationFailed'); }
  }
  async function share(station: Station) {
    try { await Share.share({ message: `${station.name}\n${station.address}\n${selectedPrice ? formatPrice(selectedPrice.price, selectedPrice.currency, language) + '/L' : ''}\n${station.source}\n${selectedPrice?.updatedAt ?? t('unknownAge')}\nhttps://www.google.com/maps/search/?api=1&query=${station.latitude},${station.longitude}` }); } catch { setNotice('navigationFailed'); }
  }
  function fuelLabel(value: FuelType) { return value === 'gasoline95' ? t('fuel95Label') : FUEL_LABELS[value]; }
  function date(raw?: string) { return raw && Number.isFinite(Date.parse(raw)) ? new Date(raw).toLocaleString(language === 'pt' ? 'pt-PT' : 'en-GB') : t('unknown'); }
  function age(station: Station): string {
    const p = station.prices.find(p => p.fuel === fuel);
    if (!p) return t('unknownAge');
    return t(priceFreshness(p) === 'fresh' ? 'fresh' : priceFreshness(p) === 'stale' ? 'stale' : 'unknownAge');
  }
  const vehicleFields = <>
    <View style={styles.row}><Button label={t('volumeMode')} active={volumeMode === 'manual'} onPress={() => setVolumeMode('manual')} /><Button label={t('tankMode')} active={volumeMode === 'tank'} onPress={() => setVolumeMode('tank')} /></View>
    <View style={styles.wrap}>{(['liters', 'consumption', 'capacity', 'remaining'] as const).map(key => <Field key={key} label={t(key)} value={vehicle[key]} set={v => setVehicle(old => ({ ...old, [key]: v }))} />)}</View>
    <Button label={t('saveVehicle')} onPress={() => void saveVehicle()} />
  </>;
  function stationRow(item: Station & { distanceKm: number }) {
    const price = item.prices.find(p => p.fuel === fuel)!;
    return <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}, ${formatPrice(price.price, price.currency, language)}/L, ${item.distanceKm.toFixed(1)} km, ${age(item)}`} onPress={() => selectStation(item)} style={styles.stationRow}>
      <View style={[styles.pricePill, { backgroundColor: colorForBand(item.priceBand) }]}><Text style={styles.priceValue}>{formatPrice(price.price, price.currency, language)}</Text><Text style={styles.priceUnit}>/ L</Text></View>
      <View style={styles.stationCopy}><Text style={styles.stationName}>{favorites.includes(stationKey(item)) ? '★ ' : ''}{item.brand || item.name}</Text><Text style={styles.muted}>{item.address}</Text><Text style={styles.age}>{age(item)}</Text></View>
      <Text style={styles.distance}>{item.distanceKm.toFixed(1)} km{ '\n' }↗</Text>
    </Pressable>;
  }
  return <SafeAreaView style={styles.safe}>
    <View style={styles.header}><View style={{ flex: 1 }}><Text style={styles.eyebrow}>VISIONE / {t('categories')}</Text><Text accessibilityRole="header" style={styles.title}>Onde Abastecer</Text><Text style={styles.muted}>{t('subtitle')}</Text></View><Button label={language === 'pt' ? 'EN' : 'PT'} onPress={() => setLanguage(language === 'pt' ? 'en' : 'pt')} /></View>
    <View style={styles.searchRow}><TextInput accessibilityLabel={t('searchPlaceholder')} placeholder={t('searchPlaceholder')} value={search} onChangeText={setSearch} onSubmitEditing={() => void manualSearch()} returnKeyType="search" style={[styles.input, { flex: 1 }]} /><Button label={t('search')} active onPress={() => void manualSearch()} disabled={locating} /></View>
    <ScrollView horizontal style={styles.horizontal} contentContainerStyle={styles.chips} showsHorizontalScrollIndicator={false}>
      <Button label={locating ? '…' : `⌖ ${t('locate')}`} onPress={() => void locate()} disabled={locating} />
      {LAUNCH_COUNTRIES.map(c => <Button key={c.code} label={`${c.flag} ${c.code}${c.available ? '' : ' · ' + t('planned')}`} active={country === c.code} onPress={() => chooseCountry(c.code)} />)}
    </ScrollView>
    <ScrollView horizontal style={styles.horizontal} contentContainerStyle={styles.chips} showsHorizontalScrollIndicator={false}>{FUEL_TYPES.map(f => <Button key={f} label={fuelLabel(f)} active={fuel === f} onPress={() => chooseFuel(f)} />)}</ScrollView>
    <View style={styles.toolbar}><View style={styles.row}><Button label={t('map')} active={mode === 'map'} onPress={() => setMode('map')} /><Button label={`${t('list')} (${visible.length})`} active={mode === 'list'} onPress={() => setMode('list')} /></View><View style={styles.row}><Button label={t('apiSettings')} active={panel === 'connection'} onPress={() => { setApiDraft(apiUrl); setPanel(panel === 'connection' ? null : 'connection'); }} /><Button label={t('filters')} active={panel === 'filters'} onPress={() => setPanel(panel === 'filters' ? null : 'filters')} /><Button label={t('vehicle')} active={panel === 'vehicle'} onPress={() => setPanel(panel === 'vehicle' ? null : 'vehicle')} /></View></View>
    {panel ? <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>{panel === 'vehicle' ? <>{vehicleFields}<Text style={styles.muted}>{t('privacy')}</Text><Button label={t('resetLocal')} onPress={() => void resetLocal()} /></> : panel === 'connection' ? <><Text accessibilityRole="header" style={styles.heading}>{t('apiSettings')}</Text><Text style={styles.small}>{t('apiHelp')}</Text><TextInput accessibilityLabel={t('apiUrl')} placeholder="https://api.example.com" autoCapitalize="none" autoCorrect={false} keyboardType="url" value={apiDraft} onChangeText={setApiDraft} style={styles.input} /><Button label={t('saveApi')} active onPress={() => void saveServer()} /></> : <>
      <Text style={styles.label}>{t('radius')}</Text><View style={styles.wrap}>{[5, 10, 30, 50, 100].map(r => <Button key={r} label={`${r} km`} active={radius === r} onPress={() => setRadius(r)} />)}</View>
      <Field label={t('maxPrice')} value={maxPrice} set={setMaxPrice} />
      {brands.length ? <><Text style={styles.label}>{t('brand')}</Text><View style={styles.wrap}><Button label={t('all')} active={!brand} onPress={() => setBrand('')} />{brands.map(b => <Button key={b} label={b} active={brand === b} onPress={() => setBrand(b)} />)}</View></> : null}
      {stations.some(s => s.automated24h) ? <View style={styles.toggle}><Text style={styles.body}>{t('only24')}</Text><Switch accessibilityLabel={t('only24')} value={only24h} onValueChange={setOnly24h} /></View> : null}
      {services.length ? <><Text style={styles.label}>{t('service')}</Text><View style={styles.wrap}><Button label={t('all')} active={!service} onPress={() => setService('')} />{services.map(s => <Button key={s} label={s} active={service === s} onPress={() => setService(s)} />)}</View></> : null}
      <View style={styles.toggle}><Text style={styles.body}>{t('favoritesOnly')}</Text><Switch accessibilityLabel={t('favoritesOnly')} value={favoritesOnly} onValueChange={setFavoritesOnly} /></View><Button label={t('clear')} onPress={clearFilters} />
    </>}</ScrollView> : null}
    {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{t(notice)}</Text> : null}
    {loading ? <View accessibilityLiveRegion="polite" style={styles.status}><ActivityIndicator color="#176C50" /><Text style={styles.body}>{t('loading')}</Text></View> : error ? <View accessibilityLiveRegion="assertive" style={styles.error}><Text style={styles.body}>{t(error)}</Text><Button label={t('retry')} onPress={() => setRefresh(r => r + 1)} /></View> : null}
    {offline ? <Text accessibilityLiveRegion="polite" style={styles.offline}>{t('offline')} · {date(retrievedAt)}</Text> : null}
    <View style={[styles.content, wide && styles.wide]}>
      {mode === 'map' ? <View style={styles.map}><StationMap center={center} stations={visible} fuel={fuel} onSelect={selectStation} onRegionChange={setMapRegion} locationGranted={locationGranted} /><View style={styles.mapAction}><Button label={t('searchHere')} active onPress={searchMapArea} /></View><View style={styles.legend}><Text style={styles.muted}>{t('price')}</Text>{([1, 2, 3, 4, 5] as const).map(b => <View key={b} style={[styles.dot, { backgroundColor: colorForBand(b) }]} />)}</View></View> : null}
      {(mode === 'list' || wide) ? <View style={[styles.list, wide && mode === 'map' && { maxWidth: 460 }]}><View style={styles.listHeader}><Text accessibilityRole="header" style={styles.heading}>{visible.length} {t('stationsCount')}</Text><View style={styles.row}><Button label={t('price')} active={sort === 'price'} onPress={() => setSort('price')} /><Button label={t('distance')} active={sort === 'distance'} onPress={() => setSort('distance')} /></View></View><Text style={styles.small}>{t('straight')}</Text><FlatList data={visible} keyExtractor={stationKey} renderItem={({ item }) => stationRow(item)} ListEmptyComponent={!loading && !error ? <Text style={styles.empty}>{t('empty')}</Text> : null} ListFooterComponent={<View style={styles.footer}><Text style={styles.small}>{t('published')}</Text><Text style={styles.small}>{retrievedAt ? `${t('received')}: ${date(retrievedAt)}` : ''}</Text><Text style={styles.small}>{t('future')}</Text></View>} /></View> : null}
      {mode === 'map' && !wide && !loading && !error && visible.length === 0 ? <View pointerEvents="none" style={styles.mapEmpty}><Text style={styles.body}>{t('empty')}</Text></View> : null}
    </View>
    <Text style={styles.bottomNote}>{t('published')}</Text>
    <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)} transparent>
      <View style={styles.modalOverlay}><SafeAreaView style={styles.modalSheet}><View style={styles.modalHeader}><Text accessibilityRole="header" style={styles.heading}>{t('details')}</Text><Button label={t('close')} onPress={() => setSelected(null)} /></View><ScrollView contentContainerStyle={styles.details}>
        {selected && selectedPrice ? <>
          <Text style={styles.title}>{selected.brand || selected.name}</Text><Text style={styles.body}>{selected.address}</Text><Text style={styles.detailPrice}>{formatPrice(selectedPrice.price, selectedPrice.currency, language)} / L</Text><Text style={styles.body}>{selectedPrice.label || fuelLabel(fuel)} · {selected.country}</Text>
          <Text style={styles.age}>{age(selected)}</Text><Text style={styles.small}>{t(selectedPrice.timestampKind === 'feed' ? 'feedUpdated' : 'updated')}: {date(selectedPrice.updatedAt)}</Text>{selectedPrice.reportedAt ? <Text style={styles.small}>{selectedPrice.reportedAt}</Text> : null}
          <Text style={styles.body}>{t('source')}: {selected.source}</Text><Text style={styles.small}>{t('legal')}</Text>
          {selected.sourceUrl ? <Button label={t('sourceLink')} onPress={() => { if (selected.sourceUrl?.startsWith('https://')) void Linking.openURL(selected.sourceUrl).catch(() => setNotice('navigationFailed')); }} /> : null}
          <Text style={styles.body}>{t('hours')}: {selected.openingHours || t('unknown')}</Text><Text style={styles.body}>{selectedPrice.serviceMode === 'self' ? t('self') : selectedPrice.serviceMode === 'attended' ? t('attended') : t('modeUnknown')}</Text>{selected.services?.length ? <Text style={styles.body}>{t('services')}: {selected.services.join(', ')}</Text> : null}
          <View style={styles.wrap}><Button label={t('navigate')} active onPress={() => void openNavigation(selected)} /><Button label={t('share')} onPress={() => void share(selected)} /><Button label={favorites.includes(stationKey(selected)) ? t('unfavorite') : t('favorite')} onPress={() => void toggleFavorite(selected)} /></View>
          <Button label={t('reference')} onPress={() => { setReference(selected); setSelected(null); setExtraKm(''); }} />
          <View style={styles.savings}><Text accessibilityRole="header" style={styles.heading}>{t('savings')}</Text>{reference ? <Text style={styles.body}>{t('referenceSet')}: {reference.name} · {reference.country}</Text> : <Text style={styles.body}>{t('noReference')}</Text>}
            {vehicleFields}
            <View style={styles.wrap}><Button label={t('routeMode')} active={detourMode === 'route'} onPress={() => { setDetourMode('route'); setExtraKm(''); }} /><Button label={t('returnMode')} active={detourMode === 'return'} onPress={() => { setDetourMode('return'); setExtraKm(''); }} /></View><Field label={t(detourMode === 'return' ? 'oneWay' : 'extraKm')} value={extraKm} set={setExtraKm} />
            <Text style={styles.small}>{t('basis')}</Text>
            {savings?.status === 'ok' ? <><Text style={styles.body}>{t('gross')}: {formatPrice(savings.gross, savings.currency, language)}</Text><Text style={styles.body}>{t('travel')}: {formatPrice(savings.travelCost, savings.currency, language)} · {savings.additionalKm} km</Text><Text style={styles.net}>{t('net')}: {formatPrice(savings.net, savings.currency, language)}</Text><Text style={styles.small}>{t('assumptions')}</Text></> : <Text style={styles.age}>{t('insufficient')}{offline ? `: ${t('offlineReason')}` : savings?.status === 'insufficient' ? `: ${t(REASON_KEYS[savings.reason] ?? 'unknown')}` : ''}</Text>}
            <Text style={styles.small}>{t('formula')}</Text>
          </View>
        </> : null}
      </ScrollView></SafeAreaView></View>
    </Modal>
  </SafeAreaView>;
}
const ERROR_KEYS: Record<string, TextKey> = { rate_limited: 'rate_limited', api_not_configured: 'api_not_configured', network_error: 'network_error', source_unavailable: 'source_unavailable', country_not_live_yet: 'country_not_live_yet', unsupported_country: 'unsupported_country', invalid_response: 'invalid_response', request_rejected: 'request_rejected', invalid_coordinates: 'invalid_coordinates', invalid_radius: 'invalid_radius', invalid_fuel: 'invalid_fuel' };
const REASON_KEYS: Record<string, TextKey> = { currency: 'currency', fuel: 'fuel', service_mode: 'service_mode', unit_or_price: 'unit_or_price', timestamp: 'timestamp', vehicle: 'vehicleReason', road_distance: 'road_distance' };
export default function App() { return <SafeAreaProvider><Application /></SafeAreaProvider>; }
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F0' }, header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }, eyebrow: { fontSize: 11, letterSpacing: 2, color: '#476B5B', fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 }, title: { fontSize: 27, lineHeight: 34, fontWeight: '800', color: '#183A36', letterSpacing: -0.8 }, muted: { color: '#53645F', fontSize: 12, lineHeight: 18 }, small: { color: '#53645F', fontSize: 12, lineHeight: 18 }, body: { color: '#243D35', fontSize: 14, lineHeight: 21, flexShrink: 1 }, searchRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, paddingBottom: 6 }, input: { backgroundColor: '#FFF', borderColor: '#B8C7BE', borderWidth: 1, borderRadius: 12, minHeight: 46, paddingHorizontal: 12, color: '#183A36', fontSize: 14 }, button: { borderRadius: 12, minHeight: 44, paddingVertical: 10, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D6DED5' }, activeButton: { backgroundColor: '#183A36', borderColor: '#183A36' }, buttonText: { fontSize: 12, color: '#294B3C', fontWeight: '700' }, activeText: { color: '#FFF' }, horizontal: { flexGrow: 0, flexShrink: 0 }, chips: { paddingHorizontal: 16, gap: 6, paddingVertical: 4, alignItems: 'center' }, row: { flexDirection: 'row', gap: 6, alignItems: 'center' }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }, toolbar: { paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }, panel: { maxHeight: 240, flexGrow: 0, backgroundColor: '#EAF0E7', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#D6DED5' }, panelContent: { padding: 16, gap: 12 }, field: { minWidth: 140, flexGrow: 1, flexBasis: 140, gap: 5 }, label: { color: '#294B3C', fontSize: 12, fontWeight: '700', marginBottom: 2 }, toggle: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' }, status: { flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingVertical: 8 }, error: { backgroundColor: '#FFE5DE', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' }, notice: { backgroundColor: '#EAF0E7', color: '#294B3C', paddingHorizontal: 16, paddingVertical: 8, fontSize: 12 }, offline: { backgroundColor: '#FFF0C4', color: '#704C00', padding: 10, fontSize: 12, fontWeight: '800' }, content: { flex: 1, minHeight: 220 }, wide: { flexDirection: 'row' }, map: { flex: 1, minHeight: 240, position: 'relative' }, mapAction: { position: 'absolute', top: 12, alignSelf: 'center', zIndex: 2 }, legend: { flexDirection: 'row', gap: 6, alignItems: 'center', position: 'absolute', bottom: 24, left: 12, backgroundColor: '#FFFFFFEE', borderRadius: 12, padding: 10 }, dot: { height: 9, width: 9, borderRadius: 5 }, list: { flex: 1, backgroundColor: '#F8FAF5' }, listHeader: { paddingHorizontal: 16, paddingTop: 10, flexDirection: 'row', gap: 10, justifyContent: 'space-between', alignItems: 'center' }, heading: { color: '#183A36', fontSize: 17, fontWeight: '800' }, stationRow: { padding: 14, borderBottomWidth: 1, borderColor: '#DDE5D9', gap: 12, flexDirection: 'row', alignItems: 'center' }, stationCopy: { flex: 1, gap: 4 }, stationName: { color: '#183A36', fontWeight: '800', fontSize: 15 }, pricePill: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' }, priceValue: { color: '#FFF', fontSize: 16, fontWeight: '800' }, priceUnit: { color: '#FFF', fontSize: 11 }, distance: { color: '#294B3C', fontSize: 12, fontWeight: '700', textAlign: 'right' }, age: { color: '#725500', fontWeight: '700', fontSize: 11, lineHeight: 17 }, empty: { color: '#53645F', padding: 24, fontSize: 15 }, footer: { padding: 16, gap: 10 }, bottomNote: { paddingVertical: 6, paddingHorizontal: 16, fontSize: 10, color: '#53645F', backgroundColor: '#F5F5F0' }, mapEmpty: { position: 'absolute', bottom: 20, marginHorizontal: 20, padding: 14, borderRadius: 16, backgroundColor: '#FFFFFFF2', alignSelf: 'center' }, modalOverlay: { flex: 1, backgroundColor: '#0C231E99', justifyContent: 'flex-end', alignItems: 'center' }, modalSheet: { width: '100%', maxWidth: 760, maxHeight: '94%', minHeight: '60%', backgroundColor: '#FAFBF7', borderTopLeftRadius: 24, borderTopRightRadius: 24 }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#DDE5D9' }, details: { padding: 20, gap: 12, paddingBottom: 50 }, detailPrice: { color: '#176C50', fontSize: 34, fontWeight: '800' }, savings: { marginTop: 8, padding: 16, backgroundColor: '#EBF1E5', borderRadius: 20, gap: 12 }, net: { color: '#183A36', fontSize: 20, fontWeight: '800' }
});
