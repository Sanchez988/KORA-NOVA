import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { NovaGradientButton } from "../components/nova/NovaGradientButton";
import { createStory } from "../services/story.service";
import { apiErrorDisplayMessage } from "../services/api";
import { spacing } from "../theme/colors";
import { useScreenInsets } from "../utils/screenInsets";

const CAPTION_MAX = 220;

export default function CreateStoryScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const { scrollBottom } = useScreenInsets();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [uri, setUri] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [captionFocused, setCaptionFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  const pick = async (useCamera: boolean) => {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permiso", useCamera ? "Se necesita acceso a la cámara." : "Se necesita acceso a la galería.");
      return;
    }
    const nativeEdit =
      Platform.OS === "ios" || Platform.OS === "android"
        ? { allowsEditing: true as const, aspect: [9, 16] as [number, number] }
        : { allowsEditing: false as const };
    const res = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
          ...nativeEdit,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
          ...nativeEdit,
        });
    if (!res.canceled && res.assets[0]?.uri) setUri(res.assets[0].uri);
  };

  const publish = async () => {
    if (!uri) {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert("Elige o toma una imagen para tu historia.");
      } else {
        Alert.alert("Foto", "Elige o toma una imagen para tu historia.");
      }
      return;
    }
    setLoading(true);
    try {
      await createStory(uri, caption.slice(0, CAPTION_MAX));
      const msg = "Tu historia estará visible para tus matches durante 24 horas.";
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert(`Publicado\n\n${msg}`);
        navigation.goBack();
      } else {
        Alert.alert("Publicado", msg, [{ text: "OK", onPress: () => navigation.goBack() }]);
      }
    } catch (e) {
      const errText = apiErrorDisplayMessage(e);
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert(`Error\n\n${errText}`);
      } else {
        Alert.alert("Error", errText);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: scrollBottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
          <Text style={[styles.backTxt, { color: theme.text }]}>Volver</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: theme.text }]}>Nueva historia</Text>

        <View style={styles.previewWrap}>
          {uri ? (
            <Image source={{ uri }} style={styles.preview} resizeMode="cover" />
          ) : (
            <View style={[styles.preview, styles.previewPh]}>
              <Ionicons name="image-outline" size={48} color={theme.textMuted} />
              <Text style={[styles.previewHint, { color: theme.textMuted }]}>Sin imagen aún</Text>
            </View>
          )}
        </View>

        <View style={styles.pickRow}>
          <TouchableOpacity style={[styles.pickBtn, { borderColor: theme.border }]} onPress={() => pick(false)}>
            <Ionicons name="images-outline" size={20} color={theme.text} />
            <Text style={[styles.pickTxt, { color: theme.text }]}>Galería</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.pickBtn, { borderColor: theme.border }]} onPress={() => pick(true)}>
            <Ionicons name="camera-outline" size={20} color={theme.text} />
            <Text style={[styles.pickTxt, { color: theme.text }]}>Cámara</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.captionSection}>
          <View style={styles.captionLabelRow}>
            <Text style={[styles.captionLabel, { color: theme.text }]}>Pie de foto</Text>
            <View style={[styles.optionalPill, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
              <Text style={[styles.optionalPillTxt, { color: theme.textMuted }]}>Opcional</Text>
            </View>
          </View>
          <View
            style={[
              styles.captionCard,
              {
                backgroundColor: theme.inputBg,
                borderColor: captionFocused ? theme.brandPurple : theme.border,
              },
            ]}
          >
            <View style={styles.captionRow}>
              <View style={[styles.captionIconBadge, { backgroundColor: theme.surface2 }]}>
                <Ionicons name="text-outline" size={20} color={captionFocused ? theme.brandPurple : theme.textMuted} />
              </View>
              <TextInput
                placeholder="Escribe algo breve…"
                placeholderTextColor={theme.textMuted}
                value={caption}
                onChangeText={(t) => setCaption(t.slice(0, CAPTION_MAX))}
                onFocus={() => setCaptionFocused(true)}
                onBlur={() => setCaptionFocused(false)}
                multiline
                maxLength={CAPTION_MAX}
                scrollEnabled
                textAlignVertical="top"
                selectionColor={theme.brandPurple}
                style={[styles.captionInput, { color: theme.text }]}
              />
            </View>
            <View style={[styles.captionFooter, { borderTopColor: theme.border }]}>
              <Text style={[styles.captionHint, { color: theme.textMuted }]} numberOfLines={1}>
                Visible solo para tus matches · máx. {CAPTION_MAX} caracteres
              </Text>
              <Text style={[styles.captionCounter, { color: theme.textMuted }]}>
                {caption.length}/{CAPTION_MAX}
              </Text>
            </View>
          </View>
        </View>

        {!uri ? (
          <Text style={[styles.publishHint, { color: theme.textMuted }]}>
            Elige una foto en Galería o Cámara para habilitar publicar.
          </Text>
        ) : null}
        <NovaGradientButton
          title="Publicar historia"
          onPress={() => void publish()}
          loading={loading}
          disabled={!uri}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    root: { flex: 1 },
    scroll: { paddingHorizontal: spacing.lg },
    backRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.lg },
    backTxt: { fontSize: 16, fontWeight: "600" },
    title: { fontSize: 24, fontWeight: "800", marginBottom: spacing.lg },
    previewWrap: { borderRadius: 16, overflow: "hidden", marginBottom: spacing.md },
    preview: { width: "100%", aspectRatio: 9 / 16, maxHeight: 420, backgroundColor: theme.surface },
    previewPh: { alignItems: "center", justifyContent: "center", gap: 8 },
    previewHint: { fontSize: 13 },
    pickRow: { flexDirection: "row", gap: 12, marginBottom: spacing.lg },
    pickBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 1,
      backgroundColor: theme.surface,
    },
    pickTxt: { fontWeight: "700", fontSize: 14 },
    captionSection: { marginBottom: spacing.lg },
    captionLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    captionLabel: { fontSize: 15, fontWeight: "700", letterSpacing: 0.2 },
    optionalPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
    },
    optionalPillTxt: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
    captionCard: {
      borderRadius: 16,
      borderWidth: 1.5,
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 10,
    },
    captionRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    captionIconBadge: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    captionInput: {
      flex: 1,
      minHeight: 112,
      maxHeight: 160,
      fontSize: 16,
      lineHeight: 22,
      paddingTop: 0,
      paddingBottom: 8,
      paddingHorizontal: 0,
    },
    captionFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    captionHint: { flex: 1, fontSize: 11, lineHeight: 14 },
    captionCounter: { fontSize: 12, fontWeight: "700", fontVariant: ["tabular-nums"] },
    publishHint: { fontSize: 13, textAlign: "center", marginBottom: 10, lineHeight: 18 },
  });
