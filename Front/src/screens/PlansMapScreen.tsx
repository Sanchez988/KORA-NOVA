import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  Platform,
  PanResponder,
  Alert,
} from 'react-native';
import axios from 'axios';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { planService, PlanMapPin, PlansMapPayload } from '../services/plan.service';
import { locationService } from '../services/location.service';
import { apiErrorDisplayMessage } from '../services/api';
import { getWebGeolocationCoords } from '../utils/permissions';
import { snapApproximatePublicCoordinate } from '../utils/geoSnap';
import PlansMapCanvas from './PlansMapCanvas';
import type { PlansMapCanvasRef } from './PlansMapCanvas.types';
import { collectPoints, boundsFor, mapAnchorFromPts } from './plansMapGeo';

/** Solo iOS usa `react-native-maps`. Android usa `PlansMapCanvas.android.tsx` (Carto) para evitar cierres con Google Maps SDK. */
const USE_NATIVE_MAP = Platform.OS === 'ios';

const GOOGLE_MAPS_KEY =
  typeof process !== 'undefined' && process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()
    ? String(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY).trim()
    : '';

/** Evita el rectángulo azul de selección de texto al arrastrar el mapa (web). */
const WEB_MAP_GUARD: Record<string, string> =
  Platform.OS === 'web'
    ? {
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        WebkitTouchCallout: 'none',
        cursor: 'grab',
      }
    : {};

function clearBrowserTextSelection() {
  if (Platform.OS !== 'web') return;
  try {
    const sel = typeof window !== 'undefined' ? window.getSelection?.() : null;
    if (sel && typeof sel.removeAllRanges === 'function') {
      sel.removeAllRanges();
    }
  } catch {
    /* noop */
  }
}

function project(
  lat: number,
  lng: number,
  b: ReturnType<typeof boundsFor>,
  w: number,
  h: number,
  marker: number
) {
  const spanLat = Math.max(b.maxLat - b.minLat, 1e-6);
  const spanLng = Math.max(b.maxLng - b.minLng, 1e-6);
  const x = ((lng - b.minLng) / spanLng) * w;
  const y = h - ((lat - b.minLat) / spanLat) * h;
  return {
    left: Math.max(0, Math.min(w - marker, x - marker / 2)),
    top: Math.max(0, Math.min(h - marker, y - marker / 2)),
  };
}

/** Tesela Carto / OSM (mismo esquema z/x/y que slippy map). */
function cartoVoyagerTileUrl(z: number, x: number, y: number): string {
  return `https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;
}

function latLngToTileXY(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = 2 ** zoom;
  const xtile = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const ytile = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x: xtile, y: ytile };
}

/** Borde norte de la fila de teselas `tileY` (Web Mercator). */
function tileNorthLat(tileY: number, z: number): number {
  const n = 2 ** z;
  const yNorm = Math.PI * (1 - (2 * tileY) / n);
  return (Math.atan(Math.sinh(yNorm)) * 180) / Math.PI;
}

/** Borde oeste de la columna de teselas `tileX`. */
function tileWestLng(tileX: number, z: number): number {
  const n = 2 ** z;
  return (tileX / n) * 360 - 180;
}

/** Zoom inicial según extensión de los puntos del mapa. */
function zoomFromBounds(b: ReturnType<typeof boundsFor>): number {
  const latSpan = Math.max(b.maxLat - b.minLat, 1e-6);
  if (latSpan > 2) return 8;
  if (latSpan > 0.5) return 9;
  if (latSpan > 0.15) return 10;
  if (latSpan > 0.06) return 11;
  if (latSpan > 0.03) return 12;
  return 13;
}

/** Vista geográfica alineada con el mosaico 2×2 (para colocar pins). */
function viewBoundsFromTiles(centerLat: number, centerLng: number, z: number): ReturnType<typeof boundsFor> {
  const { x: cx, y: cy } = latLngToTileXY(centerLat, centerLng, z);
  return {
    maxLat: tileNorthLat(cy - 1, z),
    minLat: tileNorthLat(cy + 1, z),
    minLng: tileWestLng(cx - 1, z),
    maxLng: tileWestLng(cx + 1, z),
  };
}

/** Cuatro URLs 2×2 centradas en `centerLat/Lng` al nivel `zoom`. */
function mosaicTileUrlsAt(centerLat: number, centerLng: number, zoom: number): { urls: [string, string, string, string] } {
  const { x: cx, y: cy } = latLngToTileXY(centerLat, centerLng, zoom);
  const n = 2 ** zoom;
  const clamp = (v: number) => Math.max(0, Math.min(n - 1, v));
  return {
    urls: [
      cartoVoyagerTileUrl(zoom, clamp(cx - 1), clamp(cy - 1)),
      cartoVoyagerTileUrl(zoom, clamp(cx), clamp(cy - 1)),
      cartoVoyagerTileUrl(zoom, clamp(cx - 1), clamp(cy)),
      cartoVoyagerTileUrl(zoom, clamp(cx), clamp(cy)),
    ],
  };
}

export default function PlansMapScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width: windowW } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PlansMapPayload | null>(null);
  /** GPS de este dispositivo: solo para el pin «Tú» en el mapa (el API sigue guardando zona ~1 km para otros). */
  const [myDeviceGps, setMyDeviceGps] = useState<{ lat: number; lng: number } | null>(null);
  const [mosaicFail, setMosaicFail] = useState(false);
  const mosaicFailCount = useRef(0);
  const canvasRef = useRef<PlansMapCanvasRef>(null);
  const [panOffset, setPanOffset] = useState({ dLat: 0, dLng: 0 });
  const [zoomOff, setZoomOff] = useState(0);
  const panStart = useRef({ dLat: 0, dLng: 0, z: 8 });
  const panOffsetRef = useRef(panOffset);
  panOffsetRef.current = panOffset;
  const mapZoomRef = useRef(8);
  const [sharingLocBusy, setSharingLocBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMyDeviceGps(null);
    let postedMe: { approxLat: number; approxLng: number } | null = null;
    let deviceGps: { lat: number; lng: number } | null = null;

    const mergePostedMe = (r: { approxLat?: number; approxLng?: number; latitude?: number; longitude?: number }) => {
      if (
        typeof r.approxLat === 'number' &&
        typeof r.approxLng === 'number' &&
        Number.isFinite(r.approxLat) &&
        Number.isFinite(r.approxLng)
      ) {
        postedMe = { approxLat: r.approxLat, approxLng: r.approxLng };
        return;
      }
      const la = Number(r.latitude);
      const lo = Number(r.longitude);
      if (Number.isFinite(la) && Number.isFinite(lo)) {
        const s = snapApproximatePublicCoordinate(la, lo);
        postedMe = { approxLat: s.lat, approxLng: s.lng };
      }
    };

    const tryPostLocation = async (coords: { latitude: number; longitude: number; accuracy?: number }) => {
      try {
        const r = await locationService.updateLocation(coords);
        mergePostedMe(r);
      } catch (e: unknown) {
        if (axios.isAxiosError(e) && e.response?.status === 403) {
          try {
            await locationService.toggleLocation(true);
            const r2 = await locationService.updateLocation(coords);
            mergePostedMe(r2);
          } catch {
            /* sin permiso compartir o red */
          }
        }
      }
    };

    try {
      let browserAccM = Infinity;
      if (Platform.OS === 'web') {
        const coords = await getWebGeolocationCoords({
          suppressDenyFollowUp: true,
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 28000,
        });
        if (coords) {
          const acc = Number(coords.accuracy);
          browserAccM = Number.isFinite(acc) && acc > 0 ? acc : 650;
          deviceGps = { lat: coords.latitude, lng: coords.longitude };
          await tryPostLocation(coords);
        }
      } else {
        try {
          let fg = await Location.getForegroundPermissionsAsync();
          if (fg.status !== Location.PermissionStatus.GRANTED) {
            fg = await Location.requestForegroundPermissionsAsync();
          }
          if (fg.status === Location.PermissionStatus.GRANTED) {
            const pos = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            });
            deviceGps = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            await tryPostLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy ?? undefined,
            });
          }
        } catch {
          /* GPS apagado o denegado */
        }
      }
      const res = await planService.getPlansMap();
      const merged: PlansMapPayload = { ...res, me: res.me ?? postedMe };

      let serverGps: { lat: number; lng: number } | null = null;
      if (merged.me) {
        try {
          const loc = await locationService.getMyLocation();
          const la = Number(loc.latitude);
          const lo = Number(loc.longitude);
          if (Number.isFinite(la) && Number.isFinite(lo)) {
            serverGps = { lat: la, lng: lo };
          }
        } catch {
          /* sin fila en servidor */
        }
      }

      if (Platform.OS === 'web' && merged.me && serverGps) {
        if (!deviceGps || browserAccM > 320) {
          deviceGps = serverGps;
        }
      } else if (!deviceGps && merged.me && serverGps) {
        deviceGps = serverGps;
      }

      setData(merged);
      setMyDeviceGps(deviceGps);
    } catch (e: unknown) {
      setError(apiErrorDisplayMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const shareLocationOnMap = useCallback(async () => {
    setSharingLocBusy(true);
    try {
      await locationService.toggleLocation(true);
      if (Platform.OS === 'web') {
        const coords = await getWebGeolocationCoords({
          suppressDenyFollowUp: false,
          enableHighAccuracy: true,
          maximumAge: 0,
        });
        if (coords) {
          await locationService.updateLocation({
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
          });
        } else {
          Alert.alert(
            'Ubicación',
            'El navegador no compartió tu posición. Revisá el candado en la barra de direcciones y elegí «Permitir».'
          );
        }
      } else {
        let fg = await Location.getForegroundPermissionsAsync();
        if (fg.status !== Location.PermissionStatus.GRANTED) {
          fg = await Location.requestForegroundPermissionsAsync();
        }
        if (fg.status !== Location.PermissionStatus.GRANTED) {
          Alert.alert('Ubicación', 'Concede permiso de ubicación para aparecer en el mapa de planes.');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        await locationService.updateLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? undefined,
        });
      }
      await load();
    } catch (e: unknown) {
      Alert.alert('No se pudo activar', apiErrorDisplayMessage(e));
    } finally {
      setSharingLocBusy(false);
    }
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const screenW = Math.max(320, windowW || 360);
  const mapHeight = Math.min(420, Math.round(screenW * 0.95));
  /** Cuadrado: teselas 2×2 con `fill` no se estiran distinto en X/Y; pins = mismas coords que el API. */
  const mapSide = Math.floor(Math.min(Math.max(280, screenW - 40), mapHeight));
  const dataForMap = useMemo((): PlansMapPayload | null => {
    if (!data) return null;
    if (myDeviceGps && data.me) {
      return { ...data, me: { approxLat: myDeviceGps.lat, approxLng: myDeviceGps.lng } };
    }
    return data;
  }, [data, myDeviceGps]);

  const pts = useMemo(() => (dataForMap ? collectPoints(dataForMap) : []), [dataForMap]);
  const b = useMemo(() => boundsFor(pts), [pts]);
  const anchorBase = useMemo(() => mapAnchorFromPts(pts), [pts]);
  const bRef = useRef(b);
  bRef.current = b;

  useEffect(() => {
    setPanOffset({ dLat: 0, dLng: 0 });
    setZoomOff(0);
  }, [b.minLat, b.maxLat, b.minLng, b.maxLng]);

  const baseZ = zoomFromBounds(b);
  const mapZoom = Math.max(8, Math.min(18, baseZ + zoomOff));
  mapZoomRef.current = mapZoom;
  const anchorLat = anchorBase.lat + panOffset.dLat;
  const anchorLng = anchorBase.lng + panOffset.dLng;

  const mosaic = useMemo(
    () => mosaicTileUrlsAt(anchorLat, anchorLng, mapZoom),
    [anchorLat, anchorLng, mapZoom]
  );
  const vb = useMemo(() => viewBoundsFromTiles(anchorLat, anchorLng, mapZoom), [anchorLat, anchorLng, mapZoom]);
  const vbRef = useRef(vb);
  vbRef.current = vb;

  useEffect(() => {
    setMosaicFail(false);
    mosaicFailCount.current = 0;
  }, [mosaic.urls.join('|')]);

  const onMosaicTileError = useCallback(() => {
    mosaicFailCount.current += 1;
    if (mosaicFailCount.current >= 4) setMosaicFail(true);
  }, []);

  const recenterMap = useCallback(() => {
    if (USE_NATIVE_MAP) {
      canvasRef.current?.recenter();
      return;
    }
    setPanOffset({ dLat: 0, dLng: 0 });
    setZoomOff(0);
  }, []);

  const zoomIn = useCallback(() => {
    if (USE_NATIVE_MAP) {
      canvasRef.current?.zoomIn();
      return;
    }
    setZoomOff((off) => {
      const bz = zoomFromBounds(bRef.current);
      return Math.min(18 - bz, off + 1);
    });
  }, []);

  const zoomOut = useCallback(() => {
    if (USE_NATIVE_MAP) {
      canvasRef.current?.zoomOut();
      return;
    }
    setZoomOff((off) => {
      const bz = zoomFromBounds(bRef.current);
      return Math.max(8 - bz, off - 1);
    });
  }, []);

  const mapWebWheel =
    Platform.OS === 'web'
      ? ({
          onWheel: (e: any) => {
            const ev = e?.nativeEvent ?? e;
            if (ev?.ctrlKey || ev?.metaKey) return;
            const dy = Number(ev?.deltaY ?? 0);
            if (!dy) return;
            if (typeof ev?.preventDefault === 'function') ev.preventDefault();
            setZoomOff((off) => {
              const bz = zoomFromBounds(bRef.current);
              const step = dy > 0 ? -1 : 1;
              return Math.max(8 - bz, Math.min(18 - bz, off + step));
            });
          },
        } as Record<string, unknown>)
      : {};

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
        onPanResponderGrant: () => {
          clearBrowserTextSelection();
          panStart.current = { ...panOffsetRef.current, z: mapZoomRef.current };
        },
        onPanResponderMove: (_, g) => {
          clearBrowserTextSelection();
          const v = vbRef.current;
          const spanLng = Math.max(v.maxLng - v.minLng, 1e-12);
          const spanLat = Math.max(v.maxLat - v.minLat, 1e-12);
          setPanOffset({
            dLat: panStart.current.dLat - (g.dy / mapSide) * spanLat,
            dLng: panStart.current.dLng - (g.dx / mapSide) * spanLng,
          });
        },
        onPanResponderRelease: () => {
          clearBrowserTextSelection();
        },
        onPanResponderTerminate: () => {
          clearBrowserTextSelection();
        },
      }),
    [mapSide]
  );

  const mePos = useMemo(() => {
    if (!dataForMap?.me) return null;
    return project(dataForMap.me.approxLat, dataForMap.me.approxLng, vb, mapSide, mapSide, 28);
  }, [dataForMap, vb, mapSide]);

  const planPins = useMemo(() => {
    if (!dataForMap) return [] as { pin: PlanMapPin; style: { left: number; top: number } }[];
    return dataForMap.plans.map((pin) => ({
      pin,
      style: project(pin.approxLat, pin.approxLng, vb, mapSide, mapSide, 24),
    }));
  }, [dataForMap, vb, mapSide]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mapa de planes</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.muted}>Cargando…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.bodyAfterLoad}>
          <View style={styles.mapBlock}>
            <View
              style={[
                styles.mapWrap,
                { width: mapSide, height: mapSide },
                Platform.OS === 'web' && (WEB_MAP_GUARD as object),
              ]}
            >
              <PlansMapCanvas
                ref={canvasRef}
                data={dataForMap!}
                mapW={mapSide}
                mapHeight={mapSide}
                mosaicFail={mosaicFail}
                mosaicUrls={mosaic.urls}
                planPins={planPins}
                mePos={mePos}
                panHandlers={panResponder.panHandlers as object}
                mapWebWheel={mapWebWheel}
                onMosaicTileError={onMosaicTileError}
              />

              <View style={styles.mapControls} pointerEvents="box-none">
                <TouchableOpacity style={styles.ctrlBtn} onPress={zoomIn} activeOpacity={0.85} accessibilityLabel="Acercar">
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.ctrlBtn} onPress={zoomOut} activeOpacity={0.85} accessibilityLabel="Alejar">
                  <Ionicons name="remove" size={22} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.ctrlBtn}
                  onPress={recenterMap}
                  activeOpacity={0.85}
                  accessibilityLabel="Centrar mapa"
                >
                  <Ionicons name="locate" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.osmAttr}>
              {USE_NATIVE_MAP
                ? 'Apple Mapas · posiciones en zona aproximada (~1 km, privacidad). Pellizca o usa los botones.'
                : Platform.OS === 'web' && GOOGLE_MAPS_KEY
                  ? 'Google Maps · arrastra para mover, rueda para zoom (también controles +/−).'
                  : '© OpenStreetMap · © CARTO · arrastra el mapa; botones +/− para zoom.'}
            </Text>
            {!data?.me && !loading && !error ? (
              <TouchableOpacity
                style={[styles.shareMapBtn, sharingLocBusy && styles.shareMapBtnDisabled]}
                onPress={() => void shareLocationOnMap()}
                disabled={sharingLocBusy}
                activeOpacity={0.88}
              >
                {sharingLocBusy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="location-outline" size={20} color="#fff" />
                )}
                <Text style={styles.shareMapBtnText}>Compartir mi ubicación en el mapa de planes</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView
            style={styles.scrollFlex}
            contentContainerStyle={styles.scrollListInner}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.legend}>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.legendText}>Plan (misma zona aprox. que en el servidor)</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
                <Text style={styles.legendText}>
                  Tú{' '}
                  {!data?.me
                    ? '(botón debajo del mapa o Configuración → Privacidad)'
                    : myDeviceGps
                      ? '(tu posición en el mapa; otros usuarios ven zona ~1 km)'
                      : '(compartes ubicación)'}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Planes en el mapa ({data?.plans.length ?? 0})</Text>
            {(data?.plans.length ?? 0) === 0 ? (
              <TouchableOpacity style={styles.refreshMapBtn} onPress={load} activeOpacity={0.85}>
                <Ionicons name="refresh" size={18} color={colors.primary} />
                <Text style={styles.refreshMapBtnText}>Actualizar mapa</Text>
              </TouchableOpacity>
            ) : (
              data!.plans.map((p) => (
                <View key={p.id} style={styles.planRow}>
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.planTitle}>{p.title}</Text>
                    <Text style={styles.planMeta}>
                      {new Date(p.date).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                      {p.locationLabel ? ` · ${p.locationLabel}` : ''}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  bodyAfterLoad: { flex: 1 },
  mapBlock: { alignItems: 'center', paddingTop: 8, paddingHorizontal: 16 },
  scrollListInner: { paddingHorizontal: 20, paddingBottom: 36, paddingTop: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { color: colors.text.secondary, marginTop: 8, textAlign: 'center' },
  refreshMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(108,92,231,0.45)',
  },
  refreshMapBtnText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  errorText: { color: colors.error, marginTop: 12, textAlign: 'center' },
  retryBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.primary },
  retryText: { color: '#fff', fontWeight: '600' },
  scrollFlex: { flex: 1, minHeight: 0 },
  mapControls: {
    position: 'absolute',
    right: 10,
    top: 10,
    zIndex: 30,
    gap: 8,
  },
  ctrlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  osmAttr: {
    fontSize: 11,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 15,
  },
  shareMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignSelf: 'stretch',
    maxWidth: 400,
    width: '100%',
  },
  shareMapBtnDisabled: { opacity: 0.65 },
  shareMapBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, flexShrink: 1, textAlign: 'center' },
  mapWrap: {
    alignSelf: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    position: 'relative',
  },
  legend: { marginTop: 16, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { color: colors.text.secondary, fontSize: 13 },
  sectionTitle: { marginTop: 24, fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 10 },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  planTitle: { color: colors.text.primary, fontWeight: '600', fontSize: 15 },
  planMeta: { color: colors.text.secondary, fontSize: 12, marginTop: 2 },
});
