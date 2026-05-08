import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KoraNovaLogo } from '../components/KoraNovaLogo';
import { NovaGradientButton } from '../components/nova/NovaGradientButton';
import { NovaOutlineButton } from '../components/nova/NovaOutlineButton';
import { KORA_BG, KORA_LILAC } from '../design/koraNova';

const { width } = Dimensions.get('window');

/**
 * Splash / bienvenida — fondo #121223, logo + slogan centrados,
 * CTAs apilados (referencia marca KORA NOVA).
 */
const WelcomeScreen = ({ navigation }: { navigation: { navigate: (n: string) => void } }) => {
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <KoraNovaLogo size={Math.min(width * 0.55, 220)} showText showSlogan />
          <Text style={styles.hintMuted}>Universidad · Comunidad Pascual Bravo</Text>
        </View>

        <View style={styles.ctaBlock}>
          <NovaGradientButton
            title="Iniciar sesión"
            onPress={() => navigation.navigate('Login')}
          />
          <View style={{ height: 12 }} />
          <NovaOutlineButton
            title="Crear cuenta"
            onPress={() => navigation.navigate('Register')}
          />
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: KORA_BG,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 32,
  },
  hintMuted: {
    marginTop: 24,
    fontSize: 13,
    color: KORA_LILAC,
    opacity: 0.75,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  ctaBlock: {
    paddingBottom: 36,
    width: '100%',
  },
});

export default WelcomeScreen;
