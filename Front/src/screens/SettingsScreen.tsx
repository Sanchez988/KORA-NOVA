import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../context/AuthContext";
import { loadExpoNotifications, shouldLoadExpoNotifications } from "../utils/expoNotifications";
import { useTheme } from "../context/ThemeContext";
import { locationService } from "../services/location.service";
import { profileService } from "../services/profile.service";
import { authService } from "../services/auth.service";
import { colors } from "../theme/colors";
import {
  ensureForegroundLocationAccess,
  getWebGeolocationCoords,
  type WebGeolocationCoords,
} from "../utils/permissions";
import { useFocusEffect } from "@react-navigation/native";
import {
  getMyReportTargets,
  revokeReportToUser,
  reportErrorMessage,
  type ReportTargetRow,
} from "../services/report.service";
import { useScreenInsets } from "../utils/screenInsets";

// ─── Constants ────────────────────────────────────────────────────────────────

const SHOW_ME_TO_OPTIONS = [
  { label: "Todos", value: "EVERYONE" },
  { label: "Solo mujeres", value: "WOMEN" },
  { label: "Solo hombres", value: "MEN" },
  { label: "No binario", value: "NON_BINARY" },
];

const DISTANCE_OPTIONS = [5, 10, 20, 30, 50, 100];

// ─── UI helpers ───────────────────────────────────────────────────────────────

const SectionTitle = ({ title }: { title: string }) => {
  const { theme } = useTheme();
  return (
    <Text style={{
      fontSize: 11,
      fontWeight: "700",
      color: theme.textMuted,
      textTransform: "uppercase",
      letterSpacing: 1.2,
      marginTop: 20,
      marginBottom: 8,
      marginLeft: 4,
    }}>{title}</Text>
  );
};

const Divider = () => {
  const { theme } = useTheme();
  return <View style={{ height: 1, backgroundColor: theme.border, marginLeft: 48 }} />;
};

const SettingsRow = ({
  icon,
  label,
  desc,
  right,
  onPress,
  danger = false,
}: {
  icon: string;
  label: string;
  desc?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
}) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 13,
        gap: 12,
      }}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress && right === undefined}
    >
      <View style={[{
        width: 36,
        height: 36,
        borderRadius: 11,
        backgroundColor: danger ? "rgba(239,71,111,0.12)" : "rgba(108,92,231,0.14)",
        alignItems: "center",
        justifyContent: "center",
      }]}>
        <Ionicons name={icon as any} size={18} color={danger ? colors.error : colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, color: danger ? colors.error : theme.text, fontWeight: "600" }}>{label}</Text>
        {desc ? <Text style={{ fontSize: 12, color: theme.textSub, marginTop: 2 }}>{desc}</Text> : null}
      </View>
      {right !== undefined
        ? right
        : onPress
          ? <Ionicons name="chevron-forward" size={16} color="rgba(162,155,254,0.3)" />
          : null}
    </TouchableOpacity>
  );
};

// ─── Filters Modal ────────────────────────────────────────────────────────────

const FiltersModal = ({
  visible,
  onClose,
  currentDistance,
  currentShowTo,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  currentDistance: number;
  currentShowTo: string;
  onSave: (dist: number, showTo: string) => void;
}) => {
  const [dist, setDist] = useState(currentDistance);
  const [showTo, setShowTo] = useState(currentShowTo);

  useEffect(() => {
    if (visible) {
      setDist(currentDistance);
      setShowTo(currentShowTo);
    }
  }, [visible, currentDistance, currentShowTo]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          {/* Handle */}
          <View style={modal.handle} />
          <Text style={modal.title}>Filtros de descubrimiento</Text>

          {/* Distance */}
          <Text style={modal.label}>Distancia máxima</Text>
          <View style={modal.optionsRow}>
            {DISTANCE_OPTIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[modal.chip, dist === d && modal.chipActive]}
                onPress={() => setDist(d)}
                activeOpacity={0.75}
              >
                <Text style={[modal.chipText, dist === d && modal.chipTextActive]}>
                  {d} km
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Show to */}
          <Text style={[modal.label, { marginTop: 20 }]}>Mostrarme a</Text>
          <View style={modal.optionsCol}>
            {SHOW_ME_TO_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={modal.radioRow}
                onPress={() => setShowTo(opt.value)}
                activeOpacity={0.75}
              >
                <View style={[modal.radioOuter, showTo === opt.value && modal.radioOuterActive]}>
                  {showTo === opt.value && <View style={modal.radioInner} />}
                </View>
                <Text style={modal.radioLabel}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Actions */}
          <TouchableOpacity
            style={modal.saveBtn}
            onPress={() => onSave(dist, showTo)}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={["#6C5CE7", "#FF6B8B"]}
              style={modal.saveBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={modal.saveBtnText}>Guardar cambios</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={modal.cancelBtn} activeOpacity={0.7}>
            <Text style={modal.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const SettingsScreen = ({ navigation }: any) => {
  const { insets } = useScreenInsets();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme, theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // Location
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  /** Web: evita spam a la API al reenviar posición en cada foco de la pantalla. */
  const lastWebLocationPushMs = useRef(0);

  // Incognito
  const [incognito, setIncognito] = useState(false);
  const [updatingIncognito, setUpdatingIncognito] = useState(false);

  // Discovery filters
  const [maxDistance, setMaxDistance] = useState(50);
  const [showMeTo, setShowMeTo] = useState("EVERYONE");
  const [filtersModal, setFiltersModal] = useState(false);
  const [savingFilters, setSavingFilters] = useState(false);

  // Notifications
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [loadingNotif, setLoadingNotif] = useState(true);
  const [updatingNotif, setUpdatingNotif] = useState(false);

  // Visibility
  const [showLastSeen, setShowLastSeen] = useState(true);
  const [showDistance, setShowDistance] = useState(true);
  const [visibilityModal, setVisibilityModal] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);

  // Danger zone
  const [deletingAccount, setDeletingAccount] = useState(false);

  const [reportTargets, setReportTargets] = useState<ReportTargetRow[]>([]);
  const [loadingReportTargets, setLoadingReportTargets] = useState(false);

  const loadReportTargets = useCallback(async () => {
    setLoadingReportTargets(true);
    try {
      const r = await getMyReportTargets();
      setReportTargets(r.targets ?? []);
    } catch {
      setReportTargets([]);
    } finally {
      setLoadingReportTargets(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadReportTargets();
    }, [loadReportTargets])
  );

  useEffect(() => {
    // Load location status
    locationService
      .getLocationStatus()
      .then((s) => setLocationEnabled(s.locationEnabled))
      .catch(() => {})
      .finally(() => setLoadingLocation(false));

    // Load profile preferences
    profileService
      .getMyProfile()
      .then((p) => {
        if (p.maxDistance) setMaxDistance(p.maxDistance);
        if (p.showMeTo) setShowMeTo(p.showMeTo);
        if (p.showLastSeen !== undefined) setShowLastSeen(p.showLastSeen);
        if (p.showDistance !== undefined) setShowDistance(p.showDistance);
      })
      .catch(() => {});

    // Permisos de notificación (no importar expo-notifications en Expo Go → evita error SDK 53)
    (async () => {
      try {
        if (Platform.OS === "web") {
          setNotifEnabled(
            typeof Notification !== "undefined" &&
              (Notification as any).permission === "granted"
          );
        } else if (!shouldLoadExpoNotifications()) {
          setNotifEnabled(false);
        } else {
          const Notifications = await loadExpoNotifications();
          if (!Notifications) {
            setNotifEnabled(false);
          } else {
            const { status } = await Notifications.getPermissionsAsync();
            setNotifEnabled(status === "granted");
          }
        }
      } catch {
        // ignore
      } finally {
        setLoadingNotif(false);
      }
    })();
  }, []);

  /** Web: si ya compartes ubicación pero aún no hay fila en el servidor, reenvía GPS (p. ej. tras activar solo el toggle). */
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "web" || !locationEnabled || loadingLocation) return;
      const now = Date.now();
      if (now - lastWebLocationPushMs.current < 90_000) return;
      (async () => {
        const coords = await getWebGeolocationCoords(true);
        if (!coords) return;
        try {
          await locationService.updateLocation({
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
          });
          lastWebLocationPushMs.current = Date.now();
        } catch {
          /* sin permiso o red: Descubrir también intentará */
        }
      })();
    }, [locationEnabled, loadingLocation])
  );

  const pushCoordsAfterEnabling = async (coords: WebGeolocationCoords) => {
    await locationService.updateLocation({
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
    });
    lastWebLocationPushMs.current = Date.now();
  };

  const handleLocationToggle = async (value: boolean) => {
    let webCoords: WebGeolocationCoords | null = null;
    if (value) {
      if (Platform.OS === "web") {
        webCoords = await getWebGeolocationCoords(false);
        if (!webCoords) return;
      } else {
        const ok = await ensureForegroundLocationAccess({
          suppressDenyFollowUp: false,
        });
        if (!ok) return;
      }
    }
    setUpdatingLocation(true);
    try {
      const res = await locationService.toggleLocation(value);
      setLocationEnabled(res.locationEnabled);
      if (value && res.locationEnabled) {
        try {
          if (Platform.OS === "web" && webCoords) {
            await pushCoordsAfterEnabling(webCoords);
          } else if (Platform.OS !== "web") {
            const pos = await Location.getCurrentPositionAsync({});
            await locationService.updateLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy ?? undefined,
            });
          }
        } catch {
          const msg =
            "La preferencia se guardó, pero no pudimos enviar tu posición al servidor. Entra en Descubrir o vuelve a activar el interruptor.";
          if (Platform.OS === "web" && typeof window !== "undefined") {
            window.alert(msg);
          } else {
            Alert.alert("Ubicación", msg);
          }
        }
      }
    } catch {
      Alert.alert("Error", "No se pudo cambiar la configuración de ubicación");
      setLocationEnabled(!value);
    } finally {
      setUpdatingLocation(false);
    }
  };

  const handleSaveVisibility = async () => {
    setSavingVisibility(true);
    try {
      await profileService.updateProfile({ showLastSeen, showDistance });
      setVisibilityModal(false);
      Alert.alert("¡Listo!", "Configuración de visibilidad actualizada");
    } catch {
      Alert.alert("Error", "No se pudo guardar la visibilidad");
    } finally {
      setSavingVisibility(false);
    }
  };

  const handleNotificationsToggle = async (value: boolean) => {
    if (!value) {
      // Cannot programmatically revoke — inform the user
      Alert.alert(
        "Desactivar notificaciones",
        "Para desactivarlas ve a los ajustes del dispositivo o navegador y revoca el permiso de notificaciones para esta app.",
        [{ text: "Entendido" }]
      );
      return;
    }
    setUpdatingNotif(true);
    try {
      if (Platform.OS === "web") {
        if (typeof Notification === "undefined") {
          Alert.alert(
            "No disponible",
            "Este navegador no soporta notificaciones."
          );
          return;
        }
        const permission = await (Notification as any).requestPermission();
        const granted = permission === "granted";
        setNotifEnabled(granted);
        if (granted) {
          Alert.alert(
            "Notificaciones activadas",
            "Recibirás notificaciones cuando alguien te escriba o tenga un match contigo."
          );
        } else {
          Alert.alert(
            "Permiso denegado",
            "El navegador bloqueó las notificaciones. Puedes cambiar esto en los ajustes del sitio."
          );
        }
      } else {
        if (!shouldLoadExpoNotifications()) {
          Alert.alert(
            "Expo Go",
            "Las notificaciones push no están disponibles en Expo Go (Android). Usa un development build (EAS) para probarlas.",
            [{ text: "Entendido" }]
          );
          return;
        }
        const Notifications = await loadExpoNotifications();
        if (!Notifications) {
          Alert.alert("No disponible", "No se pudo cargar el módulo de notificaciones.");
          return;
        }
        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        const granted = finalStatus === "granted";
        setNotifEnabled(granted);
        if (granted) {
          Alert.alert(
            "Notificaciones activadas",
            "Recibirás notificaciones cuando alguien te escriba o tenga un match contigo."
          );
        } else {
          Alert.alert(
            "Permiso denegado",
            "Para recibir notificaciones activa el permiso en los Ajustes del dispositivo."
          );
        }
      }
    } catch {
      Alert.alert("Error", "No se pudo solicitar el permiso de notificaciones");
    } finally {
      setUpdatingNotif(false);
    }
  };

  const handleIncognitoToggle = async (value: boolean) => {
    setUpdatingIncognito(true);
    try {
      await profileService.toggleIncognitoMode(value, value ? 24 : undefined);
      setIncognito(value);
      Alert.alert(
        value ? "Modo incógnito activado" : "Modo incógnito desactivado",
        value
          ? "Navegarás sin aparecer en el descubrimiento de otros usuarios por 24 h"
          : "Tu perfil vuelve a ser visible en el descubrimiento"
      );
    } catch {
      Alert.alert("Error", "No se pudo cambiar el modo incógnito");
    } finally {
      setUpdatingIncognito(false);
    }
  };

  const handleSaveFilters = async (dist: number, showTo: string) => {
    setSavingFilters(true);
    try {
      await profileService.updateProfile({ maxDistance: dist, showMeTo: showTo });
      setMaxDistance(dist);
      setShowMeTo(showTo);
      setFiltersModal(false);
      Alert.alert("¡Listo!", "Filtros de descubrimiento actualizados");
    } catch {
      Alert.alert("Error", "No se pudieron guardar los filtros");
    } finally {
      setSavingFilters(false);
    }
  };

  const doDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const res = await authService.deleteAccount();
      await logout();
      const label = res.recoverableUntil
        ? (() => {
            try {
              return new Date(res.recoverableUntil).toLocaleDateString("es-CO", {
                day: "numeric",
                month: "long",
                year: "numeric",
              });
            } catch {
              return "";
            }
          })()
        : "";
      if (Platform.OS === "web") {
        window.alert(
          label
            ? `Cuenta eliminada (periodo de gracia).\n\nHasta el ${label} puedes recuperarla o empezar de cero con el mismo correo al iniciar sesión. Pasado ese plazo, la eliminación es permanente.`
            : res.message
        );
      } else {
        Alert.alert(
          "Cuenta eliminada",
          label
            ? `Hasta el ${label} puedes recuperar tu cuenta con todos tus datos o empezar de cero con el mismo correo al iniciar sesión. Pasado ese plazo, la eliminación es permanente.`
            : res.message
        );
      }
    } catch {
      Alert.alert("Error", "No se pudo eliminar la cuenta. Inténtalo de nuevo.");
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleDeleteAccount = () => {
    if (Platform.OS === "web") {
      const ok = window.confirm(
        "Eliminar cuenta\n\nTu perfil dejará de mostrarse. Durante 30 días podrás recuperarla al iniciar sesión o empezar de cero con el mismo correo. Pasado ese plazo, tus datos se eliminan de forma permanente.\n\n¿Continuar?"
      );
      if (ok) doDeleteAccount();
    } else {
      Alert.alert(
        "Eliminar cuenta",
        "Tu cuenta quedará en periodo de gracia de 30 días: en ese plazo puedes recuperarla con tu perfil y mensajes al iniciar sesión, o empezar de cero (borrar todo y registrarte otra vez con el mismo correo). Pasados los 30 días, los datos se eliminan de forma permanente.\n\n¿Seguro que deseas continuar?",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Eliminar cuenta", style: "destructive", onPress: doDeleteAccount },
        ]
      );
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === "web") {
      const ok = window.confirm("¿Cerrar sesión? Tendrás que volver a iniciar sesión.");
      if (ok) { try { await logout(); } catch { /* ignorar */ } }
    } else {
      Alert.alert(
        "Cerrar sesión",
        "¿Estás seguro que deseas cerrar sesión?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Cerrar sesión",
            style: "destructive",
            onPress: async () => { try { await logout(); } catch { /* ignorar */ } },
          },
        ]
      );
    }
  };

  const showComingSoon = () =>
    Alert.alert("Próximamente", "Esta función estará disponible pronto");

  const confirmRevokeReport = (t: ReportTargetRow) => {
    const run = async () => {
      try {
        await revokeReportToUser(t.reportedUserId);
        setReportTargets((prev) => prev.filter((x) => x.reportedUserId !== t.reportedUserId));
        Alert.alert("", "Reporte retirado. Esta persona volverá a mostrarse para ti cuando corresponda.");
      } catch (e) {
        Alert.alert("Error", reportErrorMessage(e));
      }
    };
    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm(`¿Retirar el reporte a ${t.name}?`)) void run();
      return;
    }
    Alert.alert(
      "Deshacer reporte",
      `¿Retirar el reporte a ${t.name}? Podrás volver a ver su perfil y conversación en la lista.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Retirar", style: "destructive", onPress: () => void run() },
      ]
    );
  };

  const showMeToLabel =
    SHOW_ME_TO_OPTIONS.find((o) => o.value === showMeTo)?.label ?? "Todos";

  return (
    <View style={styles.screen}>
      {/* ─── Header ───────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Ajustes</Text>
          <Text style={styles.headerSub}>Configuración de tu cuenta</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ─── Cuenta ──────────────────────────────────────────── */}
        <SectionTitle title="Cuenta" />
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.accountRow}
            onPress={() => navigation.navigate("CreateProfile")}
            activeOpacity={0.8}
          >
            <View style={styles.accountAvatar}>
              <Ionicons name="person" size={22} color={colors.primary} />
            </View>
            <View style={styles.accountTexts}>
              <Text style={styles.accountEmail} numberOfLines={1}>
                {user?.email ?? "—"}
              </Text>
              <View style={styles.verifiedRow}>
                <Ionicons
                  name={user?.verified ? "shield-checkmark" : "shield-outline"}
                  size={13}
                  color={user?.verified ? "#06D6A0" : "rgba(162,155,254,0.4)"}
                />
                <Text style={[styles.verifiedText, user?.verified && styles.verifiedTextActive]}>
                  {user?.verified ? "Cuenta verificada" : "Sin verificar"}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="rgba(162,155,254,0.3)" />
          </TouchableOpacity>
        </View>

        {/* ─── Apariencia ───────────────────────────────────── */}
        <SectionTitle title="Apariencia" />
        <View style={styles.card}>
          <SettingsRow
            icon={isDark ? "moon" : "sunny"}
            label="Modo oscuro"
            desc={isDark ? "Tema oscuro activado" : "Tema claro activado"}
            right={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: "rgba(162,155,254,0.15)", true: "rgba(108,92,231,0.5)" }}
                thumbColor={isDark ? colors.primary : "rgba(255,255,255,0.4)"}
              />
            }
          />
        </View>

        {/* ─── Privacidad (incluye ubicación: manual) ───────────────────── */}
        <SectionTitle title="Privacidad" />
        <View style={styles.card}>
          <SettingsRow
            icon={locationEnabled ? "location" : "location-outline"}
            label="Compartir ubicación"
            desc={
              locationEnabled
                ? Platform.OS === "web"
                  ? "Distancia en Descubrir y mapa de planes (~1 km). En web el navegador debe permitir ubicación; al activar aquí enviamos tu posición aproximada al servidor."
                  : "Distancia aproximada en Descubrir y posición en mapa de planes (~1 km). Nunca se envía tu punto exacto a otros."
                : "Sin ubicación no verás distancias ni aparecerás en el mapa de planes. Puedes seguir usando el resto de la app."
            }
            right={
              loadingLocation || updatingLocation ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Switch
                  value={locationEnabled}
                  onValueChange={handleLocationToggle}
                  trackColor={{ false: "rgba(162,155,254,0.15)", true: "rgba(108,92,231,0.5)" }}
                  thumbColor={locationEnabled ? colors.primary : "rgba(255,255,255,0.4)"}
                />
              )
            }
          />
          <Divider />
          <SettingsRow
            icon={incognito ? "glasses" : "glasses-outline"}
            label="Modo Incógnito"
            desc={incognito ? "Activo · no apareces en descubrimiento" : "Navega sin ser visto (24 h)"}
            right={
              updatingIncognito ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Switch
                  value={incognito}
                  onValueChange={handleIncognitoToggle}
                  trackColor={{ false: "rgba(162,155,254,0.15)", true: "rgba(108,92,231,0.5)" }}
                  thumbColor={incognito ? colors.primary : "rgba(255,255,255,0.4)"}
                />
              )
            }
          />
          <Divider />
          <SettingsRow
            icon="eye-outline"
            label="Visibilidad del perfil"
            desc={`Última vez: ${showLastSeen ? "visible" : "oculta"} · Distancia: ${showDistance ? "visible" : "oculta"}`}
            onPress={() => setVisibilityModal(true)}
          />
          <Divider />
          <SettingsRow
            icon={notifEnabled ? "notifications" : "notifications-outline"}
            label="Notificaciones"
            desc={
              Platform.OS !== "web" && !shouldLoadExpoNotifications()
                ? "No disponibles en Expo Go — usa development build"
                : notifEnabled
                  ? "Permiso concedido · recibirás alertas"
                  : "Toca para solicitar permiso"
            }
            right={
              loadingNotif || updatingNotif ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Switch
                  value={notifEnabled}
                  onValueChange={handleNotificationsToggle}
                  disabled={Platform.OS !== "web" && !shouldLoadExpoNotifications()}
                  trackColor={{ false: "rgba(162,155,254,0.15)", true: "rgba(108,92,231,0.5)" }}
                  thumbColor={notifEnabled ? colors.primary : "rgba(255,255,255,0.4)"}
                />
              )
            }
          />
        </View>

        {/* ─── Reportes ─────────────────────────────────────── */}
        <SectionTitle title="Reportes" />
        <View style={styles.card}>
          {loadingReportTargets ? (
            <ActivityIndicator style={{ paddingVertical: 20 }} color={colors.primary} />
          ) : reportTargets.length === 0 ? (
            <Text
              style={{
                paddingHorizontal: 14,
                paddingVertical: 16,
                fontSize: 13,
                color: theme.textSub,
                lineHeight: 19,
              }}
            >
              No tienes reportes activos. Si reportas un perfil, podrás deshacerlo aquí.
            </Text>
          ) : (
            reportTargets.map((t, i) => (
              <View key={t.reportedUserId}>
                {i > 0 ? <Divider /> : null}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 13,
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 11,
                      backgroundColor: "rgba(239,71,111,0.12)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="flag-outline" size={18} color={colors.error} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, color: theme.text, fontWeight: "600" }} numberOfLines={1}>
                      {t.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.textSub, marginTop: 2 }}>Oculto para ti</Text>
                  </View>
                  <TouchableOpacity onPress={() => confirmRevokeReport(t)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>Deshacer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ─── Descubrimiento ───────────────────────────────── */}
        <SectionTitle title="Descubrimiento" />
        <View style={styles.card}>
          <SettingsRow
            icon="options-outline"
            label="Filtros de búsqueda"
            desc={`Distancia: ${maxDistance} km · Programa, semestre`}
            onPress={() => setFiltersModal(true)}
          />
          <Divider />
          <SettingsRow
            icon="people-outline"
            label="Mostrarme a"
            desc={showMeToLabel}
            onPress={() => setFiltersModal(true)}
          />
          <Divider />
          <SettingsRow
            icon="navigate-circle-outline"
            label="Distancia máxima"
            desc={`${maxDistance} km`}
            onPress={() => setFiltersModal(true)}
          />
        </View>

        {/* ─── Información ──────────────────────────────────── */}
        <SectionTitle title="Información" />
        <View style={styles.card}>
          <SettingsRow
            icon="document-text-outline"
            label="Términos y Condiciones"
            onPress={() => navigation.navigate('Terms', { readOnly: true, tab: 'Términos y Condiciones' })}
          />
          <Divider />
          <SettingsRow
            icon="lock-closed-outline"
            label="Política de Privacidad"
            onPress={() => navigation.navigate('Terms', { readOnly: true, tab: 'Privacidad' })}
          />
          <Divider />
          <SettingsRow
            icon="help-circle-outline"
            label="Ayuda y Soporte"
            onPress={showComingSoon}
          />
          <Divider />
          <SettingsRow
            icon="star-outline"
            label="Calificar la app"
            onPress={showComingSoon}
          />
        </View>

        {/* ─── Versión ──────────────────────────────────────── */}
        <View style={styles.versionRow}>
          <Text style={styles.versionText}>Kora Nova v1.0.0</Text>
          <Text style={styles.versionText}>Pascual Bravo · 2026</Text>
        </View>

        {/* ─── Zona de peligro ──────────────────────────────── */}
        <SectionTitle title="Zona de peligro" />
        <View style={styles.card}>
          <SettingsRow
            icon="trash-outline"
            label="Eliminar cuenta"
            desc="30 días para recuperarla; después se borran tus datos de forma permanente"
            onPress={deletingAccount ? undefined : handleDeleteAccount}
            danger
            right={
              deletingAccount ? (
                <ActivityIndicator size="small" color="#EF476F" />
              ) : undefined
            }
          />
          <Divider />
          <SettingsRow
            icon="log-out-outline"
            label="Cerrar sesión"
            onPress={handleLogout}
            danger
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── Filters Modal ────────────────────────────────── */}
      <FiltersModal
        visible={filtersModal}
        onClose={() => setFiltersModal(false)}
        currentDistance={maxDistance}
        currentShowTo={showMeTo}
        onSave={handleSaveFilters}
      />

      {/* ─── Visibility Modal ─────────────────────────────── */}
      <Modal visible={visibilityModal} transparent animationType="slide" onRequestClose={() => setVisibilityModal(false)}>
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <View style={modal.handle} />
            <Text style={modal.title}>Visibilidad del perfil</Text>

            <View style={vModal.row}>
              <View style={vModal.rowTexts}>
                <Text style={vModal.label}>Mostrar "última vez activo"</Text>
                <Text style={vModal.desc}>Otros usuarios podrán ver cuándo estuviste activo</Text>
              </View>
              <Switch
                value={showLastSeen}
                onValueChange={setShowLastSeen}
                trackColor={{ false: "rgba(162,155,254,0.15)", true: "rgba(108,92,231,0.5)" }}
                thumbColor={showLastSeen ? colors.primary : "rgba(255,255,255,0.4)"}
              />
            </View>

            <View style={[vModal.row, { marginTop: 16 }]}>
              <View style={vModal.rowTexts}>
                <Text style={vModal.label}>Mostrar distancia</Text>
                <Text style={vModal.desc}>Tu distancia aproximada aparecerá en tu tarjeta</Text>
              </View>
              <Switch
                value={showDistance}
                onValueChange={setShowDistance}
                trackColor={{ false: "rgba(162,155,254,0.15)", true: "rgba(108,92,231,0.5)" }}
                thumbColor={showDistance ? colors.primary : "rgba(255,255,255,0.4)"}
              />
            </View>

            <TouchableOpacity
              style={[modal.saveBtn, savingVisibility && { opacity: 0.6 }]}
              onPress={handleSaveVisibility}
              disabled={savingVisibility}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={["#6C5CE7", "#FF6B8B"]}
                style={modal.saveBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {savingVisibility
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={modal.saveBtnText}>Guardar cambios</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setVisibilityModal(false)} style={modal.cancelBtn} activeOpacity={0.7}>
              <Text style={modal.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default SettingsScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────
const makeStyles = (theme: ReturnType<typeof import('../context/ThemeContext').useTheme>['theme']) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: theme.bg,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: theme.surface2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: theme.text },
  headerSub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  card: {
    backgroundColor: theme.surface,
    borderRadius: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "hidden",
  },

  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  accountAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(108,92,231,0.2)",
    borderWidth: 1.5,
    borderColor: "rgba(108,92,231,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  accountTexts: { flex: 1 },
  accountEmail: { fontSize: 14, color: theme.text, fontWeight: "600", marginBottom: 4 },
  verifiedRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  verifiedText: { fontSize: 12, color: "rgba(162,155,254,0.4)" },
  verifiedTextActive: { color: "#06D6A0", fontWeight: "600" },

  versionRow: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 4,
  },
  versionText: { fontSize: 12, color: "rgba(162,155,254,0.3)" },
});

// ─── Modal styles ─────────────────────────────────────────────────────────────
const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#16162A",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: "rgba(108,92,231,0.2)",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(162,155,254,0.25)",
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(162,155,254,0.6)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  optionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(108,92,231,0.12)",
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.25)",
  },
  chipActive: {
    backgroundColor: "rgba(108,92,231,0.4)",
    borderColor: "#6C5CE7",
  },
  chipText: { fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: "600" },
  chipTextActive: { color: "#FFFFFF" },
  optionsCol: { gap: 14 },
  radioRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(162,155,254,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterActive: { borderColor: "#6C5CE7" },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#6C5CE7",
  },
  radioLabel: { fontSize: 14, color: "#FFFFFF", fontWeight: "500" },
  saveBtn: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 28,
    shadowColor: "#6C5CE7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  saveBtnGradient: {
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  cancelBtn: { alignItems: "center", paddingTop: 14 },
  cancelText: { fontSize: 14, color: "rgba(162,155,254,0.6)", fontWeight: "600" },
});

const vModal = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(108,92,231,0.08)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.15)",
    gap: 12,
  },
  rowTexts: { flex: 1 },
  label: { fontSize: 14, color: "#FFFFFF", fontWeight: "600", marginBottom: 4 },
  desc: { fontSize: 12, color: "rgba(162,155,254,0.5)" },
});
