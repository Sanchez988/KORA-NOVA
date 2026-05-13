import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Insets del sistema + heurística de pantalla compacta (evita solapes en teclado / notch).
 * Usar para padding de cabeceras (~52 fijo) y pies de ScrollView.
 */
export function useScreenInsets() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const compact = height < 700 || width < 360;
  return {
    insets,
    compact,
    /** Reemplazo de paddingTop ~52 en headers alineados al notch */
    headerTop: insets.top + 10,
    /** Botones flotantes “atrás” */
    fabTop: insets.top + 8,
    /** Pie de ScrollView cuando no hay tab bar propia */
    scrollBottom: Math.max(insets.bottom, 10) + 16,
  };
}
