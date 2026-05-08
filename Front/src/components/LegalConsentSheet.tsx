import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '../context/ThemeContext';
import { borderRadius, spacing } from '../theme/colors';
import { LEGAL_FIRST_LAUNCH_SUMMARY } from '../constants/legal';

const { height: SCREEN_H } = Dimensions.get('window');

type Props = {
  visible: boolean;
  onAccept: () => void;
  onOpenFullTerms: () => void;
  onOpenPrivacy: () => void;
};

export const LegalConsentSheet: React.FC<Props> = ({
  visible,
  onAccept,
  onOpenFullTerms,
  onOpenPrivacy,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [checked, setChecked] = useState(false);
  const slide = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (visible) {
      setChecked(false);
      Animated.spring(slide, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      slide.setValue(SCREEN_H);
    }
  }, [visible, slide]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <View style={styles.root}>
        <View style={styles.backdrop} />

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slide }] }]}
        >
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          <View style={styles.iconCircle}>
            <Ionicons name="document-text-outline" size={28} color="#fff" />
          </View>

          <Text style={styles.title}>Términos y privacidad</Text>
          <Text style={styles.subtitle}>
            Es la primera vez que usas Kora Nova en este dispositivo. Revisa los documentos y
            confirma que aceptas continuar.
          </Text>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollInner}
            showsVerticalScrollIndicator
          >
            <Text style={styles.summary}>{LEGAL_FIRST_LAUNCH_SUMMARY}</Text>

            <View style={styles.linksRow}>
              <TouchableOpacity onPress={onOpenFullTerms} style={styles.linkBtn} activeOpacity={0.85}>
                <Ionicons name="open-outline" size={16} color={theme.brandPurple} />
                <Text style={styles.linkText}>Términos completos</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onOpenPrivacy} style={styles.linkBtn} activeOpacity={0.85}>
                <Ionicons name="shield-checkmark-outline" size={16} color={theme.brandPurple} />
                <Text style={styles.linkText}>Privacidad</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setChecked(!checked)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, checked && styles.checkboxOn]}>
              {checked ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
            </View>
            <Text style={styles.checkboxLabel}>
              He leído el resumen y acepto los Términos y Condiciones y la Política de Privacidad.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ctaOuter}
            onPress={() => checked && onAccept()}
            disabled={!checked}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={
                checked
                  ? ['#6C5CE7', '#FF6B8B']
                  : theme.isDark
                    ? ['#3d3d55', '#3d3d55']
                    : ['#DDD8EE', '#DDD8EE']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text
                style={[
                  styles.ctaText,
                  !checked && (theme.isDark ? styles.ctaTextDisabledDark : styles.ctaTextDisabledLight),
                ]}
              >
                Aceptar y continuar
              </Text>
              <Ionicons
                name="arrow-forward"
                size={20}
                color={checked ? '#fff' : theme.isDark ? 'rgba(255,255,255,0.45)' : theme.textMuted}
              />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    sheet: {
      maxHeight: SCREEN_H * 0.92,
      backgroundColor: theme.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingHorizontal: spacing.lg,
      paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
      paddingTop: spacing.sm,
    },
    handleWrap: { alignItems: 'center', marginBottom: spacing.sm },
    handle: {
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.border ?? 'rgba(255,255,255,0.15)',
    },
    iconCircle: {
      alignSelf: 'center',
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: 'rgba(108,92,231,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: 'rgba(162,155,254,0.35)',
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.text,
      textAlign: 'center',
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 13,
      lineHeight: 19,
      color: theme.textMuted,
      textAlign: 'center',
      marginBottom: spacing.md,
      paddingHorizontal: spacing.xs,
    },
    scroll: {
      maxHeight: SCREEN_H * 0.38,
      marginBottom: spacing.md,
    },
    scrollInner: {
      paddingBottom: spacing.sm,
    },
    summary: {
      fontSize: 13,
      lineHeight: 21,
      color: theme.textSub,
    },
    linksRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.md,
      justifyContent: 'center',
    },
    linkBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: borderRadius.md,
      backgroundColor: theme.isDark ? 'rgba(108,92,231,0.12)' : 'rgba(108,92,231,0.08)',
      borderWidth: 1,
      borderColor: 'rgba(108,92,231,0.35)',
    },
    linkText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.brandPurple,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: spacing.md,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: theme.border ?? '#ccc',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    checkboxOn: {
      backgroundColor: '#6C5CE7',
      borderColor: '#6C5CE7',
    },
    checkboxLabel: {
      flex: 1,
      fontSize: 13,
      lineHeight: 19,
      color: theme.textSub,
    },
    ctaOuter: {
      borderRadius: borderRadius.full,
      overflow: 'hidden',
      marginBottom: spacing.sm,
    },
    ctaGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 16,
    },
    ctaText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '800',
    },
    ctaTextDisabledDark: {
      color: 'rgba(255,255,255,0.45)',
    },
    ctaTextDisabledLight: {
      color: 'rgba(18,18,35,0.38)',
    },
  });
