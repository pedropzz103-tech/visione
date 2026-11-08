import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { clusterStations, stationKey } from '../../../shared/query';
import { mapHtml } from '../generated/mapDocument';
import { parseMapMessage } from '../lib/mapBridge';
import { colorForBand } from '../lib/pricing';
import type { StationMapProps } from './mapTypes';
const source = { html: mapHtml, baseUrl: 'https://onde-abastecer.local/' };
export default function StationMap({ center, stations, fuel, onSelect, onRegionChange }: StationMapProps) {
  const ref = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [region, setRegion] = useState(center);
  useEffect(() => { setRegion(center); }, [center]);
  const markers = useMemo(() => clusterStations(stations, region).map(cluster => {
    const first = cluster.stations[0]!;
    const price = first.prices.find(p => p.fuel === fuel);
    const count = cluster.stations.length;
    return { key: stationKey(first), latitude: cluster.latitude, longitude: cluster.longitude, count, title: count > 1 ? `${count} postos / stations` : `${first.name}, ${price?.price} ${price?.currency}/L`, label: count > 1 ? `${count} ●` : `${price?.price.toFixed(3)} ${price?.currency}/L`, color: count > 1 ? '#183A36' : colorForBand(first.priceBand) };
  }), [stations, region, fuel]);
  useEffect(() => {
    if (ready) ref.current?.injectJavaScript(`window.oaUpdate(${JSON.stringify({ centerKey: JSON.stringify(center), center, markers })}); true;`);
  }, [ready, center, markers]);
  return <WebView ref={ref} source={source} style={StyleSheet.absoluteFill} javaScriptEnabled domStorageEnabled={false} allowFileAccess={false} mixedContentMode="never" setSupportMultipleWindows={false}
    userAgent="OndeAbastecer/0.1 (Android preview; https://github.com/pedropzz103-tech/visione)"
    onLoadStart={() => setReady(false)}
    onShouldStartLoadWithRequest={request => {
      if (request.url === 'about:blank' || request.url.startsWith(source.baseUrl)) return true;
      if (request.url.startsWith('https://www.openstreetmap.org/') || request.url.startsWith('https://leafletjs.com/')) void Linking.openURL(request.url).catch(() => {});
      return false;
    }}
    onMessage={event => {
      const message = parseMapMessage(event.nativeEvent.data);
      if (message?.type === 'ready') setReady(true);
      else if (message?.type === 'region') { setRegion(message); onRegionChange(message); }
      else if (message?.type === 'select') { const station = stations.find(s => stationKey(s) === message.key); if (station) onSelect(station); }
    }} />;
}
