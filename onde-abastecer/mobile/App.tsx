import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import * as Location from "expo-location";
import MapView, { Marker, type Region } from "react-native-maps";

import { getStations } from "./src/api/client";
import { FUEL_LABELS, FUEL_TYPES, LAUNCH_COUNTRIES } from "./src/config/countries";
import { colorForBand, formatPrice } from "./src/lib/pricing";
import type { CountryCode, FuelType, Station } from "./src/types";

const DEFAULT_REGION: Region = {
  latitude: 42.2406,
  longitude: -8.7207,
  latitudeDelta: 0.18,
  longitudeDelta: 0.18
};

const SUPPORTED_COUNTRIES = new Set<CountryCode>(
  LAUNCH_COUNTRIES.map((country) => country.code)
);

export default function App() {
  const mapRef = useRef<MapView>(null);
  const firstLoadDone = useRef(false);

  const [country, setCountry] = useState<CountryCode>("ES");
  const [fuel, setFuel] = useState<FuelType>("gasoline95");
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [stations, setStations] = useState<Station[]>([]);
  const [selected, setSelected] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState("Carregando postos próximos…");

  const visibleStations = useMemo(
    () => stations.filter((station) => station.prices.some((price) => price.fuel === fuel)),
    [stations, fuel]
  );

  useEffect(() => {
    void locateAndLoad();
  }, []);

  useEffect(() => {
    if (firstLoadDone.current) {
      void loadStations(region, country);
    }
  }, [fuel, country]);

  async function detectCountry(
    latitude: number,
    longitude: number
  ): Promise<CountryCode | undefined> {
    try {
      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
      const code = addresses[0]?.isoCountryCode?.toUpperCase() as CountryCode | undefined;
      return code && SUPPORTED_COUNTRIES.has(code) ? code : undefined;
    } catch {
      return undefined;
    }
  }

  async function locateAndLoad() {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status === "granted") {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });

        const nextRegion: Region = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.18,
          longitudeDelta: 0.18
        };

        const detectedCountry =
          (await detectCountry(nextRegion.latitude, nextRegion.longitude)) ?? country;

        setRegion(nextRegion);
        setCountry(detectedCountry);
        mapRef.current?.animateToRegion(nextRegion, 500);
        await loadStations(nextRegion, detectedCountry);
        firstLoadDone.current = true;
        return;
      }

      setBanner("Localização desativada. Você ainda pode explorar o mapa.");
      await loadStations(DEFAULT_REGION, country);
      firstLoadDone.current = true;
    } catch {
      setBanner("Não conseguimos obter sua localização. Mostrando a região inicial.");
      await loadStations(DEFAULT_REGION, country);
      firstLoadDone.current = true;
    }
  }

  async function loadStations(target: Region, requestedCountry: CountryCode) {
    setLoading(true);

    try {
      const result = await getStations({
        country: requestedCountry,
        latitude: target.latitude,
        longitude: target.longitude,
        radiusKm: 30,
        fuel
      });

      setStations(result.stations);
      setSelected(null);
      setBanner(
        result.message ??
          (result.stations.length
            ? `${result.stations.length} postos encontrados · ${FUEL_LABELS[fuel]}`
            : "Nenhum preço encontrado nesta área.")
      );
    } catch {
      setStations([]);
      setBanner("Falha ao carregar os preços. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function priceFor(station: Station) {
    return station.prices.find((price) => price.fuel === fuel);
  }

  function openNavigation(station: Station) {
    const destination = `${station.latitude},${station.longitude}`;
    const url =
      Platform.OS === "ios"
        ? `http://maps.apple.com/?daddr=${destination}&dirflg=d`
        : `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;

    void Linking.openURL(url);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.brand}>ONDE ABASTECER</Text>
          <Text style={styles.subtitle}>{banner}</Text>
        </View>
        {loading ? <ActivityIndicator /> : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.countryFilters}
      >
        {LAUNCH_COUNTRIES.map((item) => (
          <Pressable
            key={item.code}
            onPress={() => setCountry(item.code)}
            style={[styles.countryChip, country === item.code && styles.countryChipActive]}
          >
            <Text style={styles.countryFlag}>{item.flag}</Text>
            <Text
              style={[
                styles.countryChipText,
                country === item.code && styles.countryChipTextActive
              ]}
            >
              {item.code}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {FUEL_TYPES.map((item) => (
          <Pressable
            key={item}
            onPress={() => setFuel(item)}
            style={[styles.chip, fuel === item && styles.chipActive]}
          >
            <Text style={[styles.chipText, fuel === item && styles.chipTextActive]}>
              {FUEL_LABELS[item]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={DEFAULT_REGION}
          showsUserLocation
          showsMyLocationButton
          onRegionChangeComplete={setRegion}
          onPress={() => setSelected(null)}
        >
          {visibleStations.map((station) => {
            const price = priceFor(station);
            if (!price) return null;

            return (
              <Marker
                key={station.id}
                coordinate={{ latitude: station.latitude, longitude: station.longitude }}
                onPress={() => setSelected(station)}
                tracksViewChanges={false}
              >
                <View style={[styles.marker, { backgroundColor: colorForBand(station.priceBand) }]}>
                  <Text style={styles.markerPrice}>{price.price.toFixed(3)}</Text>
                </View>
              </Marker>
            );
          })}
        </MapView>

        <View style={styles.legend}>
          <Text style={styles.legendText}>barato</Text>
          {([1, 2, 3, 4, 5] as const).map((band) => (
            <View
              key={band}
              style={[styles.legendDot, { backgroundColor: colorForBand(band) }]}
            />
          ))}
          <Text style={styles.legendText}>caro</Text>
        </View>

        <Pressable
          style={styles.searchHere}
          onPress={() => void loadStations(region, country)}
        >
          <Text style={styles.searchHereText}>Buscar nesta área</Text>
        </Pressable>

        {selected ? (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.cardTitleWrap}>
                <Text style={styles.stationName}>{selected.brand || selected.name}</Text>
                <Text style={styles.address}>{selected.address}</Text>
              </View>
              {priceFor(selected) ? (
                <Text style={styles.bigPrice}>
                  {formatPrice(priceFor(selected)!.price, priceFor(selected)!.currency)}
                </Text>
              ) : null}
            </View>

            {selected.isDemo ? (
              <Text style={styles.demo}>DADOS DE DEMONSTRAÇÃO</Text>
            ) : null}

            <Text style={styles.meta}>
              {selected.openingHours ? `${selected.openingHours} · ` : ""}
              Fonte: {selected.source}
            </Text>

            <Pressable
              style={styles.routeButton}
              onPress={() => openNavigation(selected)}
            >
              <Text style={styles.routeButtonText}>Ir para este posto</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F7F5" },
  header: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  headerCopy: { flex: 1, paddingRight: 12 },
  brand: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.7,
    color: "#111827"
  },
  subtitle: { marginTop: 3, fontSize: 12, color: "#6B7280" },
  countryFilters: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 2,
    gap: 7
  },
  countryChip: {
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  countryChipActive: {
    borderColor: "#111827",
    backgroundColor: "#111827"
  },
  countryFlag: { fontSize: 15 },
  countryChipText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#374151"
  },
  countryChipTextActive: { color: "#FFFFFF" },
  filters: { paddingHorizontal: 14, paddingVertical: 8, gap: 8 },
  chip: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  chipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  chipText: { fontSize: 13, fontWeight: "700", color: "#374151" },
  chipTextActive: { color: "#FFFFFF" },
  mapWrap: { flex: 1, overflow: "hidden" },
  marker: {
    minWidth: 62,
    height: 34,
    paddingHorizontal: 8,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF"
  },
  markerPrice: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  legend: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 18,
    paddingHorizontal: 10,
    height: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  legendText: { fontSize: 10, fontWeight: "700", color: "#6B7280" },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  searchHere: {
    position: "absolute",
    top: 56,
    alignSelf: "center",
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 20,
    justifyContent: "center"
  },
  searchHereText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  card: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6
  },
  cardTop: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  cardTitleWrap: { flex: 1 },
  stationName: { fontSize: 17, fontWeight: "900", color: "#111827" },
  address: { marginTop: 3, fontSize: 12, color: "#6B7280" },
  bigPrice: { fontSize: 20, fontWeight: "900", color: "#111827" },
  demo: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: "#FEF3C7",
    color: "#92400E",
    fontSize: 10,
    fontWeight: "900"
  },
  meta: { marginTop: 10, fontSize: 11, color: "#6B7280" },
  routeButton: {
    marginTop: 12,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center"
  },
  routeButtonText: { color: "#FFFFFF", fontWeight: "900" }
});
