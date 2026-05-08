import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { LinearGradientColors } from '../types';
import { darkTheme } from '../theme/darkTheme';

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  popular?: boolean;
  gradient: LinearGradientColors;
  icon: any;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Kora Free',
    price: 0,
    period: 'Gratis',
    gradient: darkTheme.colors.gradient.card,
    icon: 'heart-outline',
    features: [
      'Likes ilimitados',
      '10 super likes al día',
      'Ver quién te dio like (blur)',
      'Chat con matches',
      'Ver perfiles cercanos',
    ],
  },
  {
    id: 'plus',
    name: 'Kora Plus',
    price: 15000,
    period: '/mes',
    gradient: darkTheme.colors.gradient.primary,
    icon: 'rocket',
    popular: true,
    features: [
      '✨ Todo lo de Free',
      'Ver quién te dio like (sin blur)',
      '50 super likes al día',
      'Rewind ilimitado',
      '5 boost al mes',
      'Sin anuncios',
      'Control de privacidad',
    ],
  },
  {
    id: 'gold',
    name: 'Kora Gold',
    price: 25000,
    period: '/mes',
    gradient: darkTheme.colors.gradient.gold,
    icon: 'trophy',
    features: [
      '🌟 Todo lo de Plus',
      'Super likes ilimitados',
      'Boost ilimitados',
      'Ver matches antes de dar like',
      'Prioridad en el algoritmo',
      'Badge de verificado premium',
      'Acceso a eventos exclusivos',
      'Soporte prioritario',
    ],
  },
];

export default function PlansScreen({ navigation }: any) {
  const [selectedPlan, setSelectedPlan] = useState<string>('free');

  const handleSelectPlan = (planId: string) => {
    if (planId === 'free') {
      Alert.alert('Plan Actual', 'Ya tienes el plan gratuito activo');
      return;
    }

    Alert.alert(
      'Confirmar Suscripción',
      `¿Deseas suscribirte a ${PLANS.find((p) => p.id === planId)?.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => handlePurchase(planId),
        },
      ]
    );
  };

  const handlePurchase = async (planId: string) => {
    try {
      // TODO: Integrar con Stripe o sistema de pagos
      Alert.alert('¡Gracias!', 'Tu suscripción está siendo procesada');
      setSelectedPlan(planId);
    } catch (error) {
      Alert.alert('Error', 'No se pudo procesar el pago');
    }
  };

  const renderPlanCard = (plan: Plan) => {
    const isSelected = selectedPlan === plan.id;
    const isPremium = plan.id !== 'free';

    return (
      <TouchableOpacity
        key={plan.id}
        style={[
          styles.planCard,
          plan.popular && styles.planCardPopular,
        ]}
        onPress={() => handleSelectPlan(plan.id)}
        activeOpacity={0.9}
      >
        {/* Badge "Más Popular" */}
        {plan.popular && (
          <View style={styles.popularBadge}>
            <LinearGradient
              colors={darkTheme.colors.gradient.gold}
              style={styles.popularBadgeGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="star" size={14} color="#FFF" />
              <Text style={styles.popularBadgeText}>Más Popular</Text>
            </LinearGradient>
          </View>
        )}

        <View style={styles.planCardContent}>
          {/* Ícono del plan */}
          <View style={styles.planIconContainer}>
            <LinearGradient
              colors={plan.gradient}
              style={styles.planIconGradient}
            >
              <Ionicons name={plan.icon} size={32} color="#FFF" />
            </LinearGradient>
          </View>

          {/* Nombre y precio */}
          <Text style={styles.planName}>{plan.name}</Text>
          <View style={styles.priceContainer}>
            {plan.price === 0 ? (
              <Text style={styles.priceText}>Gratis</Text>
            ) : (
              <>
                <Text style={styles.priceAmount}>
                  ${plan.price.toLocaleString()}
                </Text>
                <Text style={styles.pricePeriod}>{plan.period}</Text>
              </>
            )}
          </View>

          {/* Características */}
          <View style={styles.featuresContainer}>
            {plan.features.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={
                    isPremium
                      ? darkTheme.colors.brand.accent
                      : darkTheme.colors.text.tertiary
                  }
                />
                <Text
                  style={[
                    styles.featureText,
                    isPremium && styles.featureTextPremium,
                  ]}
                >
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          {/* Botón de acción */}
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => handleSelectPlan(plan.id)}
          >
            {isSelected ? (
              <View style={styles.selectedButton}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={darkTheme.colors.brand.accent}
                />
                <Text style={styles.selectedButtonText}>Plan Actual</Text>
              </View>
            ) : (
              <LinearGradient colors={plan.gradient} style={styles.selectButtonGradient}>
                <Text style={styles.selectButtonText}>
                  {plan.price === 0 ? 'Continuar' : 'Suscribirme'}
                </Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

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
        <Text style={styles.headerTitle}>Planes Premium</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Título y descripción */}
        <View style={styles.introContainer}>
          <Text style={styles.introTitle}>
            Mejora tu experiencia{'\n'}en Kora Nova
          </Text>
          <Text style={styles.introText}>
            Desbloquea funciones premium y aumenta tus posibilidades de encontrar
            a esa persona especial
          </Text>
        </View>

        {/* Tarjetas de planes */}
        <View style={styles.plansContainer}>
          {PLANS.map((plan) => renderPlanCard(plan))}
        </View>

        {/* Información adicional */}
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Ionicons
              name="shield-checkmark"
              size={20}
              color={darkTheme.colors.brand.accent}
            />
            <Text style={styles.infoText}>
              Pagos 100% seguros con encriptación
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons
              name="refresh"
              size={20}
              color={darkTheme.colors.brand.accent}
            />
            <Text style={styles.infoText}>
              Cancela cuando quieras sin cargos extras
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons
              name="help-circle"
              size={20}
              color={darkTheme.colors.brand.accent}
            />
            <Text style={styles.infoText}>
              Soporte disponible 24/7 para ayudarte
            </Text>
          </View>
        </View>

        {/* Testimonios */}
        <View style={styles.testimonialsContainer}>
          <Text style={styles.testimonialsTitle}>
            Lo que dicen nuestros usuarios
          </Text>
          
          <View style={styles.testimonialCard}>
            <View style={styles.testimonialHeader}>
              <View style={styles.testimonialAvatar}>
                <LinearGradient
                  colors={darkTheme.colors.gradient.primary}
                  style={styles.avatarGradient}
                >
                  <Text style={styles.avatarText}>M</Text>
                </LinearGradient>
              </View>
              <View>
                <Text style={styles.testimonialName}>María P.</Text>
                <Text style={styles.testimonialPlan}>Kora Plus</Text>
              </View>
            </View>
            <Text style={styles.testimonialText}>
              "Encontré a mi pareja gracias a Kora Nova. El plan Plus me ayudó a
              ver quién estaba interesado en mí y tomar la iniciativa. ¡100%
              recomendado!"
            </Text>
            <View style={styles.starsContainer}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Ionicons
                  key={i}
                  name="star"
                  size={16}
                  color={darkTheme.colors.brand.gold}
                />
              ))}
            </View>
          </View>

          <View style={styles.testimonialCard}>
            <View style={styles.testimonialHeader}>
              <View style={styles.testimonialAvatar}>
                <LinearGradient
                  colors={darkTheme.colors.gradient.secondary}
                  style={styles.avatarGradient}
                >
                  <Text style={styles.avatarText}>C</Text>
                </LinearGradient>
              </View>
              <View>
                <Text style={styles.testimonialName}>Carlos M.</Text>
                <Text style={styles.testimonialPlan}>Kora Gold</Text>
              </View>
            </View>
            <Text style={styles.testimonialText}>
              "El badge premium y la prioridad en el algoritmo hicieron una gran
              diferencia. Recibí muchos más matches y de mejor calidad."
            </Text>
            <View style={styles.starsContainer}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Ionicons
                  key={i}
                  name="star"
                  size={16}
                  color={darkTheme.colors.brand.gold}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footerText}>
          Al suscribirte aceptas nuestros{' '}
          <Text style={styles.footerLink}>Términos de Servicio</Text> y{' '}
          <Text style={styles.footerLink}>Política de Privacidad</Text>
        </Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingTop: 0,
  },
  introContainer: {
    marginBottom: darkTheme.spacing.xl,
    alignItems: 'center',
  },
  introTitle: {
    ...darkTheme.typography.h1,
    color: darkTheme.colors.text.primary,
    textAlign: 'center',
    marginBottom: darkTheme.spacing.sm,
  },
  introText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: darkTheme.spacing.md,
  },
  plansContainer: {
    gap: darkTheme.spacing.lg,
    marginBottom: darkTheme.spacing.xl,
  },
  planCard: {
    backgroundColor: darkTheme.colors.background.card,
    borderRadius: darkTheme.borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: darkTheme.colors.border.light,
    ...darkTheme.shadows.md,
  },
  planCardPopular: {
    borderWidth: 2,
    borderColor: darkTheme.colors.brand.gold,
    ...darkTheme.shadows.xl,
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
  },
  popularBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 4,
    borderBottomLeftRadius: darkTheme.borderRadius.md,
  },
  popularBadgeText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.text.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  planCardContent: {
    padding: darkTheme.spacing.lg,
    alignItems: 'center',
  },
  planIconContainer: {
    marginBottom: darkTheme.spacing.md,
  },
  planIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planName: {
    ...darkTheme.typography.h2,
    color: darkTheme.colors.text.primary,
    marginBottom: darkTheme.spacing.xs,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: darkTheme.spacing.lg,
  },
  priceText: {
    ...darkTheme.typography.h2,
    color: darkTheme.colors.text.primary,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: darkTheme.colors.text.primary,
  },
  pricePeriod: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text.secondary,
    marginLeft: 4,
  },
  featuresContainer: {
    width: '100%',
    gap: darkTheme.spacing.sm,
    marginBottom: darkTheme.spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: darkTheme.spacing.sm,
  },
  featureText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text.secondary,
    flex: 1,
  },
  featureTextPremium: {
    color: darkTheme.colors.text.primary,
  },
  selectButton: {
    width: '100%',
    borderRadius: darkTheme.borderRadius.full,
    overflow: 'hidden',
  },
  selectButtonGradient: {
    paddingVertical: darkTheme.spacing.md,
    alignItems: 'center',
  },
  selectButtonText: {
    ...darkTheme.typography.h4,
    color: darkTheme.colors.text.primary,
    fontWeight: '700',
  },
  selectedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: darkTheme.spacing.md,
    backgroundColor: darkTheme.colors.background.elevated,
    gap: darkTheme.spacing.xs,
  },
  selectedButtonText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.brand.accent,
    fontWeight: '700',
  },
  infoContainer: {
    gap: darkTheme.spacing.md,
    marginBottom: darkTheme.spacing.xl,
    paddingHorizontal: darkTheme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: darkTheme.spacing.sm,
  },
  infoText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text.secondary,
    flex: 1,
  },
  testimonialsContainer: {
    gap: darkTheme.spacing.lg,
    marginBottom: darkTheme.spacing.xl,
  },
  testimonialsTitle: {
    ...darkTheme.typography.h3,
    color: darkTheme.colors.text.primary,
    textAlign: 'center',
    marginBottom: darkTheme.spacing.sm,
  },
  testimonialCard: {
    backgroundColor: darkTheme.colors.background.card,
    borderRadius: darkTheme.borderRadius.lg,
    padding: darkTheme.spacing.lg,
    borderWidth: 1,
    borderColor: darkTheme.colors.border.light,
  },
  testimonialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: darkTheme.spacing.sm,
    marginBottom: darkTheme.spacing.md,
  },
  testimonialAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...darkTheme.typography.h3,
    color: darkTheme.colors.text.primary,
    fontWeight: '700',
  },
  testimonialName: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text.primary,
    fontWeight: '700',
  },
  testimonialPlan: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.text.tertiary,
  },
  testimonialText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text.secondary,
    lineHeight: 22,
    marginBottom: darkTheme.spacing.sm,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  footerText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: darkTheme.spacing.xxl,
  },
  footerLink: {
    color: darkTheme.colors.brand.accent,
    textDecorationLine: 'underline',
  },
});
