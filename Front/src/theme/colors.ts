// Sistema de colores — Kora Nova brand palette
// #6C5CE7 purple | #FF6B8B pink | #A29BFE light-purple | #121223 dark-navy | #FFFFFF white
export const colors = {
  // Colores principales
  primary: '#6C5CE7',
  primaryDark: '#4B4ACF',
  primaryLight: '#A29BFE',

  secondary: '#FF6B8B',
  secondaryDark: '#E84393',
  secondaryLight: '#FFB3C6',

  accent: '#A29BFE',
  accentDark: '#6C5CE7',

  // Gradientes (tuplas readonly para expo-linear-gradient)
  gradient: {
    primary: ['#6C5CE7', '#FF6B8B'] as const,
    secondary: ['#A29BFE', '#6C5CE7'] as const,
    sunset: ['#6C5CE7', '#FF6B8B'] as const,
    ocean: ['#6C5CE7', '#00D4FF'] as const,
    fire: ['#FF1E56', '#FF6B8B'] as const,
  },

  // Fondos oscuros
  background: '#121223',
  backgroundDark: '#0D0D1A',
  backgroundLight: '#1A1A35',

  surface: '#1E1E38',
  surfaceLight: '#252548',

  // Textos
  text: {
    primary: '#FFFFFF',
    secondary: '#A29BFE',
    tertiary: 'rgba(255,255,255,0.4)',
    inverse: '#121223',
  },

  // Estados
  success: '#06D6A0',
  error: '#EF476F',
  warning: '#FFD93D',
  info: '#118AB2',

  // Bordes
  border: 'rgba(162,155,254,0.25)',
  borderLight: 'rgba(162,155,254,0.12)',

  // Sombras
  shadow: 'rgba(108,92,231,0.35)',
  shadowDark: 'rgba(0,0,0,0.6)',

  // Overlays
  overlay: 'rgba(0,0,0,0.7)',
  overlayLight: 'rgba(0,0,0,0.4)',

  // Colores de match/like
  like: '#06D6A0',
  dislike: '#EF476F',
  superLike: '#A29BFE',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
  },
  h3: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
};
