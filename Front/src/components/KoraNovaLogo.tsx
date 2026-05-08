import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Defs, G, LinearGradient, Path, Stop } from "react-native-svg";

import {
  KORA_HEART_OUTLINE_PATH_24,
  KORA_HEART_PIVOT,
  KORA_MARK_LAYOUT,
  KORA_HEART_GRADIENT_STOPS,
} from "../design/koraHeartsBrand";

interface Props {
  size?: number;
  width?: number;
  height?: number;
  showText?: boolean;
  showSlogan?: boolean;
}

/** Efecto neón multicapa sobre el mismo trazo (sin filtros SVG, máxima compatibilidad RN). */
function OutlineHeartGlow({
  d,
  gradId,
  mainW,
}: {
  d: string;
  gradId: string;
  mainW: number;
}) {
  return (
    <G>
      <Path
        d={d}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={mainW + 13}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.12}
      />
      <Path
        d={d}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={mainW + 7}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.22}
      />
      <Path
        d={d}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={mainW + 3}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.38}
      />
      <Path
        d={d}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={mainW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  );
}

function TwinHeartsSvg({ vw, vh, gradId }: { vw: number; vh: number; gradId: string }) {
  const { left, right } = KORA_MARK_LAYOUT;
  const { cx, cy } = KORA_HEART_PIVOT;
  const d = KORA_HEART_OUTLINE_PATH_24;

  /** Grosor de línea “principal” estable en sistema de coords del dibujo agrupado. */
  const mainStroke = 0.95;

  const leftTf =
    `translate(${left.tx},${left.ty}) rotate(${left.rotate}) scale(${left.scale}) translate(${-cx},${-cy})`;
  const rightTf =
    `translate(${right.tx},${right.ty}) rotate(${right.rotate}) scale(${right.scale}) translate(${-cx},${-cy})`;

  return (
    <>
      <Defs>
        <LinearGradient
          id={gradId}
          x1={0}
          y1={vh * 0.5}
          x2={vw}
          y2={vh * 0.5}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="2%" stopColor={KORA_HEART_GRADIENT_STOPS.violet} />
          <Stop offset="45%" stopColor={KORA_HEART_GRADIENT_STOPS.magenta} />
          <Stop offset="100%" stopColor={KORA_HEART_GRADIENT_STOPS.peach} />
        </LinearGradient>
      </Defs>
      <G transform={leftTf}>
        <OutlineHeartGlow d={d} gradId={gradId} mainW={mainStroke} />
      </G>
      <G transform={rightTf}>
        <OutlineHeartGlow d={d} gradId={gradId} mainW={mainStroke} />
      </G>
    </>
  );
}

/**
 * Logo Kora Nova — corazones enlazados con gradiente violeta → magenta → melocotón (referencia marca).
 */
export const KoraNovaLogo: React.FC<Props> = ({
  size,
  width: widthProp,
  height: heightProp,
  showText = false,
  showSlogan = false,
}) => {
  const VW = KORA_MARK_LAYOUT.viewW;
  const VH = KORA_MARK_LAYOUT.viewH;
  const gradId = React.useId().replace(/:/g, "");

  let svgW: number;
  let svgH: number;

  if (widthProp !== undefined && heightProp !== undefined) {
    const scaleW = widthProp / VW;
    const scaleH = heightProp / VH;
    const scale = Math.min(scaleW, scaleH);
    svgW = VW * scale;
    svgH = VH * scale;
  } else if (size !== undefined) {
    svgW = size;
    svgH = size * (VH / VW);
  } else {
    svgW = VW;
    svgH = VH;
  }

  const containerW = widthProp !== undefined ? widthProp : size ?? VW;

  return (
    <View style={[styles.container, { width: containerW }]}>
      <View style={{ width: svgW, alignSelf: "center" }}>
        <Svg width={svgW} height={svgH} viewBox={`0 0 ${VW} ${VH}`}>
          <TwinHeartsSvg vw={VW} vh={VH} gradId={gradId} />
        </Svg>
      </View>

      {showText && (
        <View style={styles.wordmark}>
          <Text style={[styles.brand, { fontSize: (size ?? VW) * 0.12, letterSpacing: (size ?? VW) * 0.055 }]}>
            KORA
          </Text>
          <Text style={[styles.brand, { fontSize: (size ?? VW) * 0.12, letterSpacing: (size ?? VW) * 0.055 }]}>
            NOVA
          </Text>
        </View>
      )}
      {showSlogan && (
        <Text style={[styles.slogan, { fontSize: (size ?? VW) * 0.068 }]}>
          Conéctate con lo que importa
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: "center" },
  wordmark: { alignItems: "center", marginTop: 4 },
  brand: {
    color: "#FFFFFF",
    fontWeight: "300",
    textAlign: "center",
  },
  slogan: {
    color: "rgba(162,155,254,0.65)",
    textAlign: "center",
    marginTop: 6,
    fontWeight: "400",
  },
});
