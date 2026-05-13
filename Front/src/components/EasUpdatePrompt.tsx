import React, { useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';

const SNOOZE_KEY = 'kora_eas_update_snooze_until';
const SNOOZE_MS = 24 * 60 * 60 * 1000;
/** Espera a que la UI principal esté montada antes de comprobar (evita solaparse con splash). */
const CHECK_DELAY_MS = 4000;

/**
 * En builds de producción con EAS Update: avisa si hay bundle nuevo y ofrece reiniciar.
 * En desarrollo / web / sin updates: no hace nada.
 */
export function EasUpdatePrompt() {
  const ran = useRef(false);

  useEffect(() => {
    if (__DEV__) return;
    if (Platform.OS === 'web') return;
    if (!Updates.isEnabled) return;
    if (ran.current) return;
    ran.current = true;

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const snoozeUntilRaw = await AsyncStorage.getItem(SNOOZE_KEY);
          if (snoozeUntilRaw) {
            const until = parseInt(snoozeUntilRaw, 10);
            if (!Number.isNaN(until) && Date.now() < until) return;
          }

          const { isAvailable } = await Updates.checkForUpdateAsync();
          if (!isAvailable) return;

          Alert.alert(
            'Actualización disponible',
            'Hay una nueva versión de Kora lista. ¿Quieres reiniciar la app ahora para aplicarla?',
            [
              {
                text: 'Más tarde',
                style: 'cancel',
                onPress: () => {
                  void AsyncStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
                },
              },
              {
                text: 'Actualizar ahora',
                onPress: async () => {
                  try {
                    await Updates.fetchUpdateAsync();
                    await Updates.reloadAsync();
                  } catch {
                    Alert.alert(
                      'No se pudo completar',
                      'Cierra la app por completo (quítala de recientes) y ábrela de nuevo para intentar otra vez.'
                    );
                  }
                },
              },
            ]
          );
        } catch {
          // Sin red o servicio de updates: ignorar
        }
      })();
    }, CHECK_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
