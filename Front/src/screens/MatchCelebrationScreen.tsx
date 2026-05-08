import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';
import { NovaGradientButton } from '../components/nova/NovaGradientButton';
import { NovaOutlineButton } from '../components/nova/NovaOutlineButton';
import { KORA_BG, KORA_GRADIENT, KORA_LILAC, KORA_WHITE } from '../design/koraNova';
import { resolveRenderableMediaUri } from '../utils/mediaUri';
import type { Match } from '../types';
import { matchService } from '../services/match.service';
import { navigationRef } from '../navigation/navigationRef';

const { width } = Dimensions.get('window');
const PH = (width - 56) / 2 - 12;

export type MatchCelebrationParams = {
  matchedName: string;
  theirPhotoUri?: string;
  myPhotoUri?: string;
  /** Avanza el carrusel en Descubrir al cerrar */
  advanceDiscoveryUserId?: string;
  /** Presente cuando el match viene del like reciente */
  matchId?: string;
  matchData?: Match | null;
};

/** Pantalla ¡Es un match! — rejilla circular 2×2 (referencia). */
const MatchCelebrationScreen = ({ navigation, route }: any) => {
  const {
    matchedName = 'Tu match',
    theirPhotoUri,
    myPhotoUri,
    advanceDiscoveryUserId,
    matchId,
    matchData: matchDataFromRoute,
  } = route.params || ({} as MatchCelebrationParams);

  const finishToDiscovery = () => {
    if (advanceDiscoveryUserId) {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: 'DiscoveryMain',
              params: { actionedUserId: advanceDiscoveryUserId },
            },
          ],
        })
      );
    } else {
      navigation.goBack();
    }
  };

  const openFirstMessage = async () => {
    const mid = matchId;
    let md: Match | undefined = matchDataFromRoute ?? undefined;
    if (mid && (!md?.user1 || !md?.user2)) {
      try {
        const list = await matchService.getMyMatches();
        md = list.find((x) => x.id === mid) ?? md;
      } catch {
        /* usar solo matchId si la lista falla */
      }
    }

    if (!mid) {
      finishToDiscovery();
      if (navigationRef.isReady()) {
        navigationRef.dispatch(
          CommonActions.navigate({ name: 'MainTabs', params: { screen: 'Mensajes' } })
        );
      }
      return;
    }

    if (navigationRef.isReady()) {
      (navigationRef as unknown as { navigate: (name: string, params: object) => void }).navigate(
        'Chat',
        { matchId: mid, matchData: md }
      );
    }
    finishToDiscovery();
  };

  const slot: (string | undefined)[] = [
    theirPhotoUri,
    myPhotoUri,
    theirPhotoUri,
    myPhotoUri,
  ];
  const urls = slot.map((u) => u ?? '');

  return (
    <View style={styles.root}>
      <LinearGradient colors={[`${KORA_BG}`, '#16162A']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <TouchableOpacity style={styles.close} onPress={finishToDiscovery} hitSlop={12}>
          <Ionicons name="close" size={26} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>

        <Text style={styles.title}>¡Es un match!</Text>
        <Text style={styles.sub}>
          Tú y <Text style={{ fontWeight: '800', color: KORA_WHITE }}>{matchedName}</Text> se han gustado ❤️
        </Text>

        <View style={styles.grid}>
          <View style={styles.gridRow}>
            <View style={{ marginHorizontal: 11 }}>
              <CirclePhoto uri={urls[0]} />
            </View>
            <View style={{ marginHorizontal: 11 }}>
              <CirclePhoto uri={urls[1]} />
            </View>
          </View>
          <View style={styles.gridRow}>
            <View style={{ marginHorizontal: 11 }}>
              <CirclePhoto uri={urls[2]} />
            </View>
            <View style={{ marginHorizontal: 11 }}>
              <CirclePhoto uri={urls[3]} />
            </View>
          </View>
        </View>

        <NovaGradientButton title="Enviar mensaje" style={{ marginBottom: 12 }} onPress={() => void openFirstMessage()} />
        <NovaOutlineButton title="Seguir explorando" onPress={finishToDiscovery} />
      </SafeAreaView>
    </View>
  );
};

function CirclePhoto({ uri }: { uri: string }) {
  const resolved = uri ? resolveRenderableMediaUri(uri) : '';
  return (
    <LinearGradient
      colors={[KORA_GRADIENT[0], KORA_GRADIENT[1]]}
      style={styles.ring}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.inner}>
        {resolved ? (
          <Image source={{ uri: resolved }} style={styles.img} resizeMode="cover" />
        ) : (
          <Ionicons name="heart" size={40} color="rgba(255,255,255,0.25)" />
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: KORA_BG },
  safe: { flex: 1, paddingHorizontal: 24, paddingBottom: 20 },
  close: {
    alignSelf: 'flex-end',
    padding: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: KORA_WHITE,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 15,
    color: KORA_LILAC,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  grid: {
    flex: 1,
    justifyContent: 'center',
    marginBottom: 24,
    maxHeight: PH * 2 + 56,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 22,
  },
  ring: {
    width: PH,
    height: PH,
    borderRadius: PH / 2,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: PH - 6,
    height: PH - 6,
    borderRadius: (PH - 6) / 2,
    backgroundColor: '#1A1A35',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  img: { width: '100%', height: '100%' },
});

export default MatchCelebrationScreen;
