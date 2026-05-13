import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { profileService, type TrustBreakdown, type UserProfileStats } from "../services/profile.service";
import { Profile, User } from "../types";
import { filterDisplayableProfilePhotoUris, coerceProfilePhotosArray } from "../utils/profilePhotos";
import { ProfileFillImage } from "../components/ProfileFillImage";
import { INTEREST_ICONS } from "../data/interestIcons";
import { HOBBY_ICONS } from "../data/hobbyCatalog";

// ─── Datos demo ───────────────────────────────────────────────────────────────

const BADGE_DEFINITIONS = [
  { id: 'first_match',   icon: '🎉', label: 'First Match',   desc: 'Tu primer match',      max: 1,   getValue: (s: any) => s.matchCount,    check: (s: any) => s.matchCount >= 1 },
  { id: 'conversador',  icon: '💬', label: 'Conversador',  desc: '100+ mensajes',        max: 100, getValue: (s: any) => s.messagesSent,  check: (s: any) => s.messagesSent >= 100 },
  { id: 'popular',      icon: '⭐', label: 'Popular',      desc: '50+ likes',            max: 50,  getValue: (s: any) => s.likesReceived, check: (s: any) => s.likesReceived >= 50 },
  { id: 'planificador', icon: '🎯', label: 'Planificador', desc: '10 planes creados',    max: 10,  getValue: (s: any) => s.plansCreated,  check: (s: any) => s.plansCreated >= 10 },
  { id: 'vip',          icon: '👑', label: 'VIP',          desc: 'Usuario premium',      max: null, getValue: (_s: any) => 0,             check: (_s: any) => false },
];

const BADGE_HOW_TO: Record<string, string> = {
  first_match:   'Completa tu perfil con al menos 3 fotos e intereses y da likes a otros usuarios. ¡Tu primer match está cerca!',
  conversador:   'Mantén conversaciones activas con tus matches. Cada mensaje que envíes suma para esta insignia.',
  popular:       'Cuantos más likes recibas de otros usuarios, más rápido desbloqueas esta insignia. Un perfil completo atrae más atención.',
  planificador:  'Propón planes a tus matches desde la pantalla de chat usando el botón "Proponer plan".',
  vip:           'Esta insignia es exclusiva para miembros premium. Próximamente disponible en Kora.',
};

/** Máximo teórico sin penalización: 70 (20+15+35). Umbral ajustado a esa escala. */
const getTrustInfo = (score: number) => {
  if (score >= 56) return { label: "Excelente", color: "#A29BFE" };
  if (score >= 36) return { label: "Bueno", color: "#FFD93D" };
  return { label: "Mejorable", color: colors.error };
};

type TrustFactorRow = {
  key: string;
  label: string;
  sub?: string;
  icon: string;
  value: number;
  mode: "bonus" | "penalty";
};

function buildTrustFactors(
  b: TrustBreakdown | undefined,
  user: User | null | undefined
): TrustFactorRow[] {
  if (b) {
    return [
      {
        key: "verified",
        label: "Perfil verificado",
        icon: "shield-checkmark-outline",
        value: b.verified.points,
        mode: "bonus",
      },
      {
        key: "interactions",
        label: "Interacciones positivas",
        icon: "happy-outline",
        value: b.interactions.points,
        mode: "bonus",
      },
      {
        key: "email",
        label: "Email institucional",
        icon: "mail-outline",
        value: b.institutionalEmail.points,
        mode: "bonus",
      },
      {
        key: "reports",
        label: "Reportes recibidos",
        sub:
          b.reports.count > 0
            ? `${b.reports.count} activo(s)`
            : undefined,
        icon: "flag-outline",
        value: b.reports.penalty,
        mode: "penalty",
      },
    ];
  }

  const verifiedPts = user?.verified ? 20 : 0;
  const email = user?.email ?? "";
  const institutionalPts = /@pascualbravo\.edu\.co$/i.test(email) ? 15 : 0;

  return [
    {
      key: "verified",
      label: "Perfil verificado",
      icon: "shield-checkmark-outline",
      value: verifiedPts,
      mode: "bonus",
    },
    {
      key: "interactions",
      label: "Interacciones positivas",
      icon: "happy-outline",
      value: 0,
      mode: "bonus",
    },
    {
      key: "email",
      label: "Email institucional",
      icon: "mail-outline",
      value: institutionalPts,
      mode: "bonus",
    },
    {
      key: "reports",
      label: "Reportes recibidos",
      icon: "flag-outline",
      value: 0,
      mode: "penalty",
    },
  ];
}

function formatTrustFactorPoints(f: TrustFactorRow): string {
  if (f.mode === "penalty") return String(f.value);
  return `+${f.value}`;
}

function trustFactorPointsColor(f: TrustFactorRow): string {
  if (f.mode === "penalty") {
    if (f.value < 0) return "#E17055";
    return colors.success;
  }
  return colors.success;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const ProfileScreen = ({ navigation }: any) => {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [profile, setProfile] = useState<Profile | null>(user?.profile ?? null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<UserProfileStats>({
    matchCount: 0,
    messagesSent: 0,
    likesReceived: 0,
    plansCreated: 0,
  });
  const [selectedBadge, setSelectedBadge] = useState<typeof badges[number] | null>(null);
  const [photoViewerIndex, setPhotoViewerIndex] = useState<number | null>(null);

  const badges = BADGE_DEFINITIONS.map((b) => ({ ...b, unlocked: b.check(stats) }));

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        setLoading(true);
        try {
          const [fresh, freshStats] = await Promise.all([
            profileService.getMyProfile(),
            profileService.getStats(),
          ]);
          if (!cancelled) { setProfile(fresh); setStats(freshStats); }
        } catch {
          if (!cancelled) setProfile(user?.profile ?? null);
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      load();
      return () => { cancelled = true; };
    }, [user?.profile])
  );

  const name = profile?.name ?? user?.email?.split("@")[0] ?? "Sin nombre";
  const email = user?.email ?? "";
  const program = profile?.program ?? "";
  const semester = profile?.semester ? `Semestre ${profile.semester}` : "";
  const bio = profile?.bio ?? "";
  const interests: string[] = Array.isArray(profile?.interests) ? profile!.interests : [];
  const hobbies: string[] = Array.isArray(profile?.hobbies) ? profile!.hobbies : [];
  const photos: string[] = filterDisplayableProfilePhotoUris(
    coerceProfilePhotosArray(profile?.photos)
  );
  const completeness = profile?.completeness ?? 0;

  const trustFactors = useMemo(() => buildTrustFactors(stats.trustBreakdown, user), [stats.trustBreakdown, user]);

  const trustScore = useMemo(() => {
    if (typeof stats.trustScore === "number") return stats.trustScore;
    return Math.min(100, 50 + Math.round(completeness * 0.5));
  }, [stats.trustScore, completeness]);

  const trustInfo = getTrustInfo(trustScore);

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('¿Estás seguro que deseas cerrar sesión?')) {
        await logout();
      }
    } else {
      Alert.alert('Cerrar sesión', '¿Estás seguro?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', style: 'destructive', onPress: async () => { await logout(); } },
      ]);
    }
  };

  const closePhotoViewer = () => setPhotoViewerIndex(null);
  const goPrevPhoto = () =>
    setPhotoViewerIndex((idx) => (idx === null ? idx : (idx - 1 + photos.length) % photos.length));
  const goNextPhoto = () =>
    setPhotoViewerIndex((idx) => (idx === null ? idx : (idx + 1) % photos.length));

  return (
    <View style={styles.screen}>
      {/* ─── Header ───────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerAvatarBox}>
          <Ionicons name="person-outline" size={22} color="rgba(162,155,254,0.7)" />
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Mi Perfil</Text>
          <Text style={styles.headerSub}>Tu información y configuración</Text>
        </View>
        <TouchableOpacity
          style={styles.headerGearBox}
          onPress={() => navigation.navigate("Settings")}
          activeOpacity={0.8}
        >
          <Ionicons name="settings-outline" size={20} color="rgba(162,155,254,0.8)" />
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ─── Hero card ─────────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          {/* Avatar + info row */}
          <View style={styles.heroTopRow}>
            {/* Circular photo */}
            <View style={styles.avatarRingOuter}>
              <LinearGradient
                colors={["#6C5CE7", "#FF6B8B"]}
                style={styles.avatarRing}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.avatarInner}>
                  {photos[0] ? (
                    <ProfileFillImage uri={photos[0]} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={40} color="rgba(162,155,254,0.4)" />
                    </View>
                  )}
                </View>
              </LinearGradient>
              <TouchableOpacity
                style={styles.cameraBtn}
                onPress={() => navigation.navigate("CreateProfile")}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={14} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Name + program */}
            <View style={styles.heroNameCol}>
              <Text style={styles.heroName}>{name}</Text>
              {(program || semester) ? (
                <Text style={styles.heroSub} numberOfLines={2}>
                  {[program, semester].filter(Boolean).join(" · ")}
                </Text>
              ) : null}
              {loading && <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 4 }} />}
            </View>
          </View>

          {/* Trust Score sub-card */}
          <View style={styles.trustCard}>
            <View style={styles.trustLeft}>
              <View style={styles.trustTitleRow}>
                <Text style={styles.trustTitle}>Score de Confianza</Text>
                <Ionicons name="information-circle-outline" size={14} color="rgba(162,155,254,0.5)" />
              </View>
              <View style={styles.trustScoreRow}>
                <Text style={styles.trustNumber}>{trustScore}</Text>
                <View style={[styles.trustBadge, { backgroundColor: `${trustInfo.color}22` }]}>
                  <Text style={[styles.trustBadgeText, { color: trustInfo.color }]}>{trustInfo.label}</Text>
                </View>
              </View>
            </View>
            {/* Shield ring */}
            <View style={styles.shieldRingOuter}>
              <LinearGradient
                colors={["#6C5CE7", "#A29BFE"]}
                style={styles.shieldRing}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.shieldInner}>
                  <Ionicons name="shield-checkmark" size={28} color="#A29BFE" />
                </View>
              </LinearGradient>
            </View>
          </View>

          {/* Trust factors row */}
          <View style={styles.factorsRow}>
            {trustFactors.map((f) => (
              <View key={f.key} style={styles.factorItem}>
                <Ionicons
                  name={f.icon as any}
                  size={16}
                  color={f.mode === "penalty" ? (f.value < 0 ? "#E17055" : colors.success) : colors.primary}
                />
                <Text style={styles.factorLabel} numberOfLines={3}>
                  {f.label}
                  {f.sub ? <Text style={styles.factorSub}>{`\n${f.sub}`}</Text> : null}
                </Text>
                <Text style={[styles.factorPoints, { color: trustFactorPointsColor(f) }]}>
                  {formatTrustFactorPoints(f)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ─── Fotos del perfil ───────────────────────────────────────── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Fotos del perfil</Text>
          <Text style={styles.photosCount}>{photos.length} foto(s)</Text>
        </View>
        <View style={styles.photosCard}>
          {photos.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photosStrip}
            >
              {photos.map((photoUri, idx) => (
                <TouchableOpacity
                  key={`${photoUri}-${idx}`}
                  style={styles.photoThumbBtn}
                  onPress={() => setPhotoViewerIndex(idx)}
                  activeOpacity={0.85}
                >
                  <ProfileFillImage uri={photoUri} />
                  <View style={styles.photoThumbOverlay}>
                    <Ionicons name="expand-outline" size={16} color="#fff" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.emptyHint}>Aún no tienes fotos en tu perfil.</Text>
          )}
        </View>

        {/* ─── Insignias ─────────────────────────────────────────────── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Insignias</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badgesRow}
        >
          {badges.map((badge) => {
            const current = badge.getValue(stats);
            const pct = badge.max ? Math.min(1, current / badge.max) : 0;
            return (
              <TouchableOpacity
                key={badge.id}
                style={[styles.badgeCard, !badge.unlocked && styles.badgeCardLocked]}
                onPress={() => setSelectedBadge(badge)}
                activeOpacity={0.75}
              >
                <View style={[styles.badgeHex, badge.unlocked && styles.badgeHexUnlocked, !badge.unlocked && styles.badgeHexLocked]}>
                  <Text style={styles.badgeEmoji}>{badge.icon}</Text>
                </View>
                <Text style={[styles.badgeLabel, !badge.unlocked && { color: "rgba(162,155,254,0.4)" }]}>
                  {badge.label}
                </Text>
                <Text style={styles.badgeDesc}>{badge.desc}</Text>
                {/* Barra de progreso */}
                {badge.max !== null && !badge.unlocked && (
                  <View style={styles.badgeProgressBg}>
                    <View style={[styles.badgeProgressFill, { width: `${Math.round(pct * 100)}%` as any }]} />
                  </View>
                )}
                {badge.max !== null && !badge.unlocked && (
                  <Text style={styles.badgeProgressLabel}>{current}/{badge.max}</Text>
                )}
                {badge.unlocked && (
                  <View style={styles.badgeUnlockedDot}>
                    <Text style={styles.badgeUnlockedTxt}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ─── Información personal ──────────────────────────────────── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Información personal</Text>
        </View>
        <View style={styles.card}>
          {[
            { icon: "mail-outline", label: "Email", value: email },
            { icon: "school-outline", label: "Programa", value: program },
            { icon: "book-outline", label: "Semestre", value: semester },
            { icon: "person-outline", label: "Biografía", value: bio },
          ].map((row, idx, arr) => row.value ? (
            <React.Fragment key={row.label}>
              <View style={styles.infoRow}>
                <Ionicons name={row.icon as any} size={18} color={colors.primary} style={styles.infoIcon} />
                <View style={styles.infoTexts}>
                  <Text style={styles.infoLabel}>{row.label}</Text>
                  <Text style={styles.infoValue} numberOfLines={row.label === "Biografía" ? 3 : 1}>
                    {row.value}
                  </Text>
                </View>
              </View>
              {idx < arr.length - 1 && row.value && <View style={styles.divider} />}
            </React.Fragment>
          ) : null)}
        </View>

        {/* ─── Intereses + Hobbies ───────────────────────────────────── */}
        <View style={styles.dualRow}>
          {/* Intereses */}
          <View style={[styles.card, styles.dualCard]}>
            <View style={styles.dualCardHeader}>
              <Text style={styles.dualTitle}>Intereses</Text>
            </View>
            <View style={styles.tagsWrap}>
              {interests.length > 0 ? interests.map((int) => (
                <View key={int} style={styles.interestTag}>
                  <Text style={styles.interestTagText}>
                    {INTEREST_ICONS[int] ?? "•"} {int}
                  </Text>
                </View>
              )) : (
                <Text style={styles.emptyHint}>Sin intereses</Text>
              )}
            </View>
          </View>

          {/* Hobbies */}
          <View style={[styles.card, styles.dualCard]}>
            <View style={styles.dualCardHeader}>
              <Text style={styles.dualTitle}>Hobbies</Text>
            </View>
            <View style={styles.hobbyList}>
              {hobbies.length > 0 ? hobbies.map((h) => (
                <View key={h} style={styles.hobbyRow}>
                  <Text style={styles.hobbyEmoji}>{HOBBY_ICONS[h] ?? "•"}</Text>
                  <Text style={styles.hobbyText}>{h}</Text>
                </View>
              )) : (
                <Text style={styles.emptyHint}>Sin hobbies</Text>
              )}
            </View>
          </View>
        </View>

        {/* ─── Editar perfil button ──────────────────────────────────── */}
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate("CreateProfile")}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={["#6C5CE7", "#FF6B8B"]}
            style={styles.editBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="pencil-outline" size={18} color="#fff" />
            <Text style={styles.editBtnText}>Editar perfil</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={16} color={colors.error} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ─── Badge Detail Modal ───────────────────────────────────────── */}
      {selectedBadge && (() => {
        const b = selectedBadge;
        const current = b.getValue(stats);
        const pct = b.max ? Math.min(1, current / b.max) : 0;
        const pctLabel = b.max ? `${current} / ${b.max}` : '—';
        const howTo = BADGE_HOW_TO[b.id] ?? '';
        return (
          <Modal
            visible={!!selectedBadge}
            transparent
            animationType="slide"
            onRequestClose={() => setSelectedBadge(null)}
          >
            <TouchableOpacity
              style={bdm.overlay}
              onPress={() => setSelectedBadge(null)}
              activeOpacity={1}
            >
              <View style={bdm.sheet}>
                <View style={bdm.handle} />

                {/* Icon */}
                <View style={[bdm.iconWrap, b.unlocked ? bdm.iconWrapUnlocked : bdm.iconWrapLocked]}>
                  <Text style={bdm.icon}>{b.icon}</Text>
                  {b.unlocked && (
                    <View style={bdm.checkBadge}>
                      <Ionicons name="checkmark" size={11} color="#fff" />
                    </View>
                  )}
                </View>

                {/* Name + status */}
                <Text style={bdm.label}>{b.label}</Text>
                <View style={[bdm.statusPill, b.unlocked ? bdm.statusUnlocked : bdm.statusLocked]}>
                  <Ionicons
                    name={b.unlocked ? 'checkmark-circle' : 'lock-closed'}
                    size={12}
                    color={b.unlocked ? '#00CEC9' : 'rgba(162,155,254,0.5)'}
                  />
                  <Text style={[bdm.statusTxt, b.unlocked ? bdm.statusTxtUnlocked : bdm.statusTxtLocked]}>
                    {b.unlocked ? 'Desbloqueada' : 'Bloqueada'}
                  </Text>
                </View>

                {/* Description */}
                <Text style={bdm.desc}>{b.desc}</Text>

                {/* Progress bar */}
                {b.max !== null && (
                  <View style={bdm.progressSection}>
                    <View style={bdm.progressHeader}>
                      <Text style={bdm.progressTitle}>Progreso</Text>
                      <Text style={bdm.progressValue}>{pctLabel}</Text>
                    </View>
                    <View style={bdm.progressBg}>
                      <LinearGradient
                        colors={b.unlocked ? ['#00CEC9', '#55EFC4'] : ['#6C5CE7', '#A29BFE']}
                        style={[bdm.progressFill, { width: `${Math.max(4, Math.round(pct * 100))}%` as any }]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      />
                    </View>
                    <Text style={bdm.progressPct}>{Math.round(pct * 100)}% completado</Text>
                  </View>
                )}

                {/* How to unlock */}
                {!b.unlocked && howTo ? (
                  <View style={bdm.howToBox}>
                    <View style={bdm.howToHeader}>
                      <Ionicons name="bulb-outline" size={14} color="#FDCB6E" />
                      <Text style={bdm.howToTitle}>Cómo desbloquearla</Text>
                    </View>
                    <Text style={bdm.howToTxt}>{howTo}</Text>
                  </View>
                ) : b.unlocked ? (
                  <View style={bdm.unlockedBox}>
                    <Ionicons name="trophy-outline" size={16} color="#00CEC9" />
                    <Text style={bdm.unlockedTxt}>¡Felicidades! Ya tienes esta insignia en tu perfil.</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={bdm.closeBtn}
                  onPress={() => setSelectedBadge(null)}
                  activeOpacity={0.8}
                >
                  <Text style={bdm.closeTxt}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        );
      })()}

      {/* ─── Photo Viewer Modal ──────────────────────────────────────── */}
      {photoViewerIndex !== null && photos[photoViewerIndex] ? (
        <Modal
          visible
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={closePhotoViewer}
        >
          <View style={pvm.overlay}>
            <TouchableOpacity
              style={pvm.backdrop}
              onPress={closePhotoViewer}
              activeOpacity={1}
            />
            <View style={[pvm.topBar, { paddingTop: insets.top + 6 }]}>
              <TouchableOpacity
                style={pvm.closeFab}
                onPress={closePhotoViewer}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Cerrar galería de fotos"
              >
                <Ionicons name="close" size={26} color="#fff" />
              </TouchableOpacity>
              <Text style={pvm.topBarHint}>Toca cerrar o fuera de la imagen</Text>
            </View>
            <View style={pvm.content}>
              <View style={pvm.imageFrame}>
                <ProfileFillImage uri={photos[photoViewerIndex]} />
              </View>
              <Text style={pvm.counter}>
                {photoViewerIndex + 1} / {photos.length}
              </Text>
              {photos.length > 1 ? (
                <View style={pvm.controls}>
                  <TouchableOpacity style={pvm.ctrlBtn} onPress={goPrevPhoto} activeOpacity={0.8}>
                    <Ionicons name="chevron-back" size={22} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={pvm.ctrlBtn} onPress={goNextPhoto} activeOpacity={0.8}>
                    <Ionicons name="chevron-forward" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : null}
              <TouchableOpacity
                style={pvm.dismissBtn}
                onPress={closePhotoViewer}
                activeOpacity={0.85}
              >
                <Text style={pvm.dismissBtnTxt}>Listo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
};

export default ProfileScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────
const makeStyles = (theme: any) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: theme.bg,
    gap: 12,
  },
  headerAvatarBox: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: theme.surface2,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: theme.border,
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: theme.text },
  headerSub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  headerGearBox: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: theme.surface2,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: theme.border,
  },
  notifDot: {
    position: "absolute", top: 8, right: 8,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: "#FF6B8B", borderWidth: 1.5, borderColor: theme.surface2,
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingTop: 8 },

  // Hero card
  heroCard: {
    backgroundColor: theme.surface, borderRadius: 20, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: theme.border,
  },
  heroTopRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },

  // Avatar ring
  avatarRingOuter: { position: "relative" },
  avatarRing: { width: 100, height: 100, borderRadius: 50, padding: 3, alignItems: "center", justifyContent: "center" },
  avatarInner: {
    width: 94,
    height: 94,
    borderRadius: 47,
    overflow: "hidden",
    backgroundColor: theme.surface2,
    position: "relative",
  },
  avatarPlaceholder: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  cameraBtn: {
    position: "absolute", bottom: 2, right: 2,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#6C5CE7",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: theme.surface,
  },

  heroNameCol: { flex: 1 },
  heroName: { fontSize: 20, fontWeight: "800", color: theme.text, marginBottom: 4 },
  heroSub: { fontSize: 13, color: theme.textAccent, lineHeight: 18 },

  // Trust score card
  trustCard: {
    backgroundColor: theme.bg, borderRadius: 14, padding: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 14, borderWidth: 1, borderColor: theme.border,
  },
  trustLeft: { flex: 1 },
  trustTitleRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 },
  trustTitle: { fontSize: 13, color: theme.textSub, fontWeight: "600" },
  trustScoreRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  trustNumber: { fontSize: 36, fontWeight: "800", color: "#A29BFE" },
  trustBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  trustBadgeText: { fontSize: 12, fontWeight: "700" },

  // Shield ring
  shieldRingOuter: {},
  shieldRing: { width: 60, height: 60, borderRadius: 30, padding: 3, alignItems: "center", justifyContent: "center" },
  shieldInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center" },

  // Trust factors
  factorsRow: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
  factorItem: { flex: 1, alignItems: "center", gap: 4 },
  factorLabel: { fontSize: 10, color: theme.textSub, textAlign: "center", lineHeight: 13 },
  factorSub: {
    fontSize: 9,
    color: theme.textMuted,
    fontWeight: "600",
    lineHeight: 12,
  },
  factorPoints: { fontSize: 13, fontWeight: "800" },

  // Section headers
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: theme.text },
  photosCount: { fontSize: 12, color: theme.textMuted, fontWeight: "600" },
  verTodasBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  verTodas: { fontSize: 13, color: colors.primary, fontWeight: "600" },
  editarRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  editarText: { fontSize: 13, color: colors.primary, fontWeight: "600" },

  // Badges
  badgesRow: { gap: 10, paddingBottom: 14, paddingHorizontal: 2 },
  badgeCard: {
    width: 92, backgroundColor: theme.surface, borderRadius: 16, padding: 10,
    alignItems: "center", gap: 5, borderWidth: 1, borderColor: theme.border,
  },
  badgeCardLocked: { opacity: 0.55 },
  badgeHex: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: "rgba(108,92,231,0.15)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "rgba(108,92,231,0.4)",
  },
  badgeHexUnlocked: { backgroundColor: "rgba(108,92,231,0.25)", borderColor: "#6C5CE7" },
  badgeHexLocked: { borderColor: "rgba(162,155,254,0.15)" },
  badgeEmoji: { fontSize: 24 },
  badgeLabel: { fontSize: 11, fontWeight: "700", color: theme.text, textAlign: "center" },
  badgeDesc: { fontSize: 10, color: theme.textAccent, textAlign: "center" },
  badgeProgressBg: { width: "100%", height: 4, backgroundColor: "rgba(162,155,254,0.1)", borderRadius: 2, overflow: "hidden", marginTop: 2 },
  badgeProgressFill: { height: 4, backgroundColor: "#6C5CE7", borderRadius: 2 },
  badgeProgressLabel: { fontSize: 9, color: theme.textAccent, fontWeight: "600" },
  badgeUnlockedDot: { backgroundColor: "rgba(6,214,160,0.2)", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, marginTop: 2 },
  badgeUnlockedTxt: { fontSize: 10, color: "#06D6A0", fontWeight: "800" },

  // Info personal card
  card: { backgroundColor: theme.surface, borderRadius: 18, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: theme.border },
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 12 },
  infoIcon: { width: 24, alignItems: "center" },
  infoTexts: { flex: 1 },
  infoLabel: { fontSize: 11, color: theme.textAccent, marginBottom: 2 },
  infoValue: { fontSize: 13, color: theme.textSub, fontWeight: "500" },
  divider: { height: 1, backgroundColor: theme.border, marginHorizontal: 2 },

  // Dual row
  dualRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  dualCard: { flex: 1, marginBottom: 0 },
  dualCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  dualTitle: { fontSize: 14, fontWeight: "700", color: theme.text },
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  interestTag: { backgroundColor: "rgba(108,92,231,0.15)", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(108,92,231,0.3)" },
  interestTagText: { fontSize: 12, color: theme.text, fontWeight: "500" },
  hobbyList: { gap: 8 },
  hobbyRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  hobbyEmoji: { fontSize: 16 },
  hobbyText: { fontSize: 13, color: theme.textSub },
  emptyHint: { fontSize: 12, color: theme.textAccent, fontStyle: "italic" },
  photosCard: {
    backgroundColor: theme.surface,
    borderRadius: 18,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  photosStrip: { gap: 10, paddingRight: 2 },
  photoThumbBtn: {
    width: 96,
    height: 126,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface2,
    position: "relative",
  },
  photoThumbOverlay: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Edit button
  editBtn: { borderRadius: 16, overflow: "hidden", marginBottom: 12, shadowColor: "#6C5CE7", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  editBtnGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  editBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },

  // Logout
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: "rgba(239,71,111,0.25)", backgroundColor: "rgba(239,71,111,0.06)" },
  logoutText: { fontSize: 14, color: colors.error, fontWeight: "600" },
});

const pvm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 10,
    pointerEvents: "box-none",
  },
  closeFab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.35)",
  },
  topBarHint: {
    flex: 1,
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "600",
  },
  content: {
    width: "100%",
    alignItems: "center",
    gap: 12,
    zIndex: 10,
  },
  imageFrame: {
    width: "100%",
    aspectRatio: 0.75,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#15152A",
  },
  counter: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: "700",
  },
  controls: {
    flexDirection: "row",
    gap: 16,
  },
  ctrlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  dismissBtn: {
    marginTop: 4,
    paddingHorizontal: 28,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  dismissBtnTxt: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});

// ─── Badge Detail Modal Styles ────────────────────────────────────────────────
const bdm = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#16162A',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12,
    borderTopWidth: 1, borderColor: 'rgba(108,92,231,0.2)',
    alignItems: 'center',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: 20,
  },
  iconWrap: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  iconWrapUnlocked: {
    backgroundColor: 'rgba(0,206,201,0.12)',
    borderWidth: 2, borderColor: 'rgba(0,206,201,0.35)',
  },
  iconWrapLocked: {
    backgroundColor: 'rgba(108,92,231,0.1)',
    borderWidth: 2, borderColor: 'rgba(108,92,231,0.25)',
  },
  icon: { fontSize: 40 },
  checkBadge: {
    position: 'absolute', bottom: -4, right: -4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#00CEC9',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#16162A',
  },
  label: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999,
    marginBottom: 10,
  },
  statusUnlocked: { backgroundColor: 'rgba(0,206,201,0.1)', borderWidth: 1, borderColor: 'rgba(0,206,201,0.3)' },
  statusLocked: { backgroundColor: 'rgba(108,92,231,0.08)', borderWidth: 1, borderColor: 'rgba(108,92,231,0.2)' },
  statusTxt: { fontSize: 12, fontWeight: '700' },
  statusTxtUnlocked: { color: '#00CEC9' },
  statusTxtLocked: { color: 'rgba(162,155,254,0.55)' },
  desc: {
    fontSize: 14, color: 'rgba(255,255,255,0.55)',
    textAlign: 'center', lineHeight: 20, marginBottom: 20,
  },
  progressSection: { width: '100%', marginBottom: 18 },
  progressHeader: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8,
  },
  progressTitle: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  progressValue: { fontSize: 13, fontWeight: '700', color: '#A29BFE' },
  progressBg: {
    height: 10, borderRadius: 5,
    backgroundColor: 'rgba(108,92,231,0.15)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 5 },
  progressPct: {
    fontSize: 11, color: 'rgba(162,155,254,0.4)',
    marginTop: 5, textAlign: 'right',
  },
  howToBox: {
    width: '100%',
    backgroundColor: 'rgba(253,203,110,0.07)',
    borderRadius: 14, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(253,203,110,0.15)',
  },
  howToHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  howToTitle: { fontSize: 13, fontWeight: '700', color: '#FDCB6E' },
  howToTxt: { fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 19 },
  unlockedBox: {
    width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(0,206,201,0.07)',
    borderRadius: 14, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(0,206,201,0.2)',
  },
  unlockedTxt: { flex: 1, fontSize: 13, color: 'rgba(0,206,201,0.8)', lineHeight: 19 },
  closeBtn: {
    width: '100%', paddingVertical: 15,
    backgroundColor: 'rgba(108,92,231,0.12)',
    borderRadius: 18, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(108,92,231,0.25)',
  },
  closeTxt: { fontSize: 15, fontWeight: '700', color: '#A29BFE' },
});
