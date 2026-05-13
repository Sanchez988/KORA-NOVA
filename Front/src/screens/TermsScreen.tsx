import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { LEGAL_DOC_VERSION, PRIVACY_CONTENT, TERMS_CONTENT } from '../constants/legal';
import { authService } from '../services/auth.service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// readOnly=true → viene desde Settings, solo lectura, diseño oscuro, sin botones aceptar/rechazar

const TABS = ['Términos y Condiciones', 'Privacidad'] as const;
type Tab = typeof TABS[number];

// ─── Componente ───────────────────────────────────────────────────────────────

export default function TermsScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { logout, refreshUser } = useAuth();
  const readOnly: boolean = route?.params?.readOnly ?? false;
  const initialTab: Tab = route?.params?.tab ?? 'Términos y Condiciones';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [termsScrolled, setTermsScrolled] = useState(false);
  const [privacyScrolled, setPrivacyScrolled] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const isScrolledToBottom = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    return layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
  };

  const bothRead = termsScrolled && privacyScrolled;
  const bothAccepted = termsAccepted && privacyAccepted;

  const handleAccept = () => {
    void (async () => {
      try {
        await authService.acceptLegalConsent(LEGAL_DOC_VERSION);
        await refreshUser();
        navigation.replace('Onboarding');
      } catch (e: unknown) {
        const msg =
          (e as { response?: { data?: { message?: string } } }).response?.data?.message ||
          'Intenta de nuevo.';
        Alert.alert('No se pudo guardar la aceptación', msg);
      }
    })();
  };

  const handleDecline = () => {
    Alert.alert(
      'Rechazar términos',
      'Para usar Kora Nova debes aceptar los Términos y la Política de Privacidad. ¿Deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: () => logout(),
        },
      ],
    );
  };

  // ─── Modo solo lectura (desde Settings) ─────────────────────────────────────
  if (readOnly) {
    return (
      <View style={ro.screen}>
        {/* Header oscuro */}
        <View style={[ro.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={ro.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={ro.headerCenter}>
            <Text style={ro.headerTitle}>Información Legal</Text>
            <Text style={ro.headerSub}>Kora Nova · Pascual Bravo 2026</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Tabs */}
        <View style={ro.tabs}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[ro.tab, activeTab === tab && ro.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={tab === 'Términos y Condiciones' ? 'document-text-outline' : 'shield-outline'}
                size={14}
                color={activeTab === tab ? '#A29BFE' : 'rgba(162,155,254,0.4)'}
              />
              <Text style={[ro.tabText, activeTab === tab && ro.tabTextActive]}>
                {tab === 'Términos y Condiciones' ? 'Términos' : 'Privacidad'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Contenido */}
        <ScrollView
          key={activeTab}
          style={ro.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[ro.scrollContent, { paddingBottom: 40 + insets.bottom }]}
        >
          <Text style={ro.body}>
            {activeTab === 'Términos y Condiciones' ? TERMS_CONTENT : PRIVACY_CONTENT}
          </Text>
        </ScrollView>
      </View>
    );
  }

  // ─── Modo onboarding (flujo normal de aceptación) ─────────────────────────
  return (
    <LinearGradient
      colors={colors.gradient.sunset as any}
      style={[styles.screen, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 8 }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="document-text-outline" size={28} color={colors.text.inverse} />
        </View>
        <Text style={styles.headerTitle}>Antes de continuar</Text>
        <Text style={styles.headerSubtitle}>
          Lee y acepta nuestros términos para usar Kora Nova
        </Text>
      </View>

      {/* Card */}
      <View style={styles.card}>
        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={
                  tab === 'Términos y Condiciones'
                    ? termsScrolled
                      ? 'checkmark-circle'
                      : 'document-text-outline'
                    : privacyScrolled
                    ? 'checkmark-circle'
                    : 'shield-outline'
                }
                size={14}
                color={
                  activeTab === tab
                    ? colors.primary
                    : termsScrolled && tab === 'Términos y Condiciones'
                    ? colors.success
                    : privacyScrolled && tab === 'Privacidad'
                    ? colors.success
                    : colors.text.secondary
                }
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Aviso scroll */}
        {((activeTab === 'Términos y Condiciones' && !termsScrolled) ||
          (activeTab === 'Privacidad' && !privacyScrolled)) && (
          <View style={styles.scrollHint}>
            <Ionicons name="arrow-down-circle-outline" size={14} color={colors.text.secondary} />
            <Text style={styles.scrollHintText}>Desplázate hasta el final para continuar</Text>
          </View>
        )}

        {/* Contenido */}
        <ScrollView
          key={activeTab}
          style={styles.scrollArea}
          showsVerticalScrollIndicator={true}
          onScroll={(e) => {
            if (isScrolledToBottom(e)) {
              if (activeTab === 'Términos y Condiciones') setTermsScrolled(true);
              else setPrivacyScrolled(true);
            }
          }}
          scrollEventThrottle={100}
        >
          <Text style={styles.contentText}>
            {activeTab === 'Términos y Condiciones' ? TERMS_CONTENT : PRIVACY_CONTENT}
          </Text>

          {/* Checkbox de aceptación por sección */}
          {activeTab === 'Términos y Condiciones' ? (
            <TouchableOpacity
              style={[
                styles.sectionAccept,
                termsAccepted && styles.sectionAcceptActive,
                !termsScrolled && styles.sectionAcceptDisabled,
              ]}
              onPress={() => termsScrolled && setTermsAccepted(!termsAccepted)}
              activeOpacity={termsScrolled ? 0.7 : 1}
            >
              <Ionicons
                name={termsAccepted ? 'checkbox' : 'square-outline'}
                size={22}
                color={termsAccepted ? colors.success : termsScrolled ? colors.text.secondary : colors.text.tertiary}
              />
              <Text style={[
                styles.sectionAcceptText,
                termsAccepted && styles.sectionAcceptTextActive,
                !termsScrolled && styles.sectionAcceptTextDisabled,
              ]}>
                Acepto los Términos y Condiciones de uso
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.sectionAccept,
                privacyAccepted && styles.sectionAcceptActive,
                !privacyScrolled && styles.sectionAcceptDisabled,
              ]}
              onPress={() => privacyScrolled && setPrivacyAccepted(!privacyAccepted)}
              activeOpacity={privacyScrolled ? 0.7 : 1}
            >
              <Ionicons
                name={privacyAccepted ? 'checkbox' : 'square-outline'}
                size={22}
                color={privacyAccepted ? colors.success : privacyScrolled ? colors.text.secondary : colors.text.tertiary}
              />
              <Text style={[
                styles.sectionAcceptText,
                privacyAccepted && styles.sectionAcceptTextActive,
                !privacyScrolled && styles.sectionAcceptTextDisabled,
              ]}>
                Acepto la Política de Privacidad
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Progreso lectura */}
        <View style={styles.progressRow}>
          <View style={styles.progressItem}>
            <Ionicons
              name={termsAccepted ? 'checkmark-circle' : termsScrolled ? 'ellipse' : 'ellipse-outline'}
              size={16}
              color={termsAccepted ? colors.success : termsScrolled ? colors.primary : colors.text.tertiary}
            />
            <Text style={[styles.progressText, termsAccepted && styles.progressTextDone]}>
              {termsAccepted ? 'Términos aceptados' : termsScrolled ? 'Por aceptar' : 'Términos leídos'}
            </Text>
          </View>
          <View style={styles.progressItem}>
            <Ionicons
              name={privacyAccepted ? 'checkmark-circle' : privacyScrolled ? 'ellipse' : 'ellipse-outline'}
              size={16}
              color={privacyAccepted ? colors.success : privacyScrolled ? colors.primary : colors.text.tertiary}
            />
            <Text style={[styles.progressText, privacyAccepted && styles.progressTextDone]}>
              {privacyAccepted ? 'Privacidad aceptada' : privacyScrolled ? 'Por aceptar' : 'Privacidad leída'}
            </Text>
          </View>
        </View>

        {/* Botones */}
        <TouchableOpacity
          style={[styles.acceptBtn, !bothAccepted && styles.acceptBtnDisabled]}
          onPress={handleAccept}
          disabled={!bothAccepted}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={bothAccepted ? (colors.gradient.sunset as any) : ['#D1D5DB', '#D1D5DB']}
            style={styles.acceptGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons
              name={bothAccepted ? 'arrow-forward-circle' : 'lock-closed-outline'}
              size={22}
              color="#fff"
            />
            <Text style={styles.acceptBtnText}>
              {bothAccepted
                ? 'Continuar'
                : !termsAccepted && !privacyAccepted
                ? 'Acepta ambas secciones'
                : !termsAccepted
                ? 'Acepta los Términos'
                : 'Acepta la Privacidad'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.declineBtn} onPress={handleDecline} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={15} color={colors.error} style={{ marginRight: 6 }} />
          <Text style={styles.declineBtnText}>No acepto — Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.inverse,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  card: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.lg,
    padding: 4,
    marginBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
  },
  tabActive: {
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  scrollHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF8F0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: '#FFD93D40',
  },
  scrollHintText: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  scrollArea: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  contentText: {
    fontSize: 12.5,
    lineHeight: 20,
    color: colors.text.secondary,
    fontFamily: 'System',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressText: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  progressTextDone: {
    color: colors.success,
    fontWeight: '600',
  },
  acceptBtn: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  acceptBtnDisabled: {
    opacity: 0.55,
    shadowOpacity: 0,
    elevation: 0,
  },
  acceptGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  declineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: `${colors.error}40`,
    backgroundColor: `${colors.error}08`,
    marginTop: 2,
  },
  declineBtnText: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '600',
  },
  sectionAccept: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.backgroundLight,
  },
  sectionAcceptActive: {
    borderColor: colors.success,
    backgroundColor: `${colors.success}10`,
  },
  sectionAcceptDisabled: {
    opacity: 0.4,
  },
  sectionAcceptText: {
    flex: 1,
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  sectionAcceptTextActive: {
    color: colors.success,
    fontWeight: '700',
  },
  sectionAcceptTextDisabled: {
    color: colors.text.tertiary,
  },
});

// ─── Estilos modo solo lectura (oscuro) ───────────────────────────────────────
const ro = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0D0D1A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#0D0D1A',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#1C1C35',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(108,92,231,0.2)',
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 12, color: 'rgba(162,155,254,0.5)', marginTop: 2 },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#16162A',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(108,92,231,0.15)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: 'rgba(108,92,231,0.2)',
  },
  tabText: { fontSize: 13, fontWeight: '600', color: 'rgba(162,155,254,0.4)' },
  tabTextActive: { color: '#A29BFE', fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  body: {
    fontSize: 13,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'System',
  },
});
