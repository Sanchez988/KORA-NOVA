import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { KORA_GRADIENT } from '../../design/koraNova';
import { borderRadius } from '../../theme/colors';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  iconRight?: React.ReactNode;
};

/**
 * En web, `LinearGradient` dentro de `TouchableOpacity` a veces intercepta el hit target;
 * el gradiente va en capa absoluta con `pointerEvents="none"` y el `Pressable` recibe el clic.
 */
export const NovaGradientButton: React.FC<Props> = ({
  title,
  onPress,
  disabled,
  loading,
  style,
  iconRight,
}) => {
  const isDisabled = Boolean(disabled || loading);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.wrap,
        isDisabled && styles.disabled,
        pressed && !isDisabled ? styles.pressed : null,
        style,
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={[...KORA_GRADIENT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.inner}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Text style={styles.text}>{title}</Text>
            {iconRight}
          </>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.9 },
  inner: {
    flexDirection: 'row',
    paddingVertical: 17,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
