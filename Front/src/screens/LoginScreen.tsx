import React, { useState, useRef, useMemo } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { KoraNovaLogo } from "../components/KoraNovaLogo";
import { ModernInput } from "../components/ModernInput";
import { spacing, borderRadius } from "../theme/colors";
import { useTheme } from "../context/ThemeContext";
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  resolveApiUrl,
} from "../config";
import { isExpoGoEmailOnlyLogin } from "../config/expoGoLogin";
import { sanitizeWebUrlAfterGoogleOAuth } from "../config/googleOAuth";
import { NovaGradientButton } from "../components/nova/NovaGradientButton";
import { NovaOutlineButton } from "../components/nova/NovaOutlineButton";
import { KORA_BG } from "../design/koraNova";
import { apiErrorDisplayMessage } from "../services/api";
import { authService } from "../services/auth.service";
import { useScreenInsets } from "../utils/screenInsets";

const { width } = Dimensions.get("window");

const LoginScreen = ({ navigation, route }: any) => {
  const { fabTop, scrollBottom, insets, compact } = useScreenInsets();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const rdm = useMemo(() => makeRdmStyles(theme), [theme]);
  /** En Expo Go, `true` muestra sólo correo/clave (`EXPO_PUBLIC_EXPO_GO_EMAIL_ONLY`); Google queda detrás del condicional más abajo. */
  const expoGoEmailOnly = useMemo(() => isExpoGoEmailOnlyLogin(), []);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(() => isExpoGoEmailOnlyLogin());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // Modal de cuenta eliminada (periodo de gracia: recuperar o reiniciar)
  const [deletedModal, setDeletedModal] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [restartingFresh, setRestartingFresh] = useState(false);
  const [recoverableUntil, setRecoverableUntil] = useState<string | null>(null);
  const [pendingGoogleIdToken, setPendingGoogleIdToken] = useState<string | null>(null);

  const { googleLogin, login, hydrateSession } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 750, useNativeDriver: true }),
    ]).start();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const p = route?.params;
      if (!p || typeof p !== "object") return;
      let touched = false;
      if (typeof p.initialEmail === "string" && p.initialEmail.trim()) {
        setEmail(p.initialEmail.trim().toLowerCase());
        touched = true;
      }
      if (p.openDeletedRecovery) {
        setShowEmailForm(true);
        if (typeof p.recoverableUntil === "string") setRecoverableUntil(p.recoverableUntil);
        else setRecoverableUntil(null);
        setPendingGoogleIdToken(null);
        setDeletedModal(true);
        touched = true;
      }
      if (touched) {
        navigation.setParams({
          initialEmail: undefined,
          openDeletedRecovery: undefined,
          recoverableUntil: undefined,
        });
      }
    }, [route?.params, navigation])
  );

  const handleGoogleSuccess = async (idToken: string) => {
    setErrorMsg("");
    setGoogleLoading(true);
    try {
      await googleLogin(idToken);
      sanitizeWebUrlAfterGoogleOAuth();
    } catch (error: any) {
      if (
        error.response?.status === 410 ||
        error.response?.data?.code === "ACCOUNT_DELETED"
      ) {
        const data = error.response?.data;
        setRecoverableUntil(typeof data?.recoverableUntil === "string" ? data.recoverableUntil : null);
        if (typeof data?.email === "string") setEmail(data.email);
        setPendingGoogleIdToken(idToken);
        setDeletedModal(true);
        return;
      }
      const msg = apiErrorDisplayMessage(error);
      const isInstitutionalReject =
        error.response?.status === 403 &&
        /pascualbravo\.edu\.co|cuentas @pascualbravo|Solo se permiten/i.test(msg);
      setErrorMsg(
        isInstitutionalReject
          ? `${msg} Iniciá sesión en Google con la cuenta institucional de la universidad, no con Gmail (@gmail.com).`
          : msg
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      setErrorMsg("Ingresa tu correo y contraseña");
      return;
    }
    setErrorMsg("");
    setEmailLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const trimmedPassword = password.trimEnd();
      await login({ email: normalizedEmail, password: trimmedPassword });
    } catch (error: any) {
      // Cuenta eliminada — ofrecer reactivación
      if (
        error.response?.status === 410 ||
        error.response?.data?.code === 'ACCOUNT_DELETED'
      ) {
        const data = error.response?.data;
        setRecoverableUntil(typeof data?.recoverableUntil === 'string' ? data.recoverableUntil : null);
        if (typeof data?.email === 'string') setEmail(data.email);
        setPendingGoogleIdToken(null);
        setDeletedModal(true);
      } else {
        let msg = apiErrorDisplayMessage(error);
        if (error.response?.status === 401) {
          msg +=
            " Usa el correo institucional completo, igual que en «Crear cuenta» (p. ej. nombre.apellido@pascualbravo.edu.co); un correo abreviado no sirve. Si en la web entras con Google, en Expo Go (solo correo) necesitas la contraseña que definiste para ese correo.";
        } else if (!error.response && Platform.OS !== "web") {
          msg += " Sin respuesta del servidor. Revisa la línea «API (dev)» abajo y que el back esté en marcha; prueba npx expo start -c.";
        }
        setErrorMsg(msg);
      }
    } finally {
      setEmailLoading(false);
    }
  };

  const closeDeletedModal = () => {
    setDeletedModal(false);
    setRecoverableUntil(null);
    setPendingGoogleIdToken(null);
  };

  const recoveryDateLabel = (iso: string | null) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString("es-CO", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  const handleReactivate = async () => {
    if (pendingGoogleIdToken) {
      setReactivating(true);
      try {
        const res = await authService.reactivateGoogleDeleted(pendingGoogleIdToken);
        await hydrateSession(res);
        closeDeletedModal();
        sanitizeWebUrlAfterGoogleOAuth();
      } catch (error: unknown) {
        Alert.alert("No se pudo reactivar", apiErrorDisplayMessage(error));
      } finally {
        setReactivating(false);
      }
      return;
    }
    if (!email.trim() || !password) {
      Alert.alert("Datos incompletos", "Ingresa correo y contraseña para reactivar tu cuenta.");
      return;
    }
    setReactivating(true);
    try {
      const res = await authService.reactivateAccount({ email: email.trim(), password });
      await hydrateSession(res);
      closeDeletedModal();
    } catch (error: unknown) {
      Alert.alert("No se pudo reactivar", apiErrorDisplayMessage(error));
    } finally {
      setReactivating(false);
    }
  };

  const handleRestartFreshEmail = () => {
    if (!email.trim() || !password) {
      Alert.alert(
        "Datos incompletos",
        "Ingresa correo y contraseña para confirmar que eres tú; luego podrás registrarte de nuevo."
      );
      return;
    }
    const run = async () => {
      setRestartingFresh(true);
      try {
        await authService.restartFreshDeletedAccount({ email: email.trim(), password });
        const em = email.trim();
        closeDeletedModal();
        navigation.navigate("Register", { initialEmail: em });
        Alert.alert(
          "Listo",
          "Tu cuenta anterior quedó borrada. Completa el registro para empezar de cero con el mismo correo."
        );
      } catch (error: unknown) {
        Alert.alert("No se pudo reiniciar", apiErrorDisplayMessage(error));
      } finally {
        setRestartingFresh(false);
      }
    };
    if (Platform.OS === "web") {
      if (
        typeof window !== "undefined" &&
        window.confirm(
          "¿Borrar definitivamente esta cuenta? Perderás perfil, matches y mensajes anteriores. Luego te registras otra vez con el mismo correo."
        )
      ) {
        void run();
      }
      return;
    }
    Alert.alert(
      "Empezar de cero",
      "Se borrarán tu perfil, matches y mensajes del servidor. Después podrás registrarte otra vez con el mismo correo.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Sí, borrar todo", style: "destructive", onPress: () => void run() },
      ]
    );
  };

  const handleRestartFreshGoogle = () => {
    if (!pendingGoogleIdToken) return;
    const run = async () => {
      setRestartingFresh(true);
      try {
        const res = await authService.restartFreshGoogleDeleted(pendingGoogleIdToken);
        await hydrateSession(res);
        closeDeletedModal();
        sanitizeWebUrlAfterGoogleOAuth();
      } catch (error: unknown) {
        Alert.alert("No se pudo reiniciar", apiErrorDisplayMessage(error));
      } finally {
        setRestartingFresh(false);
      }
    };
    if (Platform.OS === "web") {
      if (
        typeof window !== "undefined" &&
        window.confirm(
          "¿Empezar de cero con Google? Se borrará tu cuenta anterior y crearás una nueva sin perfil previo."
        )
      ) {
        void run();
      }
      return;
    }
    Alert.alert(
      "Empezar de cero con Google",
      "Se borrará tu cuenta anterior y se creará una nueva. Deberás completar el perfil de nuevo.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Continuar", style: "destructive", onPress: () => void run() },
      ]
    );
  };

  const isDark = theme.isDark;
  const baseGradient = isDark
    ? (["#121223", "#1A1A35", "#121223"] as const)
    : (["#FFFFFF", "#F8F9FA", "#EDE9FC"] as const);
  const glowPurple = isDark
    ? (["rgba(108,92,231,0.35)", "transparent"] as const)
    : (["rgba(108,92,231,0.22)", "transparent"] as const);
  const glowPink = isDark
    ? (["transparent", "rgba(255,107,139,0.32)"] as const)
    : (["transparent", "rgba(255,107,139,0.22)"] as const);

  return (
    <View style={[styles.container, isDark && { backgroundColor: KORA_BG }]}>
      {!isDark && (
        <>
          <LinearGradient
            colors={baseGradient}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.3, y: 0 }}
            end={{ x: 0.7, y: 1 }}
          />
          <LinearGradient
            colors={glowPurple}
            style={styles.glowTopLeft}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <LinearGradient
            colors={glowPink}
            style={styles.glowBottomRight}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </>
      )}

      {typeof navigation.canGoBack === "function" && navigation.canGoBack() ? (
        <TouchableOpacity
          style={[styles.backFab, { top: fabTop }]}
          onPress={() => navigation.goBack()}
          hitSlop={14}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
      ) : null}

      <KeyboardAvoidingView
        style={{ flex: 1, width: "100%" }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: (compact ? insets.top + 16 : insets.top + 24) + spacing.md,
              paddingBottom: scrollBottom + spacing.md,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.content,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* ── Logo ── */}
            <View style={styles.logoSection}>
              <KoraNovaLogo size={Math.min(width * 0.6, 240)} showText showSlogan />
            </View>

            {/* ── Card (referencia Login: CTAs marca + contenido extendido) ── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Inicia sesión</Text>
              <Text style={styles.cardSubtitle}>Conéctate con lo que importa</Text>

              {/* Error */}
              {errorMsg ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={15} color="#FF6B8B" />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              {!expoGoEmailOnly ? (
                <>
                  <NovaGradientButton
                    title="Iniciar sesión"
                    onPress={() => {
                      setShowEmailForm(true);
                      setErrorMsg("");
                    }}
                  />
                  <View style={{ height: 12 }} />
                  <NovaOutlineButton
                    title="Crear cuenta"
                    onPress={() => navigation.navigate("Register")}
                  />
                  <View style={[styles.dividerRow, { marginTop: spacing.md }]}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>o</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  {/* Google — OAuth completo (no Expo Go EMAIL_ONLY).
                      Código preservado aquí para builds / desarrollo fuera del Store Client. */}
                  <View style={styles.googleWrapper}>
                    <GoogleSignInButton
                      clientId={GOOGLE_CLIENT_ID}
                      androidClientId={GOOGLE_ANDROID_CLIENT_ID}
                      iosClientId={GOOGLE_IOS_CLIENT_ID}
                      onSuccess={handleGoogleSuccess}
                      onError={(msg) => setErrorMsg(msg)}
                      loading={googleLoading}
                    />
                  </View>
                  <Text style={styles.googleInstitutionalHint}>
                    Con Google debe ser una cuenta institucional @pascualbravo.edu.co (el servidor rechaza Gmail).
                  </Text>
                </>
              ) : null}

              {(expoGoEmailOnly || showEmailForm) ? (
                <View style={[styles.emailForm, expoGoEmailOnly && { marginTop: spacing.xs }]}>
                  <ModernInput
                    label="Correo institucional"
                    placeholder="nombre.apellido@pascualbravo.edu.co"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    icon="mail-outline"
                  />
                  <Text style={styles.emailFieldHint}>
                    Debe ser el mismo correo completo que usaste al registrarte (no un abreviado tipo “an339@…”).
                  </Text>
                  <ModernInput
                    label="Contraseña"
                    placeholder="Tu contraseña"
                    value={password}
                    onChangeText={setPassword}
                    isPassword
                    icon="lock-closed-outline"
                  />
                  <TouchableOpacity
                    onPress={() => navigation.navigate("ForgotPassword")}
                    hitSlop={12}
                    style={{ alignSelf: "flex-end", marginBottom: 10, marginTop: 2 }}
                  >
                    <Text style={{ color: "#A29BFE", fontSize: 13, fontWeight: "600" }}>
                      ¿Olvidaste tu contraseña de Kora?
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.emailSubmitBtn, emailLoading && { opacity: 0.7 }]}
                    onPress={handleEmailLogin}
                    disabled={emailLoading}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={["#6C5CE7", "#FF6B8B"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.emailSubmitGradient}
                    >
                      <Text style={styles.emailSubmitText}>
                        {emailLoading ? "Ingresando..." : "Ingresar"}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : null}

              {expoGoEmailOnly ? (
                <>
                  <View style={{ height: 14 }} />
                  <NovaOutlineButton
                    title="Crear cuenta"
                    onPress={() => navigation.navigate("Register")}
                  />
                </>
              ) : null}

              <View style={styles.separator} />
              <Text style={styles.termsHint}>
                La primera vez en este dispositivo te pediremos confirmar los{" "}
                <Text
                  style={styles.termsLink}
                  onPress={() => navigation.navigate("Register")}
                >
                  términos y privacidad
                </Text>
                .
              </Text>
              {__DEV__ ? (
                <Text style={styles.devApiHint} selectable>
                  API (dev): {resolveApiUrl()}
                </Text>
              ) : null}
            </View>

            {/* ── Footer ── */}
            <View style={styles.footer}>
              <Ionicons name="shield-outline" size={16} color="rgba(162,155,254,0.4)" />
              <Text style={styles.footerLine}>Solo para estudiantes del Pascual Bravo</Text>
              <Text style={styles.footerEmail}>@pascualbravo.edu.co</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Modal: cuenta eliminada (30 días: recuperar o empezar de cero) ── */}
      <Modal
        visible={deletedModal}
        transparent
        animationType="fade"
        onRequestClose={closeDeletedModal}
      >
        <View style={rdm.overlay}>
          <View style={rdm.sheet}>
            <View style={rdm.iconWrap}>
              <Ionicons name="time-outline" size={34} color="#FDCB6E" />
            </View>

            <Text style={rdm.title}>Cuenta eliminada</Text>
            <Text style={rdm.body}>
              {recoveryDateLabel(recoverableUntil)
                ? `Tienes hasta el ${recoveryDateLabel(recoverableUntil)} para elegir una opción. `
                : "Tienes hasta 30 días desde la baja para elegir una opción. "}
              Puedes recuperar tu cuenta con tu perfil, matches y mensajes, o empezar de cero (se borra el
              historial en el servidor) y registrarte otra vez con el mismo correo
              {pendingGoogleIdToken ? " / con el mismo Google." : "."}{" "}
              Pasado ese plazo sin recuperarla, tus datos se eliminan de forma permanente.
            </Text>

            <TouchableOpacity
              style={[
                rdm.btnPrimary,
                (reactivating || restartingFresh) && { opacity: 0.7 },
              ]}
              onPress={handleReactivate}
              disabled={reactivating || restartingFresh}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#6C5CE7", "#A29BFE"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={rdm.btnGradient}
              >
                {reactivating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={18} color="#fff" />
                    <Text style={rdm.btnPrimaryText}>
                      {pendingGoogleIdToken ? "Recuperar con Google" : "Recuperar mi cuenta"}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                rdm.btnSecondary,
                (reactivating || restartingFresh) && { opacity: 0.7 },
              ]}
              onPress={pendingGoogleIdToken ? handleRestartFreshGoogle : handleRestartFreshEmail}
              disabled={reactivating || restartingFresh}
              activeOpacity={0.8}
            >
              {restartingFresh && !reactivating ? (
                <ActivityIndicator color="#FF6B8B" size="small" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color="#FF6B8B" />
                  <Text style={rdm.btnSecondaryText}>
                    {pendingGoogleIdToken
                      ? "Empezar de cero con Google"
                      : "Empezar de cero (borrar y registrarme)"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={rdm.cancelBtn}
              onPress={closeDeletedModal}
              activeOpacity={0.7}
            >
              <Text style={rdm.cancelText}>Ahora no</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const makeStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  glowTopLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "65%",
    height: "45%",
  },
  glowBottomRight: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: "65%",
    height: "50%",
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  content: {
    alignItems: "center",
  },

  backFab: {
    position: "absolute",
    top: 0,
    left: 18,
    zIndex: 20,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.isDark ? "rgba(30,30,56,0.88)" : "rgba(255,255,255,0.94)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.isDark ? "rgba(162,155,254,0.22)" : "rgba(108,92,231,0.22)",
  },

  // Logo
  logoSection: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },

  // Card
  card: {
    backgroundColor: theme.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    width: "100%",
    alignItems: "center",
    shadowColor: "#6C5CE7",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 28,
    elevation: 14,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.text,
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13,
    color: theme.textAccent,
    marginBottom: spacing.lg,
    textAlign: "center",
  },

  // Error
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(239,71,111,0.1)",
    borderRadius: borderRadius.sm,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(239,71,111,0.3)",
    width: "100%",
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: "#FF6B8B",
    lineHeight: 18,
  },

  // Google
  googleWrapper: {
    width: "100%",
    alignItems: "center",
    marginBottom: 4,
  },
  googleInstitutionalHint: {
    fontSize: 12,
    color: theme.textMuted,
    textAlign: "center",
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    lineHeight: 17,
  },

  // Divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.border,
  },
  dividerText: {
    fontSize: 13,
    color: theme.textAccent,
    fontWeight: "500",
  },

  // Email row
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingVertical: 12,
    gap: 10,
  },
  emailRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(108,92,231,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  emailRowText: {
    flex: 1,
    fontSize: 14,
    color: theme.text,
    fontWeight: "500",
  },

  // Email form (expanded)
  emailForm: {
    width: "100%",
    marginTop: 4,
    marginBottom: 8,
  },
  emailSubmitBtn: {
    width: "100%",
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    marginTop: 4,
  },
  emailSubmitGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  emailSubmitText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.4,
  },

  // Separator
  separator: {
    width: "100%",
    height: 1,
    backgroundColor: theme.border,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },

  termsHint: {
    width: "100%",
    fontSize: 12,
    lineHeight: 17,
    color: theme.textSub,
    textAlign: "center",
    paddingHorizontal: spacing.xs,
  },
  termsLink: {
    color: "#A29BFE",
    fontWeight: "600",
  },
  devApiHint: {
    width: "100%",
    marginTop: 10,
    fontSize: 10,
    lineHeight: 14,
    color: "rgba(162,155,254,0.55)",
    textAlign: "center",
  },
  emailFieldHint: {
    width: "100%",
    fontSize: 12,
    lineHeight: 17,
    color: "rgba(162,155,254,0.65)",
    marginTop: -4,
    marginBottom: 10,
  },

  // Footer
  footer: {
    alignItems: "center",
    marginTop: spacing.xl,
    gap: 4,
  },
  footerLine: {
    fontSize: 12,
    color: theme.textMuted,
    marginTop: 4,
    textAlign: "center",
  },
  footerEmail: {
    fontSize: 12,
    color: theme.textAccent,
    fontWeight: "500",
    textAlign: "center",
  },
});

const makeRdmStyles = (theme: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,107,139,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 8,
    textAlign: "center",
  },
  body: {
    fontSize: 14,
    color: theme.textSub,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  btnPrimary: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
  },
  btnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
  },
  btnPrimaryText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  btnSecondary: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255,107,139,0.4)",
    marginBottom: 12,
  },
  btnSecondaryText: {
    color: "#FF6B8B",
    fontSize: 15,
    fontWeight: "600",
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  cancelText: {
    fontSize: 14,
    color: theme.textMuted,
  },
});

export default LoginScreen;
