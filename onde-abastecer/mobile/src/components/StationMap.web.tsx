import { useEffect, useRef } from 'react';
import type * as Leaflet from 'leaflet';
import './leaflet.css';
import { clusterStations } from '../../../shared/query';
import { colorForBand } from '../lib/pricing';
import type { StationMapProps } from './mapTypes';
export default function StationMap({ center, stations, fuel, onSelect, onRegionChange }: StationMapProps) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const layer = useRef<Leaflet.LayerGroup | null>(null);
  const latest = useRef({ stations, fuel, onSelect, onRegionChange });
  latest.current = { stations, fuel, onSelect, onRegionChange };
  const draw = useRef<(() => void) | null>(null);
  useEffect(() => {
    let disposed = false;
    void import('leaflet').then(L => {
      if (disposed || !element.current) return;
      const m = L.map(element.current, { scrollWheelZoom: true }).setView([center.latitude, center.longitude], 11);
      map.current = m;
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 19 }).addTo(m);
      layer.current = L.layerGroup().addTo(m);
      draw.current = () => {
        if (!layer.current) return;
        layer.current.clearLayers();
        const bounds = m.getBounds();
        const c = m.getCenter();
        const region = { latitude: c.lat, longitude: c.lng, latitudeDelta: bounds.getNorth() - bounds.getSouth(), longitudeDelta: bounds.getEast() - bounds.getWest() };
        for (const cluster of clusterStations(latest.current.stations, region)) {
          const station = cluster.stations[0]!, many = cluster.stations.length > 1;
          const price = station.prices.find(p => p.fuel === latest.current.fuel);
          const button = document.createElement('button');
          button.textContent = many ? `${cluster.stations.length} ●` : `${price?.price.toFixed(3)} ${price?.currency}/L`;
          button.style.cssText = `background:${many ? '#183A36' : colorForBand(station.priceBand)};color:white;border:2px solid white;border-radius:20px;padding:7px 10px;font-weight:bold;white-space:nowrap;cursor:pointer;box-shadow:0 2px 6px #0003;min-height:36px`;
          button.setAttribute('aria-label', many ? `${cluster.stations.length} stations / postos` : `${station.name}, ${button.textContent}`);
          const marker = L.marker([cluster.latitude, cluster.longitude], { icon: L.divIcon({ html: button, className: '', iconSize: [96, 36], iconAnchor: [48, 18] }) });
          marker.on('click', () => many ? m.setView([cluster.latitude, cluster.longitude], m.getZoom() + 2) : latest.current.onSelect(station));
          marker.addTo(layer.current);
        }
        latest.current.onRegionChange(region);
      };
      m.on('moveend', () => draw.current?.());
      draw.current();
    });
    return () => { disposed = true; map.current?.remove(); map.current = null; draw.current = null; };
  }, []);
  useEffect(() => { map.current?.setView([center.latitude, center.longitude], 11); }, [center]);
  useEffect(() => { draw.current?.(); }, [stations, fuel]);
  return <div ref={element} aria-label="Mapa de postos / Station map" style={{ height: '100%', width: '100%', minHeight: 280, zIndex: 0 }} />;
}
