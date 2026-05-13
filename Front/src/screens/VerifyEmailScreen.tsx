import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  TextInput,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { authService } from "../services/auth.service";
import { apiErrorDisplayMessage } from "../services/api";
import { colors, spacing, borderRadius } from "../theme/colors";
import { useScreenInsets } from "../utils/screenInsets";

const VerifyEmailScreen = ({ route, navigation }: any) => {
  const { scrollBottom, insets } = useScreenInsets();
  const { email, verificationCode: initialVerificationCode, codeDelivery } = route.params || {};
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, []);

  React.useEffect(() => {
    const v = typeof initialVerificationCode === "string" ? initialVerificationCode.trim() : "";
    if (v) setCode(v.toUpperCase());
  }, [initialVerificationCode]);

  const handleVerify = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    if (!code.trim()) {
      setErrorMsg("Por favor ingresa el codigo de verificacion");
      return;
    }
    setLoading(true);
    try {
      await authService.verifyEmail(code.trim().toUpperCase());
      setSuccessMsg("Correo verificado. Ahora puedes iniciar sesion.");
      setTimeout(() => navigation.navigate("Login"), 1500);
    } catch (error: unknown) {
      setErrorMsg(apiErrorDisplayMessage(error) || "Codigo invalido o expirado");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const data = await authService.resendVerificationEmail(email);
      if (typeof data?.verificationCode === "string" && data.verificationCode.trim()) {
        setCode(data.verificationCode.trim().toUpperCase());
      }
      if (data?.codeDelivery === "in_app") {
        setSuccessMsg(
          "No se pudo enviar el correo. El codigo quedo rellenado arriba; usalo para verificar."
        );
      } else if (data?.codeDelivery === "both") {
        setSuccessMsg("Codigo reenviado por correo y mostrado aqui tambien.");
      } else {
        setSuccessMsg("Codigo reenviado. Revisa tu bandeja de entrada y spam.");
      }
    } catch (error: unknown) {
      setErrorMsg(apiErrorDisplayMessage(error) || "No se pudo reenviar el correo");
    } finally {
      setResending(false);
    }
  };

  return (
    <LinearGradient
      colors={colors.gradient.ocean as any}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: spacing.lg,
              paddingTop: insets.top + spacing.lg,
              paddingBottom: scrollBottom + spacing.lg,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="mail" size={36} color="#fff" />
            </View>
            <Text style={styles.title}>Verifica tu correo</Text>
            <Text style={styles.subtitle}>
              {codeDelivery === "in_app" || initialVerificationCode
                ? "El codigo llego por la app (y por correo si tu servidor lo envio). Revisa tambien spam.\n"
                : "Enviamos un codigo de 6 digitos a\n"}
              <Text style={styles.emailText}>{email || "tu correo"}</Text>
            </Text>
            {(codeDelivery === "both" || codeDelivery === "in_app" || initialVerificationCode) && (
              <View style={styles.inAppHint}>
                <Ionicons name="phone-portrait-outline" size={16} color="rgba(255,255,255,0.95)" />
                <Text style={styles.inAppHintText}>
                  Si el correo no llega, el codigo puede completarse desde la respuesta segura de la app.
                </Text>
              </View>
            )}
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.label}>Codigo de verificacion</Text>
            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={(t) => { setCode(t.toUpperCase()); setErrorMsg(""); }}
              placeholder="ABC123"
              placeholderTextColor="rgba(18,18,35,0.35)"
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            {errorMsg ? (
              <View style={styles.msgBox}>
                <Ionicons name="alert-circle-outline" size={15} color={colors.error} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}
            {successMsg ? (
              <View style={[styles.msgBox, styles.successBox]}>
                <Ionicons name="checkmark-circle-outline" size={15} color={colors.success} />
                <Text style={styles.successText}>{successMsg}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleVerify}
              disabled={loading}
              activeOpacity={0.85}
              style={styles.btnWrapper}
            >
              <LinearGradient
                colors={colors.gradient.secondary as any}
                style={styles.btn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.btnText}>
                  {loading ? "Verificando..." : "Verificar correo"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleResend} disabled={resending} style={styles.resendRow}>
              <Ionicons name="refresh-outline" size={15} color={colors.secondary} />
              <Text style={styles.resendText}>
                {resending ? "Reenviando..." : "Reenviar codigo"}
              </Text>
            </TouchableOpacity>

            <View style={styles.noteBox}>
              <Ionicons name="information-circle-outline" size={15} color={colors.text.tertiary} />
              <Text style={styles.noteText}>
                Si no ves el correo, revisa tu carpeta de spam o correo no deseado.
              </Text>
            </View>

            <TouchableOpacity onPress={() => navigation.navigate("Login")} style={styles.backLink}>
              <Text style={styles.backLinkText}>Volver al inicio de sesion</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  inner: { alignItems: "center" },

  header: { alignItems: "center", marginBottom: spacing.xl },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 30,
    color: "#fff",
    fontWeight: "800",
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 22,
  },
  emailText: { fontWeight: "700", color: "#fff" },
  inAppHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: borderRadius.md,
    maxWidth: 340,
  },
  inAppHintText: {
    flex: 1,
    fontSize: 13,
    color: "rgba(255,255,255,0.95)",
    lineHeight: 18,
  },

  card: {
    width: "100%",
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  codeInput: {
    backgroundColor: "#F8F9FA",
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 8,
    /** texto oscuro sobre fondo claro (primary es blanco y aquí quedaba invisible) */
    color: colors.text.inverse,
    textAlign: "center",
    marginBottom: spacing.sm,
  },

  msgBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF0F3",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: "#EF476F40",
  },
  successBox: {
    backgroundColor: "#F0FFF8",
    borderColor: "#06D6A040",
  },
  errorText: { fontSize: 13, color: colors.error, flex: 1 },
  successText: { fontSize: 13, color: colors.success, flex: 1 },

  btnWrapper: { marginBottom: spacing.md },
  btn: {
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: spacing.md,
  },
  resendText: { fontSize: 14, color: colors.secondary, fontWeight: "600" },

  noteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 10,
    marginBottom: spacing.md,
  },
  noteText: {
    fontSize: 12,
    color: "rgba(18,18,35,0.55)",
    flex: 1,
    lineHeight: 17,
  },

  backLink: { alignItems: "center" },
  backLinkText: { fontSize: 14, color: colors.text.secondary },
});

export default VerifyEmailScreen;
