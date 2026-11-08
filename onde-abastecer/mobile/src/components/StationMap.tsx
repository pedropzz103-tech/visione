import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { clusterStations } from '../../../shared/query';
import { colorForBand } from '../lib/pricing';
import type { StationMapProps } from './mapTypes';
export default function StationMap({ center, stations, fuel, onSelect, onRegionChange, locationGranted }: StationMapProps) {
  const ref = useRef<MapView>(null);
  const [region, setRegion] = useState(center);
  useEffect(() => { ref.current?.animateToRegion(center, 400); setRegion(center); }, [center]);
  const clusters = useMemo(() => clusterStations(stations, region), [stations, region]);
  return <MapView ref={ref} style={StyleSheet.absoluteFill} initialRegion={center} showsUserLocation={locationGranted} onRegionChangeComplete={r => { setRegion(r); onRegionChange(r); }}>
    {clusters.map(cluster => {
      const many = cluster.stations.length > 1;
      const station = cluster.stations[0]!;
      const price = station.prices.find(p => p.fuel === fuel);
      return <Marker key={cluster.key} coordinate={cluster} accessibilityLabel={many ? `${cluster.stations.length} postos / stations` : `${station.name}, ${price?.price} ${price?.currency}/L`} onPress={() => {
        if (many) ref.current?.animateToRegion({ ...cluster, latitudeDelta: region.latitudeDelta / 3, longitudeDelta: region.longitudeDelta / 3 }, 400);
        else onSelect(station);
      }}>
        <View style={[styles.marker, { backgroundColor: many ? '#183A36' : colorForBand(station.priceBand) }]}><Text style={styles.text}>{many ? `${cluster.stations.length} ●` : `${price?.price.toFixed(3)} ${price?.currency}/L`}</Text></View>
      </Marker>;
    })}
  </MapView>;
}
const styles = StyleSheet.create({ marker: { minWidth: 48, minHeight: 36, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 18, borderWidth: 2, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center' }, text: { color: '#FFF', fontWeight: '800', fontSize: 12 } });
