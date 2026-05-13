import type { PlansMapPayload } from '../services/plan.service';

export function collectPoints(data: PlansMapPayload): { lat: number; lng: number }[] {
  const pts: { lat: number; lng: number }[] = data.plans.map((p) => ({
    lat: p.approxLat,
    lng: p.approxLng,
  }));
  if (data.me) pts.push({ lat: data.me.approxLat, lng: data.me.approxLng });
  return pts;
}

export function boundsFor(pts: { lat: number; lng: number }[]) {
  const pad = 0.012;
  if (pts.length === 0) {
    return { minLat: 6.2 - pad, maxLat: 6.28 + pad, minLng: -75.62 - pad, maxLng: -75.52 + pad };
  }
  let minLat = Infinity,
    maxLat = -Infinity,
    minLng = Infinity,
    maxLng = -Infinity;
  for (const p of pts) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  if (minLat === maxLat) {
    minLat -= pad;
    maxLat += pad;
  } else {
    const d = (maxLat - minLat) * 0.15;
    minLat -= d;
    maxLat += d;
  }
  if (minLng === maxLng) {
    minLng -= pad;
    maxLng += pad;
  } else {
    const d = (maxLng - minLng) * 0.15;
    minLng -= d;
    maxLng += d;
  }
  return { minLat, maxLat, minLng, maxLng };
}

export interface FitRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export function regionFromBoundsBox(b: ReturnType<typeof boundsFor>): FitRegion {
  const lat = (b.minLat + b.maxLat) / 2;
  const lng = (b.minLng + b.maxLng) / 2;
  const latitudeDelta = Math.max((b.maxLat - b.minLat) * 1.2, 0.028);
  const longitudeDelta = Math.max((b.maxLng - b.minLng) * 1.2, 0.028);
  return { latitude: lat, longitude: lng, latitudeDelta, longitudeDelta };
}

/** Centro del mapa sin puntos (Medellín por defecto, coherente con `boundsFor([])`). */
export function emptyMapCenter(): { lat: number; lng: number } {
  const b = boundsFor([]);
  return { lat: (b.minLat + b.maxLat) / 2, lng: (b.minLng + b.maxLng) / 2 };
}

/** Centro geográfico de los pins (mejor que el centro del rectángulo con padding). */
export function mapAnchorFromPts(pts: { lat: number; lng: number }[]): { lat: number; lng: number } {
  if (pts.length === 0) return emptyMapCenter();
  const s = pts.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 });
  return { lat: s.lat / pts.length, lng: s.lng / pts.length };
}

/**
 * Span de región alrededor de un punto, con longitud ajustada por latitud (Web Mercator).
 * Misma lógica para Carto, Google JS y `react-native-maps`.
 */
export function mercatorCorrectedDeltas(latitude: number): { latitudeDelta: number; longitudeDelta: number } {
  const cos = Math.max(0.28, Math.cos((latitude * Math.PI) / 180));
  const latitudeDelta = 0.075;
  return { latitudeDelta, longitudeDelta: latitudeDelta / cos };
}

export function fitRegionAroundPoint(lat: number, lng: number): FitRegion {
  const { latitudeDelta, longitudeDelta } = mercatorCorrectedDeltas(lat);
  return { latitude: lat, longitude: lng, latitudeDelta, longitudeDelta };
}
