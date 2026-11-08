export function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const radians = (value: number) => value * Math.PI / 180;
  const h = Math.sin(radians(b.latitude - a.latitude) / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(radians(b.longitude - a.longitude) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
