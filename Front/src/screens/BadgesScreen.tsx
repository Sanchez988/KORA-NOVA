import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { LinearGradientColors } from '../types';
import { darkTheme } from '../theme/darkTheme';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: any;
  unlocked: boolean;
  unlockedAt?: string;
  gradient: LinearGradientColors;
  requirement: string;
  progress?: number;
  total?: number;
}

const BADGES: Badge[] = [
  {
    id: 'verified',
    name: 'Verificado',
    description: 'Tu cuenta ha sido verificada',
    icon: 'shield-checkmark',
    unlocked: true,
    unlockedAt: '2024-04-20',
    gradient: darkTheme.colors.gradient.secondary,
    requirement: 'Verificar tu identidad',
  },
  {
    id: 'first-match',
    name: 'Primer Match',
    description: 'Hiciste tu primer match',
    icon: 'heart',
    unlocked: true,
    unlockedAt: '2024-04-21',
    gradient: darkTheme.colors.gradient.primary,
    requirement: 'Obtener tu primer match',
  },
  {
    id: 'conversationalist',
    name: 'Conversador',
    description: 'Enviaste 100 mensajes',
    icon: 'chatbubbles',
    unlocked: true,
    unlockedAt: '2024-04-23',
    gradient: darkTheme.colors.gradient.sunset,
    requirement: 'Enviar 100 mensajes',
    progress: 100,
    total: 100,
  },
  {
    id: 'popular',
    name: 'Popular',
    description: 'Recibiste 50 likes',
    icon: 'thumbs-up',
    unlocked: false,
    gradient: darkTheme.colors.gradient.gold,
    requirement: 'Recibir 50 likes',
    progress: 32,
    total: 50,
  },
  {
    id: 'matcher',
    name: 'Matcher Pro',
    description: 'Obtuviste 25 matches',
    icon: 'flame',
    unlocked: false,
    gradient: ['#FF6B9D', '#FF1744'] as const,
    requirement: 'Obtener 25 matches',
    progress: 18,
    total: 25,
  },
  {
    id: 'active',
    name: 'Usuario Activo',
    description: 'Entraste 30 días seguidos',
    icon: 'calendar',
    unlocked: false,
    gradient: darkTheme.colors.gradient.secondary,
    requirement: 'Entrar 30 días consecutivos',
    progress: 14,
    total: 30,
  },
  {
    id: 'photogenic',
    name: 'Fotogénico',
    description: 'Agregaste 6 fotos a tu perfil',
    icon: 'camera',
    unlocked: true,
    unlockedAt: '2024-04-19',
    gradient: ['#9C27B0', '#673AB7'] as const,
    requirement: 'Subir 6 fotos',
  },
  {
    id: 'complete-profile',
    name: 'Perfil Completo',
    description: 'Completaste el 100% de tu perfil',
    icon: 'person',
    unlocked: true,
    unlockedAt: '2024-04-19',
    gradient: darkTheme.colors.gradient.primary,
    requirement: 'Completar toda tu información',
  },
  {
    id: 'social',
    name: 'Social',
    description: 'Conectaste tus redes sociales',
    icon: 'share-social',
    unlocked: false,
    gradient: ['#00BCD4', '#0097A7'] as const,
    requirement: 'Conectar Instagram o Spotify',
    progress: 0,
    total: 1,
  },
  {
    id: 'legend',
    name: 'Leyenda',
    description: 'Obtuviste 100 matches',
    icon: 'trophy',
    unlocked: false,
    gradient: darkTheme.colors.gradient.gold,
    requirement: 'Obtener 100 matches',
    progress: 18,
    total: 100,
  },
];

export default function BadgesScreen({ navigation }: any) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [confidenceScore, setConfidenceScore] = useState(85);

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    try {
      // TODO: Cargar badges del backend
      setBadges(BADGES);
    } catch (error) {
      console.error('Error loading badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const unlockedBadges = badges.filter((b) => b.unlocked);
  const lockedBadges = badges.filter((b) => !b.unlocked);

  const renderBadge = (badge: Badge) => {
    return (
      <TouchableOpacity
        key={badge.id}
        style={[
          styles.badgeCard,
          !badge.unlocked && styles.badgeCardLocked,
        ]}
        activeOpacity={0.8}
      >
        <View style={styles.badgeContent}>
          {/* Ícono del badge */}
          <View style={styles.badgeIconContainer}>
            <LinearGradient
              colors={badge.unlocked ? badge.gradient : darkTheme.colors.gradient.card}
              style={styles.badgeIconGradient}
            >
              <Ionicons
                name={badge.icon}
                size={32}
                color={badge.unlocked ? '#FFF' : darkTheme.colors.text.disabled}
              />
            </LinearGradient>
            
            {/* Lock overlay */}
            {!badge.unlocked && (
              <View style={styles.lockOverlay}>
                <Ionicons
                  name="lock-closed"
                  size={16}
                  color={darkTheme.colors.text.tertiary}
                />
              </View>
            )}
          </View>

          {/* Información */}
          <View style={styles.badgeInfo}>
            <Text
              style={[
                styles.badgeName,
                !badge.unlocked && styles.badgeNameLocked,
              ]}
            >
              {badge.name}
            </Text>
            <Text
              style={[
                styles.badgeDescription,
                !badge.unlocked && styles.badgeDescriptionLocked,
              ]}
            >
              {badge.description}
            </Text>

            {/* Fecha de desbloqueo */}
            {badge.unlocked && badge.unlockedAt && (
              <Text style={styles.badgeDate}>
                Desbloqueado: {new Date(badge.unlockedAt).toLocaleDateString()}
              </Text>
            )}

            {/* Progreso */}
            {!badge.unlocked && badge.progress !== undefined && badge.total !== undefined && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <LinearGradient
                    colors={badge.gradient}
                    style={[
                      styles.progressFill,
                      { width: `${(badge.progress / badge.total) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {badge.progress}/{badge.total}
                </Text>
              </View>
            )}

            {/* Requisito */}
            {!badge.unlocked && (
              <Text style={styles.requirementText}>
                {badge.requirement}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <LinearGradient
        colors={darkTheme.colors.gradient.dark}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={darkTheme.colors.brand.primary}
          />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={darkTheme.colors.gradient.dark}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="chevron-back"
            size={28}
            color={darkTheme.colors.text.primary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Logros e Insignias</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Score de confianza */}
        <View style={styles.scoreContainer}>
          <LinearGradient
            colors={darkTheme.colors.gradient.card}
            style={styles.scoreCard}
          >
            <View style={styles.scoreContent}>
              <View style={styles.scoreIconContainer}>
                <LinearGradient
                  colors={darkTheme.colors.gradient.gold}
                  style={styles.scoreIconGradient}
                >
                  <Ionicons name="shield-checkmark" size={40} color="#FFF" />
                </LinearGradient>
              </View>
              
              <View style={styles.scoreInfo}>
                <Text style={styles.scoreLabel}>Score de Confianza</Text>
                <Text style={styles.scoreValue}>{confidenceScore}/100</Text>
                <Text style={styles.scoreDescription}>
                  ¡Excelente! Eres un usuario muy confiable
                </Text>
              </View>
            </View>

            {/* Barra de progreso del score */}
            <View style={styles.scoreProgressBar}>
              <LinearGradient
                colors={darkTheme.colors.gradient.gold}
                style={[
                  styles.scoreProgressFill,
                  { width: `${confidenceScore}%` },
                ]}
              />
            </View>

            {/* Tips para mejorar */}
            <View style={styles.scoreTips}>
              <Ionicons
                name="bulb"
                size={16}
                color={darkTheme.colors.brand.accent}
              />
              <Text style={styles.scoreTipsText}>
                Completa todos los badges para aumentar tu score
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Estadísticas rápidas */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{unlockedBadges.length}</Text>
            <Text style={styles.statLabel}>Desbloqueados</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{lockedBadges.length}</Text>
            <Text style={styles.statLabel}>Por desbloquear</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {Math.round((unlockedBadges.length / badges.length) * 100)}%
            </Text>
            <Text style={styles.statLabel}>Progreso total</Text>
          </View>
        </View>

        {/* Badges desbloqueados */}
        {unlockedBadges.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Insignias Desbloqueadas ({unlockedBadges.length})
              </Text>
              <Ionicons
                name="trophy"
                size={20}
                color={darkTheme.colors.brand.gold}
              />
            </View>
            <View style={styles.badgesGrid}>
              {unlockedBadges.map((badge) => renderBadge(badge))}
            </View>
          </View>
        )}

        {/* Badges bloqueados */}
        {lockedBadges.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Por Desbloquear ({lockedBadges.length})
              </Text>
              <Ionicons
                name="lock-closed"
                size={20}
                color={darkTheme.colors.text.tertiary}
              />
            </View>
            <View style={styles.badgesGrid}>
              {lockedBadges.map((badge) => renderBadge(badge))}
            </View>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: darkTheme.spacing.lg,
    paddingTop: darkTheme.spacing.xl,
    paddingBottom: darkTheme.spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...darkTheme.typography.h3,
    color: darkTheme.colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: darkTheme.spacing.lg,
  },
  scoreContainer: {
    marginBottom: darkTheme.spacing.xl,
  },
  scoreCard: {
    borderRadius: darkTheme.borderRadius.xl,
    padding: darkTheme.spacing.lg,
    borderWidth: 1,
    borderColor: darkTheme.colors.border.light,
    ...darkTheme.shadows.lg,
  },
  scoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: darkTheme.spacing.md,
  },
  scoreIconContainer: {
    marginRight: darkTheme.spacing.md,
  },
  scoreIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreInfo: {
    flex: 1,
  },
  scoreLabel: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: '900',
    color: darkTheme.colors.text.primary,
    marginVertical: 4,
  },
  scoreDescription: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text.secondary,
  },
  scoreProgressBar: {
    height: 8,
    backgroundColor: darkTheme.colors.background.elevated,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: darkTheme.spacing.md,
  },
  scoreProgressFill: {
    height: '100%',
  },
  scoreTips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: darkTheme.spacing.xs,
  },
  scoreTipsText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.text.secondary,
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: darkTheme.spacing.md,
    marginBottom: darkTheme.spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: darkTheme.colors.background.card,
    borderRadius: darkTheme.borderRadius.lg,
    padding: darkTheme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: darkTheme.colors.border.light,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    color: darkTheme.colors.text.primary,
    marginBottom: 4,
  },
  statLabel: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.text.secondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: darkTheme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: darkTheme.spacing.md,
  },
  sectionTitle: {
    ...darkTheme.typography.h4,
    color: darkTheme.colors.text.primary,
  },
  badgesGrid: {
    gap: darkTheme.spacing.md,
  },
  badgeCard: {
    backgroundColor: darkTheme.colors.background.card,
    borderRadius: darkTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: darkTheme.colors.border.light,
    overflow: 'hidden',
  },
  badgeCardLocked: {
    opacity: 0.7,
  },
  badgeContent: {
    flexDirection: 'row',
    padding: darkTheme.spacing.md,
  },
  badgeIconContainer: {
    position: 'relative',
    marginRight: darkTheme.spacing.md,
  },
  badgeIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 15, 0.8)',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeInfo: {
    flex: 1,
  },
  badgeName: {
    ...darkTheme.typography.h4,
    color: darkTheme.colors.text.primary,
    marginBottom: 4,
  },
  badgeNameLocked: {
    color: darkTheme.colors.text.secondary,
  },
  badgeDescription: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text.secondary,
    marginBottom: 4,
  },
  badgeDescriptionLocked: {
    color: darkTheme.colors.text.tertiary,
  },
  badgeDate: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.brand.accent,
    marginTop: 4,
  },
  progressContainer: {
    marginTop: darkTheme.spacing.sm,
  },
  progressBar: {
    height: 6,
    backgroundColor: darkTheme.colors.background.elevated,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.text.tertiary,
    textAlign: 'right',
  },
  requirementText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.text.tertiary,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
