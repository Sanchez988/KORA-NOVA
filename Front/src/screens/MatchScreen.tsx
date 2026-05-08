import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme } from '../theme/darkTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MatchScreenProps {
  route: {
    params: {
      matchedUser: {
        id: string;
        name: string;
        age: number;
        photos: string[];
        program?: string;
      };
      currentUser: {
        name: string;
        photos: string[];
      };
    };
  };
  navigation: any;
}

export default function MatchScreen({ route, navigation }: MatchScreenProps) {
  const { matchedUser, currentUser } = route.params;

  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const heartsAnim = useRef(new Animated.Value(0)).current;
  const textAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Secuencia de animaciones
    Animated.sequence([
      // Fade in y escala de las imágenes
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
      ]),
      // Animación de corazones
      Animated.timing(heartsAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // Texto de "¡Es un Match!"
      Animated.spring(textAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSendMessage = () => {
    navigation.navigate('Chat', { userId: matchedUser.id });
  };

  const handleKeepSwiping = () => {
    navigation.goBack();
  };

  const currentUserPhoto =
    typeof currentUser.photos === 'string'
      ? JSON.parse(currentUser.photos)[0]
      : currentUser.photos[0];

  const matchedUserPhoto =
    typeof matchedUser.photos === 'string'
      ? JSON.parse(matchedUser.photos)[0]
      : matchedUser.photos[0];

  return (
    <LinearGradient
      colors={darkTheme.colors.gradient.dark}
      style={styles.container}
    >
      {/* Confetti/Particles effect (simulado con múltiples elementos) */}
      <View style={styles.confettiContainer}>
        {Array.from({ length: 20 }).map((_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.confetti,
              {
                left: `${(index * 5) % 100}%`,
                top: `${(index * 7) % 100}%`,
                opacity: heartsAnim,
                transform: [
                  {
                    translateY: heartsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-50, 100],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons
              name={index % 2 === 0 ? 'heart' : 'star'}
              size={index % 3 === 0 ? 24 : 16}
              color={
                index % 2 === 0
                  ? darkTheme.colors.brand.primary
                  : darkTheme.colors.brand.accent
              }
            />
          </Animated.View>
        ))}
      </View>

      {/* Contenido principal */}
      <View style={styles.content}>
        {/* Título animado */}
        <Animated.View
          style={[
            styles.titleContainer,
            {
              opacity: textAnim,
              transform: [
                {
                  scale: textAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={darkTheme.colors.gradient.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.titleGradient}
          >
            <Text style={styles.title}>¡Es un Match!</Text>
          </LinearGradient>
          <Text style={styles.subtitle}>
            A {matchedUser.name} también le gustas
          </Text>
        </Animated.View>

        {/* Fotos con corazón en medio */}
        <Animated.View
          style={[
            styles.photosContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Foto del usuario actual */}
          <View style={styles.photoWrapper}>
            <Image
              source={{ uri: currentUserPhoto }}
              style={styles.photo}
            />
            <View style={styles.photoOverlay}>
              <LinearGradient
                colors={['transparent', 'rgba(10, 10, 15, 0.7)']}
                style={styles.gradient}
              >
                <Text style={styles.photoName}>{currentUser.name}</Text>
              </LinearGradient>
            </View>
          </View>

          {/* Corazón central */}
          <Animated.View
            style={[
              styles.heartContainer,
              {
                opacity: heartsAnim,
                transform: [
                  {
                    scale: heartsAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, 1.2, 1],
                    }),
                  },
                  {
                    rotate: heartsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={darkTheme.colors.gradient.primary}
              style={styles.heart}
            >
              <Ionicons name="heart" size={40} color="#FFF" />
            </LinearGradient>
          </Animated.View>

          {/* Foto del match */}
          <View style={styles.photoWrapper}>
            <Image
              source={{ uri: matchedUserPhoto }}
              style={styles.photo}
            />
            <View style={styles.photoOverlay}>
              <LinearGradient
                colors={['transparent', 'rgba(10, 10, 15, 0.7)']}
                style={styles.gradient}
              >
                <Text style={styles.photoName}>
                  {matchedUser.name}, {matchedUser.age}
                </Text>
              </LinearGradient>
            </View>
          </View>
        </Animated.View>

        {/* Información adicional */}
        <Animated.View
          style={[
            styles.infoContainer,
            {
              opacity: textAnim,
            },
          ]}
        >
          {matchedUser.program && (
            <View style={styles.infoRow}>
              <Ionicons
                name="school"
                size={16}
                color={darkTheme.colors.brand.accent}
              />
              <Text style={styles.infoText}>{matchedUser.program}</Text>
            </View>
          )}
          <Text style={styles.tipText}>
            💡 Los matches que envían el primer mensaje tienen 70% más probabilidad de
            iniciar una conversación
          </Text>
        </Animated.View>

        {/* Botones de acción */}
        <Animated.View
          style={[
            styles.actionsContainer,
            {
              opacity: textAnim,
              transform: [
                {
                  translateY: textAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Botón de enviar mensaje */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSendMessage}
          >
            <LinearGradient
              colors={darkTheme.colors.gradient.primary}
              style={styles.buttonGradient}
            >
              <Ionicons name="chatbubble" size={20} color="#FFF" />
              <Text style={styles.primaryButtonText}>Enviar Mensaje</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Botón de seguir buscando */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleKeepSwiping}
          >
            <Text style={styles.secondaryButtonText}>Seguir Buscando</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Botón de cerrar */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons
          name="close"
          size={28}
          color={darkTheme.colors.text.secondary}
        />
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  confetti: {
    position: 'absolute',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: darkTheme.spacing.xl,
    gap: darkTheme.spacing.xl,
  },
  titleContainer: {
    alignItems: 'center',
    gap: darkTheme.spacing.sm,
  },
  titleGradient: {
    paddingHorizontal: darkTheme.spacing.lg,
    paddingVertical: darkTheme.spacing.sm,
    borderRadius: darkTheme.borderRadius.full,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: darkTheme.colors.text.primary,
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    ...darkTheme.typography.h4,
    color: darkTheme.colors.text.secondary,
    textAlign: 'center',
  },
  photosContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: -40,
  },
  photoWrapper: {
    width: SCREEN_WIDTH * 0.35,
    height: SCREEN_WIDTH * 0.45,
    borderRadius: darkTheme.borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: darkTheme.colors.background.card,
    ...darkTheme.shadows.xl,
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  gradient: {
    padding: darkTheme.spacing.sm,
  },
  photoName: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
  heartContainer: {
    zIndex: 10,
  },
  heart: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: darkTheme.colors.background.card,
    ...darkTheme.shadows.xl,
  },
  infoContainer: {
    alignItems: 'center',
    gap: darkTheme.spacing.md,
    paddingHorizontal: darkTheme.spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: darkTheme.spacing.xs,
  },
  infoText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text.secondary,
  },
  tipText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.text.tertiary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  actionsContainer: {
    width: '100%',
    gap: darkTheme.spacing.md,
  },
  primaryButton: {
    borderRadius: darkTheme.borderRadius.full,
    overflow: 'hidden',
    ...darkTheme.shadows.lg,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: darkTheme.spacing.md,
    gap: darkTheme.spacing.sm,
  },
  primaryButtonText: {
    ...darkTheme.typography.h4,
    color: darkTheme.colors.text.primary,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: darkTheme.spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text.secondary,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: darkTheme.spacing.xl,
    right: darkTheme.spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: darkTheme.colors.background.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    ...darkTheme.shadows.md,
  },
});
