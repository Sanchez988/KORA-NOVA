import React, { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import {
  connectMatchRealtime,
  disconnectMatchRealtime,
  type MatchCreatedPayload,
} from '../services/matchSocket';
import { matchService } from '../services/match.service';
import { navigationRef } from '../navigation/navigationRef';
import { loadExpoNotifications } from '../utils/expoNotifications';

async function navigateToMatchChat(payload: MatchCreatedPayload): Promise<void> {
  try {
    const list = await matchService.getMyMatches();
    const m = list.find((x) => x.id === payload.matchId);
    if (!navigationRef.isReady()) return;
    const nav = navigationRef as unknown as { navigate: (n: string, p: object) => void };
    if (m) {
      nav.navigate('Chat', { matchId: payload.matchId, matchData: m });
    } else if (navigationRef.isReady()) {
      navigationRef.dispatch(
        CommonActions.navigate({ name: 'MainTabs', params: { screen: 'Mensajes' } })
      );
      Alert.alert(
        'Conversaciones',
        'Tu nuevo match ya está en la lista. Tirá para actualizar si no aparece.'
      );
    }
  } catch {
    Alert.alert('Error', 'No se pudo abrir el chat.');
  }
}

function goMensajesTab(): void {
  if (!navigationRef.isReady()) return;
  navigationRef.dispatch(
    CommonActions.navigate({ name: 'MainTabs', params: { screen: 'Mensajes' } })
  );
}

async function scheduleMatchBanner(p: MatchCreatedPayload): Promise<void> {
  const mod = await loadExpoNotifications();
  if (!mod) return;
  try {
    await mod.scheduleNotificationAsync({
      content: {
        title: '¡Es un match!',
        body: `Tú y ${p.matchedName} se han gustado. Podés enviar el primer mensaje.`,
        data: { type: 'match', matchId: p.matchId },
      },
      trigger: null,
    });
  } catch {
    /* sin permiso o Expo Go Android */
  }
}

/** Escucha `match_created` del backend (el otro usuario ya te había dado like). */
export function MatchSocketSubscriber(): null {
  const { token } = useAuth();

  useEffect(() => {
    if (!token) {
      disconnectMatchRealtime();
      return;
    }

    connectMatchRealtime(token, (payload: MatchCreatedPayload) => {
      void scheduleMatchBanner(payload);

      const buttons: Parameters<typeof Alert.alert>[2] = [
        { text: 'Después', style: 'cancel' },
        { text: 'Ir al chat', onPress: () => void navigateToMatchChat(payload) },
      ];

      if (Platform.OS !== 'web') {
        buttons.push({
          text: 'Conversaciones',
          onPress: goMensajesTab,
        });
      }

      Alert.alert(
        '¡Es un match!',
        `Tú y ${payload.matchedName} se han gustado. ¡Podés enviar el primer mensaje!`,
        buttons
      );
    });

    return () => disconnectMatchRealtime();
  }, [token]);

  return null;
}
