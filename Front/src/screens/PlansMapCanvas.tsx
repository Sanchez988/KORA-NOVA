import React, { forwardRef, lazy, Suspense } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Platform } from 'react-native';
import PlansMapCanvasCarto from './PlansMapCanvasCarto';
import type { PlansMapCanvasProps, PlansMapCanvasRef } from './PlansMapCanvas.types';

const GOOGLE_WEB_KEY =
  typeof process !== 'undefined' && process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()
    ? String(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY).trim()
    : '';

const PlansMapCanvasWebGoogle = lazy(() => import('./PlansMapCanvasWebGoogle'));

/**
 * Web: Google Maps JS si hay clave; si no, Carto/OSM.
 * Android: `PlansMapCanvas.android.tsx` (Carto, estable). iOS: `PlansMapCanvas.native.tsx` (`react-native-maps`).
 */
const PlansMapCanvas = forwardRef<PlansMapCanvasRef, PlansMapCanvasProps>(function PlansMapCanvas(
  props,
  ref
) {
  /** Solo web: `@react-google-maps/api` no es válido en nativo (Metro puede exponer `window`). */
  if (GOOGLE_WEB_KEY && Platform.OS === 'web') {
    return (
      <Suspense
        fallback={
          <View style={[styles.googleFallback, { width: props.mapW, height: props.mapHeight }]}>
            <ActivityIndicator size="large" color="#6c5ce7" />
            <Text style={styles.googleFallbackText}>Cargando Google Maps…</Text>
          </View>
        }
      >
        <PlansMapCanvasWebGoogle
          ref={ref}
          data={props.data}
          mapW={props.mapW}
          mapHeight={props.mapHeight}
          googleMapsApiKey={GOOGLE_WEB_KEY}
        />
      </Suspense>
    );
  }

  return <PlansMapCanvasCarto ref={ref} {...props} />;
});

const styles = StyleSheet.create({
  googleFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121223',
    gap: 10,
  },
  googleFallbackText: { color: 'rgba(255,255,255,0.65)', fontSize: 13 },
});

export default PlansMapCanvas;
