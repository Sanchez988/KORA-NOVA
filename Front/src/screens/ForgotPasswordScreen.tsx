import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { ModernInput } from "../components/ModernInput";
import { NovaGradientButton } from "../components/nova/NovaGradientButton";
import { authService } from "../services/auth.service";
import { apiErrorDisplayMessage } from "../services/api";
import { spacing } from "../theme/colors";
import { useScreenInsets } from "../utils/screenInsets";
import { wakeBackendHealth } from "../utils/wakeBackendHealth";

export default function ForgotPasswordScreen({ navigation }: { navigation: any }) {
  const { scrollBottom, insets } = useScreenInsets();
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [step, setStep] = useState<"email" | "reset">("email");
  const [loading, setLoading] = useState(false);

  const goResetStep = () => setStep("reset");

  const requestCode = async () => {
    const e = email.trim().toLowerCase();
    if (!e) {
      Alert.alert("Correo", "Ingresa tu correo institucional.");
      return;
    }
    setLoading(true);
    try {
      await wakeBackendHealth(90000);
      const res = await authService.requestPasswordReset(e);
      if (typeof res.devResetCode === "string" && res.devResetCode.length > 0) {
        setCode(res.devResetCode);
        const inApp = res.codeDelivery === "in_app";
        Alert.alert(
          inApp ? "Código en la app" : "Código de recuperación",
          inApp
            ? `No se envió correo (SMTP no configurado o error). Tu código es:\n\n${res.devResetCode}\n\nCaduca en 1 hora. Pulsa Continuar e introdúcelo abajo.`
            : `Tu código es: ${res.devResetCode}\n\nTambién deberías haberlo recibido por correo si el servidor tiene email configurado.`,
          [{ text: "Continuar", onPress: goResetStep }]
        );
      } else {
        Alert.alert(
          "Solicitud registrada",
          "Si existe una cuenta con ese correo, recibirás un código por correo en unos minutos (revisa spam).",
          [{ text: "Tengo el código", onPress: goResetStep }]
        );
      }
    } catch (err) {
      Alert.alert("Error", apiErrorDisplayMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async () => {
    const e = email.trim().toLowerCase();
    if (!e || !code.trim()) {
      Alert.alert("Datos incompletos", "Correo y código son obligatorios.");
      return;
    }
    if (!newPassword || newPassword !== confirm) {
      Alert.alert("Contraseña", "Escribe la nueva contraseña dos veces igual.");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Contraseña", "Mínimo 8 caracteres.");
      return;
    }
    setLoading(true);
    try {
      await wakeBackendHealth(90000);
      await authService.resetPassword(e, code.trim(), newPassword);
      Alert.alert("Listo", "Ya puedes iniciar sesión con la nueva contraseña.", [
        { text: "OK", onPress: () => navigation.navigate("Login") },
      ]);
    } catch (err) {
      Alert.alert("Error", apiErrorDisplayMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 40, paddingBottom: scrollBottom + spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backRow}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={22} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>Volver</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: theme.text }]}>Recuperar contraseña</Text>
        <Text style={[styles.lead, { color: theme.textMuted }]}>
          En Kora la contraseña es la que guardaste al registrarte en la app.{" "}
          <Text style={{ fontWeight: "700" }}>
            No es la contraseña de tu cuenta Google
          </Text>
          , aunque el correo sea el mismo: Google y Kora son sistemas distintos.
        </Text>

        {step === "email" ? (
          <>
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
            <View style={{ height: spacing.md }} />
            <NovaGradientButton
              title="Solicitar código"
              onPress={requestCode}
              loading={loading}
            />
          </>
        ) : (
          <>
            <ModernInput
              label="Código de recuperación"
              placeholder="Ej. ABC12D"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              icon="key-outline"
            />
            <ModernInput
              label="Nueva contraseña"
              value={newPassword}
              onChangeText={setNewPassword}
              isPassword
              icon="lock-closed-outline"
            />
            <ModernInput
              label="Confirmar contraseña"
              value={confirm}
              onChangeText={setConfirm}
              isPassword
              icon="lock-closed-outline"
            />
            <View style={{ height: spacing.md }} />
            <NovaGradientButton
              title="Guardar y volver al login"
              onPress={submitReset}
              loading={loading}
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    padding: spacing.lg,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.lg,
  },
  backText: { fontSize: 16, fontWeight: "600" },
  title: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 12,
  },
  lead: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.xl,
  },
});
