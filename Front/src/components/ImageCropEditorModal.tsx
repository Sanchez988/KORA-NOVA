import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  Modal,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';

const ASPECT = 4 / 3;

type Metrics = {
  scale: number;
  ox: number;
  oy: number;
  dw: number;
  dh: number;
  cw: number;
  ch: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

type Props = {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  onApply: (uri: string) => void;
};

/**
 * Recorte 4:3 moviendo el marco sobre la imagen (sin reabrir galería).
 */
export default function ImageCropEditorModal({ visible, imageUri, onClose, onApply }: Props) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [layout, setLayout] = useState({ w: 0, h: 0 });
  const [cropXY, setCropXY] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const metricsRef = useRef<Metrics | null>(null);
  const cropRef = useRef({ x: 0, y: 0 });
  const dragOrigin = useRef({ cx: 0, cy: 0 });

  useEffect(() => {
    cropRef.current = cropXY;
  }, [cropXY]);

  useEffect(() => {
    if (!visible || !imageUri) {
      setNatural(null);
      return;
    }
    Image.getSize(
      imageUri,
      (w, h) => setNatural({ w, h }),
      () => setNatural(null),
    );
  }, [visible, imageUri]);

  const metrics = useMemo((): Metrics | null => {
    if (!natural || layout.w < 8 || layout.h < 8) return null;
    const scale = Math.min(layout.w / natural.w, layout.h / natural.h);
    const dw = natural.w * scale;
    const dh = natural.h * scale;
    const ox = (layout.w - dw) / 2;
    const oy = (layout.h - dh) / 2;
    let cw: number;
    let ch: number;
    if (dw / dh >= ASPECT) {
      ch = dh;
      cw = dh * ASPECT;
    } else {
      cw = dw;
      ch = dw / ASPECT;
    }
    const minX = ox;
    const minY = oy;
    const maxX = ox + dw - cw;
    const maxY = oy + dh - ch;
    return { scale, ox, oy, dw, dh, cw, ch, minX, minY, maxX, maxY };
  }, [natural, layout.w, layout.h]);

  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);

  useEffect(() => {
    if (!metrics) return;
    const cx = metrics.ox + (metrics.dw - metrics.cw) / 2;
    const cy = metrics.oy + (metrics.dh - metrics.ch) / 2;
    const next = { x: cx, y: cy };
    setCropXY(next);
    cropRef.current = next;
  }, [metrics]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragOrigin.current = { cx: cropRef.current.x, cy: cropRef.current.y };
      },
      onPanResponderMove: (_, g) => {
        const m = metricsRef.current;
        if (!m) return;
        const nx = clamp(dragOrigin.current.cx + g.dx, m.minX, m.maxX);
        const ny = clamp(dragOrigin.current.cy + g.dy, m.minY, m.maxY);
        cropRef.current = { x: nx, y: ny };
        setCropXY({ x: nx, y: ny });
      },
    }),
  ).current;

  const handleApply = useCallback(async () => {
    if (!imageUri || !metrics || !natural) return;
    const { scale, ox, oy, cw, ch } = metrics;
    const oxImg = (cropXY.x - ox) / scale;
    const oyImg = (cropXY.y - oy) / scale;
    const wImg = cw / scale;
    const hImg = ch / scale;
    const originX = clamp(Math.round(oxImg), 0, natural.w - 1);
    const originY = clamp(Math.round(oyImg), 0, natural.h - 1);
    const width = clamp(Math.round(wImg), 1, natural.w - originX);
    const height = clamp(Math.round(hImg), 1, natural.h - originY);

    setBusy(true);
    try {
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ crop: { originX, originY, width, height } }],
        { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG },
      );
      onApply(result.uri);
      onClose();
    } catch {
      Alert.alert('Error', 'No se pudo recortar la imagen. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }, [imageUri, metrics, natural, cropXY.x, cropXY.y, onApply, onClose]);

  const { w: lw, h: lh } = layout;
  const m = metrics;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn} hitSlop={10} disabled={busy}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Recortar imagen</Text>
          <TouchableOpacity onPress={handleApply} style={styles.applyWrap} disabled={busy || !m}>
            {busy ? (
              <ActivityIndicator color="#A29BFE" />
            ) : (
              <Text style={styles.applyTxt}>Aplicar</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>Arrastra el marco blanco para elegir el área (4:3)</Text>

        <View
          style={styles.stage}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setLayout({ w: width, h: height });
          }}
        >
          {imageUri && natural ? (
            <>
              <Image source={{ uri: imageUri }} style={styles.fullImage} resizeMode="contain" />
              {m && lw > 0 && lh > 0 ? (
                <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                  <View style={[styles.overlayTop, { height: cropXY.y }]} />
                  <View style={[styles.overlayRow, { top: cropXY.y, height: m.ch }]}>
                    <View style={{ width: cropXY.x, backgroundColor: 'rgba(0,0,0,0.52)' }} />
                    <View {...panResponder.panHandlers} style={[styles.cropFrame, { width: m.cw, height: m.ch }]} />
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.52)' }} />
                  </View>
                  <View
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: cropXY.y + m.ch,
                      bottom: 0,
                      backgroundColor: 'rgba(0,0,0,0.52)',
                    }}
                  />
                </View>
              ) : null}
            </>
          ) : (
            <ActivityIndicator color="#A29BFE" />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(8,8,18,0.97)',
    paddingTop: 48,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  title: { flex: 1, textAlign: 'center', color: '#fff', fontSize: 16, fontWeight: '700' },
  applyWrap: { minWidth: 72, alignItems: 'flex-end' },
  applyTxt: { color: '#A29BFE', fontSize: 15, fontWeight: '800' },
  hint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  stage: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  fullImage: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  overlayRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
  },
  cropFrame: {
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
});
