import React, { forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import type { PlansMapCanvasProps, PlansMapCanvasRef } from './PlansMapCanvas.types';

/**
 * Mapa 2×2 con teselas Carto (sin API key). Usado en web (fallback) y en Android (evita fallos de Google Maps SDK).
 */
const PlansMapCanvasCarto = forwardRef<PlansMapCanvasRef, PlansMapCanvasProps>(
  function PlansMapCanvasCarto(
    {
      mosaicFail,
      mosaicUrls,
      planPins,
      mePos,
      panHandlers,
      mapWebWheel,
      onMosaicTileError,
    },
    ref
  ) {
    useImperativeHandle(
      ref,
      () => ({
        zoomIn: () => {},
        zoomOut: () => {},
        recenter: () => {},
      }),
      []
    );

    if (!mosaicUrls || !planPins || !panHandlers || !onMosaicTileError) {
      return null;
    }

    return (
      <View
        style={[
          StyleSheet.absoluteFillObject,
          Platform.OS === 'web' &&
            ({
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none',
              WebkitTouchCallout: 'none',
              cursor: 'grab',
            } as object),
        ]}
        {...panHandlers}
        {...(mapWebWheel ?? {})}
      >
        {!mosaicFail ? (
          <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
            <View style={styles.tileRow}>
              <Image
                source={{ uri: mosaicUrls[0] }}
                style={styles.tileCell}
                contentFit="fill"
                cachePolicy="memory-disk"
                onError={onMosaicTileError}
                pointerEvents="none"
              />
              <Image
                source={{ uri: mosaicUrls[1] }}
                style={styles.tileCell}
                contentFit="fill"
                cachePolicy="memory-disk"
                onError={onMosaicTileError}
                pointerEvents="none"
              />
            </View>
            <View style={styles.tileRow}>
              <Image
                source={{ uri: mosaicUrls[2] }}
                style={styles.tileCell}
                contentFit="fill"
                cachePolicy="memory-disk"
                onError={onMosaicTileError}
                pointerEvents="none"
              />
              <Image
                source={{ uri: mosaicUrls[3] }}
                style={styles.tileCell}
                contentFit="fill"
                cachePolicy="memory-disk"
                onError={onMosaicTileError}
                pointerEvents="none"
              />
            </View>
          </View>
        ) : (
          <View style={styles.mapBg} pointerEvents="none">
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={[styles.gridLine, { top: `${i * 25}%` }]} />
            ))}
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={`v${i}`} style={[styles.gridLineV, { left: `${i * 25}%` }]} />
            ))}
          </View>
        )}
        <View style={styles.mapOverlay} pointerEvents="none" />

        {planPins.map(({ pin, style }) => (
          <View key={pin.id} style={[styles.planMarker, style]} pointerEvents="none">
            <Ionicons name="calendar" size={14} color="#fff" />
          </View>
        ))}

        {mePos ? (
          <View style={[styles.meMarker, mePos]} pointerEvents="none">
            <Ionicons name="person" size={14} color="#fff" />
          </View>
        ) : null}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  tileRow: { flex: 1, flexDirection: 'row' },
  tileCell: { flex: 1 },
  mapBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(108,92,231,0.08)' },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 6, 22, 0.28)',
  },
  planMarker: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  meMarker: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.95)',
  },
});

export default PlansMapCanvasCarto;
