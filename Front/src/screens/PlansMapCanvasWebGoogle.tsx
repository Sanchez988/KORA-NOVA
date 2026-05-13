import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import type { PlansMapPayload } from '../services/plan.service';
import { emptyMapCenter, mercatorCorrectedDeltas } from './plansMapGeo';
import type { PlansMapCanvasProps, PlansMapCanvasRef } from './PlansMapCanvas.types';

function collectLatLng(data: PlansMapPayload): google.maps.LatLngLiteral[] {
  const pts: google.maps.LatLngLiteral[] = data.plans.map((p) => ({
    lat: p.approxLat,
    lng: p.approxLng,
  }));
  if (data.me) pts.push({ lat: data.me.approxLat, lng: data.me.approxLng });
  return pts;
}

function fitMap(map: google.maps.Map, data: PlansMapPayload) {
  const pts = collectLatLng(data);
  const pad = { top: 64, right: 64, bottom: 64, left: 64 } as google.maps.Padding;
  if (pts.length === 0) {
    const c = emptyMapCenter();
    map.setCenter(c);
    map.setZoom(12);
    return;
  }
  if (pts.length === 1) {
    const p = pts[0];
    const { latitudeDelta, longitudeDelta } = mercatorCorrectedDeltas(p.lat);
    const bounds = new google.maps.LatLngBounds(
      { lat: p.lat - latitudeDelta / 2, lng: p.lng - longitudeDelta / 2 },
      { lat: p.lat + latitudeDelta / 2, lng: p.lng + longitudeDelta / 2 }
    );
    map.fitBounds(bounds, pad);
    return;
  }
  const bounds = new google.maps.LatLngBounds();
  pts.forEach((p) => bounds.extend(p));
  map.fitBounds(bounds, pad);
}

export type PlansMapCanvasWebGoogleProps = PlansMapCanvasProps & {
  googleMapsApiKey: string;
};

const PURPLE_ICON = 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png';
const GREEN_ICON = 'https://maps.google.com/mapfiles/ms/icons/green-dot.png';

const PlansMapCanvasWebGoogle = forwardRef<PlansMapCanvasRef, PlansMapCanvasWebGoogleProps>(
  function PlansMapCanvasWebGoogle({ data, mapW, mapHeight, googleMapsApiKey }, ref) {
    const mapRef = useRef<google.maps.Map | null>(null);

    const onLoad = useCallback(
      (map: google.maps.Map) => {
        mapRef.current = map;
        fitMap(map, data);
      },
      [data]
    );

    useEffect(() => {
      if (mapRef.current) fitMap(mapRef.current, data);
    }, [data]);

    useImperativeHandle(
      ref,
      () => ({
        zoomIn: () => {
          const m = mapRef.current;
          if (!m) return;
          const z = m.getZoom() ?? 12;
          m.setZoom(Math.min(z + 1, 20));
        },
        zoomOut: () => {
          const m = mapRef.current;
          if (!m) return;
          const z = m.getZoom() ?? 12;
          m.setZoom(Math.max(z - 1, 4));
        },
        recenter: () => {
          const m = mapRef.current;
          if (m) fitMap(m, data);
        },
      }),
      [data]
    );

    const c0 = emptyMapCenter();

    return (
      <View style={[styles.wrap, { width: mapW, height: mapHeight }]}>
        <LoadScript
          googleMapsApiKey={googleMapsApiKey}
          loadingElement={
            <View style={[styles.loading, { width: mapW, height: mapHeight }]}>
              <ActivityIndicator size="large" color="#6c5ce7" />
              <Text style={styles.loadingText}>Cargando mapa…</Text>
            </View>
          }
        >
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={c0}
            zoom={12}
            onLoad={onLoad}
            options={{
              fullscreenControl: false,
              streetViewControl: false,
              mapTypeControl: false,
              zoomControl: false,
              scrollwheel: true,
              gestureHandling: 'greedy',
              draggable: true,
              keyboardShortcuts: false,
              clickableIcons: true,
            }}
          >
            {data.plans.map((pin) => (
              <Marker
                key={pin.id}
                position={{ lat: pin.approxLat, lng: pin.approxLng }}
                title={pin.title}
                icon={PURPLE_ICON}
              />
            ))}
            {data.me ? (
              <Marker
                position={{ lat: data.me.approxLat, lng: data.me.approxLng }}
                title="Tú (posición en este mapa)"
                icon={GREEN_ICON}
                zIndex={999}
              />
            ) : null}
          </GoogleMap>
        </LoadScript>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', borderRadius: 0 },
  loading: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121223',
    gap: 10,
  },
  loadingText: { color: 'rgba(255,255,255,0.65)', fontSize: 13 },
});

export default PlansMapCanvasWebGoogle;
