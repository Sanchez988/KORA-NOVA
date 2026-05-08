import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { borderRadius } from '../../theme/colors';
import { KORA_LILAC } from '../../design/koraNova';

type Props = {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
};

/** Botón secundario: borde lila sobre fondo oscuro (referencia Crear cuenta). */
export const NovaOutlineButton: React.FC<Props> = ({ title, onPress, style }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.88}
    style={[styles.wrap, style]}
  >
    <Text style={styles.text}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: 'rgba(108,92,231,0.85)',
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: KORA_LILAC,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
