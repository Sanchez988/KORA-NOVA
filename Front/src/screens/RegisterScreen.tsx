import React, { useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Animated,
  Dimensions,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { ModernInput } from "../components/ModernInput";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { KoraNovaLogo } from "../components/KoraNovaLogo";
import { spacing, borderRadius } from "../theme/colors";
import { useTheme } from "../context/ThemeContext";
import { GOOGLE_CLIENT_ID } from "../config";
import { isExpoGoEmailOnlyLogin } from "../config/expoGoLogin";
import { sanitizeWebUrlAfterGoogleOAuth } from "../config/googleOAuth";
import { apiErrorDisplayMessage } from "../services/api";
import { REGISTER_TERMS_SECTIONS } from "../constants/legal";
import { KORA_BG } from "../design/koraNova";
import { NovaGradientButton } from "../components/nova/NovaGradientButton";
import type { Theme } from "../context/ThemeContext";
import { DatePickerInput } from "../components/DatePickerInput";

const { width } = Dimensions.get("window");

/** DatePickerInput usa DD/MM/AAAA; registro e API usan YYYY-MM-DD. */
function dobIsoToDisplay(iso: string): string {
  if (!iso) return "";
  if (iso.includes("/")) return iso;
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
}

function dobDisplayToIso(display: string): string {
  const parts = display.split("/");
  if (parts.length !== 3) return display;
  const [d, m, y] = parts.map((p) => String(p).padStart(2, "0"));
  return `${y}-${m}-${d}`;
}

// ─── Legal Modal (estilos según modo claro / oscuro) ─────────────────────────
const LegalModal = ({
  visible,
  onClose,
  title,
  sections,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  sections: { title: string; body: string }[];
  theme: Theme;
}) => {
  const modalStyles = useMemo(() => makeLegalModalStyles(theme), [theme]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <LinearGradient
            colors={["#6C5CE7", "#FF6B8B"]}
            style={modalStyles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={modalStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>
          <ScrollView style={modalStyles.body} showsVerticalScrollIndicator={false}>
            {sections.map((s, i) => (
              <View key={i} style={modalStyles.section}>
                <Text style={modalStyles.sectionTitle}>{s.title}</Text>
                <Text style={modalStyles.sectionBody}>{s.body}</Text>
              </View>
            ))}
            <View style={{ height: 32 }} />
          </ScrollView>
          <View style={modalStyles.footer}>
            <NovaGradientButton title="Entendido" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

function makeLegalModalStyles(theme: Theme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.isDark ? "rgba(0,0,0,0.7)" : "rgba(18,18,35,0.45)",
      justifyContent: "flex-end",
    },
    container: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      maxHeight: "85%",
      overflow: "hidden",
      borderTopWidth: 1,
      borderColor: theme.border,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    title: {
      fontSize: 17,
      fontWeight: "700",
      color: "#fff",
      flex: 1,
      paddingRight: 8,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.22)",
      alignItems: "center",
      justifyContent: "center",
    },
    body: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      backgroundColor: theme.surface,
    },
    section: { marginBottom: spacing.md },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.brandPurple,
      marginBottom: 6,
    },
    sectionBody: {
      fontSize: 13,
      color: theme.textSub,
      lineHeight: 20,
    },
    footer: {
      padding: spacing.lg,
      backgroundColor: theme.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
    },
  });
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
const RegisterScreen = ({ navigation, route }: any) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(theme, isDark), [theme, isDark]);
  const expoGoEmailOnly = useMemo(() => isExpoGoEmailOnlyLogin(), []);
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState(() => (route?.params?.initialEmail as string | undefined)?.trim() ?? "");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const { register, googleLogin } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 650, useNativeDriver: true }),
    ]).start();
  }, []);

  const maxDobDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    d.setHours(12, 0, 0, 0);
    return d;
  }, []);

  const maxDateISO = useMemo(() => maxDobDate.toISOString().split("T")[0], [maxDobDate]);

  const animateStep = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  };

  // Validate email domain
  const handleContinue = () => {
    setErrorMsg("");
    if (!email.trim()) {
      setErrorMsg("Ingresa tu correo institucional");
      return;
    }
    if (!email.toLowerCase().endsWith("@pascualbravo.edu.co")) {
      setErrorMsg("Debes usar un correo @pascualbravo.edu.co");
      return;
    }
    if (!acceptedTerms) {
      setErrorMsg("Debes aceptar los terminos y condiciones");
      return;
    }
    animateStep();
    setStep(2);
  };

  const isAdult = (d: string) => {
    if (!d) return false;
    const today = new Date();
    const birth = new Date(d);
    if (Number.isNaN(birth.getTime())) return false;
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 18;
  };

  const handleRegister = async () => {
    setErrorMsg("");
    if (!dateOfBirth) { setErrorMsg("Ingresa tu fecha de nacimiento"); return; }
    if (!isAdult(dateOfBirth)) { setErrorMsg("Debes ser mayor de 18 anos"); return; }
    if (!password) { setErrorMsg("Ingresa una contrasena"); return; }
    if (password.length < 8) { setErrorMsg("La contrasena debe tener al menos 8 caracteres"); return; }
    if (password !== confirmPassword) { setErrorMsg("Las contrasenas no coinciden"); return; }

    setLoading(true);
    try {
      const result = await register({ email, password, dateOfBirth });
      if (result?.devMode) {
        navigation.navigate("Login");
      } else {
        navigation.navigate("VerifyEmail", { email });
      }
    } catch (error: unknown) {
      const err = error as {
        response?: { status?: number; data?: { code?: string; recoverableUntil?: string; message?: string } };
      };
      if (
        err.response?.status === 409 &&
        err.response?.data?.code === "ACCOUNT_IN_RECOVERY"
      ) {
        const until = err.response?.data?.recoverableUntil;
        const label = until
          ? (() => {
              try {
                return new Date(until).toLocaleDateString("es-CO", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                });
              } catch {
                return "";
              }
            })()
          : "";
        setErrorMsg(
          label
            ? `Este correo tiene una cuenta eliminada que puedes recuperar hasta el ${label}. Inicia sesión y elige recuperar o empezar de cero.`
            : (err.response?.data?.message ?? apiErrorDisplayMessage(error))
        );
      } else {
        setErrorMsg(apiErrorDisplayMessage(error));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (idToken: string) => {
    setErrorMsg("");
    setGoogleLoading(true);
    try {
      await googleLogin(idToken);
      sanitizeWebUrlAfterGoogleOAuth();
    } catch (error: unknown) {
      setErrorMsg(apiErrorDisplayMessage(error));
    } finally {
      setGoogleLoading(false);
    }
  };

  const renderDateInput = () => {
    if (Platform.OS === "web") {
      return (
        <input
          type="date"
          value={dateOfBirth}
          max={maxDateISO}
          onChange={(e: any) => setDateOfBirth(e.target.value)}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            fontSize: 15,
            color: dateOfBirth ? "#FFFFFF" : "rgba(162,155,254,0.5)",
            backgroundColor: "transparent",
            height: "100%",
            cursor: "pointer",
            fontFamily: "inherit",
            colorScheme: "dark",
          } as any}
        />
      );
    }
    return (
      <DatePickerInput
        value={dobIsoToDisplay(dateOfBirth)}
        onChange={(v) => setDateOfBirth(dobDisplayToIso(v))}
        placeholder="Toca para elegir fecha"
        maxDate={maxDobDate}
      />
    );
  };

  return (
    <View style={[styles.container, isDark && { backgroundColor: KORA_BG }]}>
      {/* Fondo marca en oscuro (#121223); halos sutiles solo en modo claro */}
      {!isDark ? (
        <>
          <LinearGradient
            colors={["#EFE9FF", "#F8F9FF", "#EDE9FC"]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.3, y: 0 }}
            end={{ x: 0.7, y: 1 }}
          />
          <LinearGradient
            colors={["rgba(108,92,231,0.18)", "transparent"]}
            style={styles.glowTopLeft}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <LinearGradient
            colors={["transparent", "rgba(255,107,139,0.14)"]}
            style={styles.glowBottomRight}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </>
      ) : null}

      {/* Back button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => {
          if (step === 2) { animateStep(); setStep(1); setErrorMsg(""); }
          else navigation.goBack();
        }}
      >
        <Ionicons name="chevron-back" size={22} color={isDark ? "#FFFFFF" : theme.textAccent} />
      </TouchableOpacity>

      <LegalModal
        visible={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        title="Terminos y Condiciones"
        sections={REGISTER_TERMS_SECTIONS}
        theme={theme}
      />

      <KeyboardAvoidingView
        style={{ flex: 1, width: "100%" }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.content,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Logo */}
            <View style={styles.logoSection}>
              <KoraNovaLogo size={Math.min(width * 0.55, 200)} showText showSlogan />
            </View>

            {/* Title */}
            <Text style={styles.title}>Crear cuenta</Text>
            <Text style={styles.subtitle}>Conéctate con lo que importa</Text>

            {/* Error */}
            {errorMsg ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={15} color="#FF6B8B" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* ── STEP 1 ── */}
            {step === 1 && (
              <View style={[styles.formSection, styles.formCard]}>
                {/* Email field */}
                <Text style={styles.fieldLabel}>Correo institucional</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={18} color="#A29BFE" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="correo@pascualbravo.edu.co"
                    placeholderTextColor="rgba(162,155,254,0.4)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <View style={styles.fieldHint}>
                  <Ionicons name="information-circle-outline" size={14} color="rgba(162,155,254,0.5)" />
                  <Text style={styles.fieldHintText}>
                    Usa tu correo institucional del{" "}
                    <Text style={styles.fieldHintBold}>Pascual Bravo.</Text>
                  </Text>
                </View>

                <NovaGradientButton
                  title="Continuar"
                  onPress={handleContinue}
                  iconRight={<Ionicons name="arrow-forward" size={18} color="#fff" />}
                  style={{ marginBottom: spacing.lg }}
                />

                {/* Divider + Google (omitido en Expo Go con EMAIL_ONLY — mismo código en la rama false) */}
                {!expoGoEmailOnly ? (
                  <>
                    <View style={styles.dividerRow}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>o</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    <View style={styles.googleWrapper}>
                      <GoogleSignInButton
                        clientId={GOOGLE_CLIENT_ID}
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

                {/* Terms */}
                <TouchableOpacity
                  style={styles.termsRow}
                  onPress={() => setAcceptedTerms(!acceptedTerms)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                    {acceptedTerms && <Ionicons name="checkmark" size={13} color="#fff" />}
                  </View>
                  <Text style={styles.termsText}>
                    Acepto los{" "}
                    <Text
                      style={styles.termsLink}
                      onPress={() => setShowTermsModal(true)}
                    >
                      terminos y condiciones
                    </Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
              <View style={[styles.formSection, styles.formCard]}>
                {/* Date of birth */}
                <Text style={styles.fieldLabel}>Fecha de nacimiento</Text>
                {Platform.OS === "web" ? (
                  <View style={styles.inputWrapper}>
                    <Ionicons name="calendar-outline" size={18} color="#A29BFE" style={styles.inputIcon} />
                    {renderDateInput()}
                  </View>
                ) : (
                  renderDateInput()
                )}
                {dateOfBirth && !isAdult(dateOfBirth) && (
                  <Text style={styles.fieldError}>Debes ser mayor de 18 anos</Text>
                )}

                {/* Password */}
                <ModernInput
                  label="Contrasena"
                  placeholder="Minimo 8 caracteres"
                  value={password}
                  onChangeText={setPassword}
                  isPassword
                  icon="lock-closed-outline"
                />

                {/* Confirm */}
                <ModernInput
                  label="Confirmar contrasena"
                  placeholder="Repite tu contrasena"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  isPassword
                  icon="lock-closed-outline"
                />

                <NovaGradientButton
                  title={loading ? "Creando cuenta..." : "Crear cuenta"}
                  onPress={handleRegister}
                  disabled={loading}
                  loading={loading}
                  style={{ marginBottom: spacing.lg }}
                  iconRight={
                    !loading ? (
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    ) : undefined
                  }
                />
              </View>
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <Ionicons name="shield-outline" size={15} color="rgba(162,155,254,0.35)" />
              <Text style={styles.footerText}>Solo para estudiantes del Pascual Bravo</Text>
              {step === 1 && (
                <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                  <Text style={styles.loginLink}>
                    Ya tienes cuenta?{" "}
                    <Text style={styles.loginLinkBold}>Inicia sesion</Text>
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

// ─── Screen Styles ────────────────────────────────────────────────────────────
const makeStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
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
  backBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 52 : 40,
    left: 18,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: isDark ? "rgba(30,30,56,0.88)" : "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: isDark ? "rgba(162,155,254,0.22)" : "rgba(108,92,231,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 100,
    paddingBottom: spacing.xxl,
  },
  content: { alignItems: "center" },

  logoSection: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: theme.text,
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: theme.textSub,
    marginBottom: spacing.lg,
    textAlign: "center",
  },

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

  formSection: { width: "100%" },
  formCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: isDark ? "rgba(162,155,254,0.18)" : "rgba(108,92,231,0.2)",
    backgroundColor: isDark ? "rgba(26,26,53,0.65)" : "rgba(255,255,255,0.75)",
    padding: spacing.lg,
    paddingTop: spacing.md,
  },

  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.border,
    paddingHorizontal: 14,
    height: 54,
    marginBottom: 6,
  },
  inputIcon: { marginRight: 10 },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: theme.text,
    height: "100%" as any,
  },
  dateInput: {
    flex: 1,
    fontSize: 15,
    color: theme.text,
    height: "100%" as any,
  },
  fieldHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: spacing.lg,
  },
  fieldHintText: {
    fontSize: 12,
    color: theme.textAccent,
  },
  fieldHintBold: {
    color: "#A29BFE",
    fontWeight: "600",
  },
  fieldError: {
    fontSize: 12,
    color: "#FF6B8B",
    marginTop: 2,
    marginBottom: 6,
    marginLeft: 4,
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: spacing.lg,
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

  googleWrapper: {
    width: "100%",
    alignItems: "center",
    marginBottom: 4,
  },
  googleInstitutionalHint: {
    fontSize: 12,
    color: theme.textMuted,
    textAlign: "center",
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    lineHeight: 17,
  },

  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 10,
    marginBottom: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "rgba(162,155,254,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#6C5CE7",
    borderColor: "#6C5CE7",
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: theme.textSub,
  },
  termsLink: {
    color: "#A29BFE",
    fontWeight: "600",
  },

  footer: {
    alignItems: "center",
    marginTop: spacing.xl,
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: theme.textMuted,
    marginTop: 4,
  },
  loginLink: {
    fontSize: 13,
    color: theme.textSub,
    marginTop: 2,
  },
  loginLinkBold: {
    color: theme.textAccent,
    fontWeight: "700",
  },
});

export default RegisterScreen;
