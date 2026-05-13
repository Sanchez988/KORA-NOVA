/**
 * Redondea coordenadas a ~1,1 km (2 decimales) para mostrar en mapas públicos
 * sin revelar la posición exacta del usuario.
 */
export function snapApproximatePublicCoordinate(lat: number, lng: number): { lat: number; lng: number } {
  const p = 2;
  const f = 10 ** p;
  return {
    lat: Math.round(lat * f) / f,
    lng: Math.round(lng * f) / f,
  };
}
