import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { collectPoints, boundsFor, regionFromBoundsBox, fitRegionAroundPoint } from './plansMapGeo';
import type { PlansMapCanvasProps, PlansMapCanvasRef } from './PlansMapCanvas.types';

/** Solo iOS: MapKit (sin `PROVIDER_GOOGLE`) para evitar fallos de clave / facturación de Google en esta pantalla. */

const EDGE = { top: 56, right: 54, bottom: 56, left: 16 };

function finiteCoord(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

const PlansMapCanvasNative = forwardRef<PlansMapCanvasRef, PlansMapCanvasProps>(
  function PlansMapCanvasNative({ data }, ref) {
    const mapRef = useRef<MapView | null>(null);
    const lastRegionRef = useRef<Region | null>(null);

    const mapData = useMemo(() => {
      const safePlans = data.plans.filter((p) => finiteCoord(p.approxLat, p.approxLng));
      const safeMe =
        data.me && finiteCoord(data.me.approxLat, data.me.approxLng)
          ? { approxLat: data.me.approxLat, approxLng: data.me.approxLng }
          : null;
      return { plans: safePlans, me: safeMe };
    }, [data]);

    useEffect(() => {
      const ptsFit = collectPoints(mapData);
      const b = boundsFor(ptsFit);
      lastRegionRef.current = regionFromBoundsBox(b) as Region;
    }, [mapData]);

    useEffect(() => {
      const coords = collectPoints(mapData).map((p) => ({ latitude: p.lat, longitude: p.lng }));
      const t = setTimeout(() => {
        const mv = mapRef.current;
        if (!mv) return;
        try {
          if (coords.length === 0) {
            mv.animateToRegion(regionFromBoundsBox(boundsFor([])) as Region, 1);
            return;
          }
          if (coords.length === 1) {
            const r = fitRegionAroundPoint(coords[0].latitude, coords[0].longitude) as Region;
            mv.animateToRegion(r, 280);
            return;
          }
          mv.fitToCoordinates(coords, { edgePadding: EDGE, animated: false });
        } catch {
          mv.animateToRegion(regionFromBoundsBox(boundsFor([])) as Region, 220);
        }
      }, 420);
      return () => clearTimeout(t);
    }, [mapData]);

    const zoomIn = () => {
      const r = lastRegionRef.current;
      const mv = mapRef.current;
      if (!r || !mv) return;
      mv.animateToRegion(
        {
          latitude: r.latitude,
          longitude: r.longitude,
          latitudeDelta: Math.max(r.latitudeDelta * 0.62, 0.0014),
          longitudeDelta: Math.max(r.longitudeDelta * 0.62, 0.0014),
        },
        200
      );
    };

    const zoomOut = () => {
      const r = lastRegionRef.current;
      const mv = mapRef.current;
      if (!r || !mv) return;
      mv.animateToRegion(
        {
          latitude: r.latitude,
          longitude: r.longitude,
          latitudeDelta: Math.min(r.latitudeDelta * 1.52, 48),
          longitudeDelta: Math.min(r.longitudeDelta * 1.52, 48),
        },
        200
      );
    };

    const recenter = () => {
      const mv = mapRef.current;
      if (!mv) return;
      const coords = collectPoints(mapData).map((p) => ({ latitude: p.lat, longitude: p.lng }));
      try {
        if (coords.length === 0) {
          mv.animateToRegion(regionFromBoundsBox(boundsFor([])) as Region, 220);
          return;
        }
        if (coords.length === 1) {
          mv.animateToRegion(fitRegionAroundPoint(coords[0].latitude, coords[0].longitude) as Region, 220);
          return;
        }
        mv.fitToCoordinates(coords, { edgePadding: EDGE, animated: true });
      } catch {
        mv.animateToRegion(regionFromBoundsBox(boundsFor([])) as Region, 220);
      }
    };

    useImperativeHandle(ref, () => ({ zoomIn, zoomOut, recenter }), [mapData]);

    return (
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        mapType="standard"
        rotateEnabled={false}
        pitchEnabled={false}
        showsPointsOfInterest
        onRegionChangeComplete={(r) => {
          lastRegionRef.current = r;
        }}
      >
        {mapData.plans.map((pin) => (
          <Marker key={pin.id} coordinate={{ latitude: pin.approxLat, longitude: pin.approxLng }} title={pin.title} />
        ))}
        {mapData.me ? (
          <Marker
            coordinate={{ latitude: mapData.me.approxLat, longitude: mapData.me.approxLng }}
            title="Tú (posición en este mapa)"
            pinColor="green"
            zIndex={999}
          />
        ) : null}
      </MapView>
    );
  }
);

export default PlansMapCanvasNative;
