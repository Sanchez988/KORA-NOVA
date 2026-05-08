/**
 * 🌙 KORA NOVA - Dark Theme Premium
 * Diseño oscuro sofisticado para una experiencia inmersiva
 */

export const darkTheme = {
  // Colores base oscuros
  colors: {
    // Backgrounds
    background: {
      primary: '#0A0A0F',      // Fondo principal (casi negro)
      secondary: '#13131A',    // Fondo secundario
      card: '#1A1A24',         // Fondo de tarjetas
      elevated: '#22222E',     // Elementos elevados
      overlay: 'rgba(10, 10, 15, 0.95)', // Overlay para modales
    },
    
    // Brand colors - Kora Nova
    brand: {
      primary: '#FF6B9D',      // Rosa vibrante (principal)
      secondary: '#C4009E',    // Rosa profundo
      accent: '#00F5D4',       // Cyan neón (acentos)
      gold: '#FFD700',         // Oro premium
    },
    
    // Gradientes premium (tuplas readonly para expo-linear-gradient)
    gradient: {
      primary: ['#FF6B9D', '#C4009E'] as const,
      secondary: ['#00F5D4', '#00D9F5'] as const,
      sunset: ['#FF6B9D', '#FF8E53', '#FFC837'] as const,
      dark: ['#1A1A24', '#0A0A0F'] as const,
      card: ['#22222E', '#1A1A24'] as const,
      gold: ['#FFD700', '#FFA500'] as const,
    },
    
    // Texto
    text: {
      primary: '#FFFFFF',      // Texto principal
      secondary: '#B8B8C5',    // Texto secundario
      tertiary: '#6E6E80',     // Texto terciario
      disabled: '#4A4A56',     // Texto deshabilitado
      inverse: '#0A0A0F',      // Texto inverso (sobre fondos claros)
    },
    
    // Estados
    success: '#00E676',        // Verde éxito
    warning: '#FFB300',        // Amarillo advertencia
    error: '#FF1744',          // Rojo error
    info: '#00B8FF',           // Azul información
    
    // Botones
    button: {
      primary: '#FF6B9D',
      secondary: '#00F5D4',
      ghost: 'transparent',
      disabled: '#2A2A36',
    },
    
    // Bordes
    border: {
      light: '#2A2A36',
      medium: '#3A3A46',
      heavy: '#4A4A56',
    },
    
    // Sombras
    shadow: {
      small: 'rgba(0, 0, 0, 0.3)',
      medium: 'rgba(0, 0, 0, 0.5)',
      large: 'rgba(0, 0, 0, 0.7)',
    },
    
    // Status
    online: '#00E676',
    offline: '#6E6E80',
    away: '#FFB300',
  },
  
  // Espaciado consistente
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  // Bordes redondeados
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
    full: 9999,
  },
  
  // Tipografía
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: '700' as const,
      lineHeight: 40,
      letterSpacing: -0.5,
      color: '#FFFFFF',
    },
    h2: {
      fontSize: 28,
      fontWeight: '700' as const,
      lineHeight: 36,
      letterSpacing: -0.3,
      color: '#FFFFFF',
    },
    h3: {
      fontSize: 24,
      fontWeight: '600' as const,
      lineHeight: 32,
      letterSpacing: -0.2,
      color: '#FFFFFF',
    },
    h4: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 28,
      color: '#FFFFFF',
    },
    body1: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
      color: '#FFFFFF',
    },
    /** Alias de body1 (pantallas usan theme.typography.body) */
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
      color: '#FFFFFF',
    },
    body2: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
      color: '#B8B8C5',
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
      color: '#6E6E80',
    },
    button: {
      fontSize: 16,
      fontWeight: '600' as const,
      letterSpacing: 0.5,
      textTransform: 'uppercase' as const,
    },
  },
  
  // Sombras premium
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.37,
      shadowRadius: 7.49,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.45,
      shadowRadius: 12,
      elevation: 12,
    },
    glow: {
      shadowColor: '#FF6B9D',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 15,
      elevation: 5,
    },
  },
  
  // Badges y estados
  badges: {
    verified: {
      background: '#00E676',
      icon: 'checkmark-circle',
      text: 'Verificado',
    },
    premium: {
      background: '#FFD700',
      icon: 'star',
      text: 'Premium',
    },
    new: {
      background: '#00F5D4',
      icon: 'sparkles',
      text: 'Nuevo',
    },
    popular: {
      background: '#FF6B9D',
      icon: 'flame',
      text: 'Popular',
    },
  },
};

// Type exports para TypeScript
export type Theme = typeof darkTheme;
export type ThemeColors = typeof darkTheme.colors;
export type ThemeSpacing = typeof darkTheme.spacing;
