import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  variant?: 'full' | 'icon' | 'text';
}

/**
 * 🌟 Logo Kora Nova
 * 
 * Concepto: "Kora" viene del japonés "これ" (kore) que significa "esto/esto es"
 * "Nova" significa estrella nueva en latín
 * 
 * El logo combina:
 * - Una estrella (nova) representando nuevas conexiones
 * - Un corazón estilizado para el amor universitario
 * - Gradiente vibrante rosa-cyan (energía juvenil)
 */
const Logo: React.FC<LogoProps> = ({ 
  size = 'medium', 
  showText = true,
  variant = 'full' 
}) => {
  const sizes = {
    small: { icon: 32, text: 20, container: 40 },
    medium: { icon: 48, text: 28, container: 60 },
    large: { icon: 72, text: 42, container: 90 },
  };

  const currentSize = sizes[size];

  if (variant === 'text') {
    return (
      <View style={styles.textContainer}>
        <Text style={[styles.logoText, { fontSize: currentSize.text }]}>
          <Text style={styles.kora}>Kora</Text>
          <Text style={styles.nova}> Nova</Text>
        </Text>
        <Text style={styles.tagline}>Conecta con tu campus</Text>
      </View>
    );
  }

  if (variant === 'icon') {
    return (
      <LinearGradient
        colors={['#FF6B9D', '#00F5D4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.iconContainer, { 
          width: currentSize.container, 
          height: currentSize.container 
        }]}
      >
        <Ionicons name="star" size={currentSize.icon * 0.6} color="#FFF" />
        <View style={styles.heartOverlay}>
          <Ionicons name="heart" size={currentSize.icon * 0.35} color="#FF6B9D" />
        </View>
      </LinearGradient>
    );
  }

  // Variant: full
  return (
    <View style={styles.fullContainer}>
      <LinearGradient
        colors={['#FF6B9D', '#C4009E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.iconContainer, { 
          width: currentSize.container, 
          height: currentSize.container,
          marginBottom: 12,
        }]}
      >
        <View style={styles.starBurst}>
          <Ionicons name="star" size={currentSize.icon * 0.5} color="#FFF" />
        </View>
        <View style={styles.heartAccent}>
          <Ionicons name="heart" size={currentSize.icon * 0.3} color="#00F5D4" />
        </View>
      </LinearGradient>
      
      {showText && (
        <View style={styles.textContainer}>
          <View style={styles.brandName}>
            <LinearGradient
              colors={['#FF6B9D', '#00F5D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.textGradient}
            >
              <Text style={[styles.logoText, { fontSize: currentSize.text }]}>
                Kora Nova
              </Text>
            </LinearGradient>
          </View>
          <Text style={styles.tagline}>Tu amor universitario comienza aquí ✨</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fullContainer: {
    alignItems: 'center',
  },
  iconContainer: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 8,
  },
  starBurst: {
    position: 'absolute',
    transform: [{ rotate: '0deg' }],
  },
  heartOverlay: {
    position: 'absolute',
    bottom: '20%',
    right: '20%',
  },
  heartAccent: {
    position: 'absolute',
    top: '15%',
    right: '15%',
  },
  textContainer: {
    alignItems: 'center',
  },
  brandName: {
    overflow: 'hidden',
    borderRadius: 8,
  },
  textGradient: {
    paddingHorizontal: 4,
  },
  logoText: {
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 1,
  },
  kora: {
    color: '#FF6B9D',
  },
  nova: {
    color: '#00F5D4',
  },
  tagline: {
    fontSize: 12,
    color: '#B8B8C5',
    marginTop: 4,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});

export default Logo;
