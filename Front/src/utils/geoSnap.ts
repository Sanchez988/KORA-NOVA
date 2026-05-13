/** Misma lógica que Back/src/lib/geoPrivacy (~1,1 km). */
export function snapApproximatePublicCoordinate(lat: number, lng: number): { lat: number; lng: number } {
  const p = 2;
  const f = 10 ** p;
  return {
    lat: Math.round(lat * f) / f,
    lng: Math.round(lng * f) / f,
  };
}
