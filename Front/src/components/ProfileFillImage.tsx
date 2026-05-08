import React from 'react';
import { Image } from 'expo-image';
import { StyleSheet, type ImageStyle, type StyleProp } from 'react-native';
import { resolveRenderableMediaUri } from '../utils/mediaUri';

type Props = {
  uri: string;
  style?: StyleProp<ImageStyle>;
};

/**
 * Rellena el contenedor padre (`position`, `aspectRatio`, etc.).
 * Preferible a RN `Image` con % en web donde el alto puede calcularse en 0.
 */
export function ProfileFillImage({ uri, style }: Props) {
  const u = uri?.trim();
  if (!u) return null;
  const src = resolveRenderableMediaUri(u);
  return (
    <Image
      source={{ uri: src }}
      style={[StyleSheet.absoluteFillObject, style]}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={160}
    />
  );
}
