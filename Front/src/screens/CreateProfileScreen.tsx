import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  Dimensions,
  FlatList,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { profileService, CreateProfileData, UpdateProfileData } from "../services/profile.service";
import { useAuth } from "../context/AuthContext";
import { useTheme, type Theme } from "../context/ThemeContext";
import type { Profile } from "../types";
import { colors } from "../theme/colors";
import { ensureCameraAccess, ensureMediaLibraryAccess } from "../utils/permissions";
import { INTEREST_PICK_OPTIONS } from "../data/interestIcons";
import { HOBBY_PICK_OPTIONS } from "../data/hobbyCatalog";
import { coerceProfilePhotosArray, profilePhotoThumbUri } from "../utils/profilePhotos";
import { ProfileFillImage } from "../components/ProfileFillImage";
import { ensureRemotePhotoUrls, isRemoteImageUrl } from "../services/upload.service";
import { apiErrorDisplayMessage } from "../services/api";
import { capturePhotoViaInlineWebcam } from "../utils/webCameraCapture";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROGRAMS = [
  "Desarrollo de software",
  "Administración de empresas",
  "Contaduría pública",
  "Ingeniería eléctrica",
  "Ingeniería electrónica",
  "Mecatrónica",
  "Diseño gráfico",
  "Tecnología química",
  "Sistemas de información",
  "Otro",
];

const SEMESTERS = Array.from({ length: 10 }, (_, i) => `Semestre ${i + 1}`);

const INTEREST_OPTIONS = INTEREST_PICK_OPTIONS;

const HOBBY_OPTIONS = HOBBY_PICK_OPTIONS.map(({ label, icon }) => ({ label, icon }));

function alertUser(title: string, message: string) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

function previewCalcAge(dob: string | undefined): number | null {
  if (!dob) return null;
  const b = new Date(dob);
  const n = new Date();
  if (Number.isNaN(b.getTime())) return null;
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) {
    a--;
  }
  return a;
}

function makePreviewStyles(theme: Theme, screenW: number) {
  /** Altura del carrusel respecto al ancho (~68%: más compacto que un cuadrado). */
  const heroH = Math.round(screenW * 0.68);
  return StyleSheet.create({
    overlayRoot: { flex: 1, backgroundColor: theme.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
      backgroundColor: theme.bg,
    },
    headerTitle: { fontSize: 17, fontWeight: "800", color: theme.text },
    headerHint: { fontSize: 12, color: theme.textSub, marginTop: 2 },
    closeBtn: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: theme.surface2,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.border,
    },
    detailScroll: { flex: 1 },
    detailScrollInner: { paddingBottom: 40 },
    heroFlatList: {
      width: screenW,
      height: heroH,
    },
    heroCarouselWrap: {
      width: screenW,
      height: heroH,
      position: "relative",
      backgroundColor: theme.surface2,
    },
    heroPage: {
      width: screenW,
      height: heroH,
      position: "relative",
      backgroundColor: theme.surface2,
      overflow: "hidden",
    },
    heroPlaceholder: {
      width: screenW,
      height: heroH,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surface2,
      gap: 8,
    },
    heroPlaceholderTxt: { fontSize: 14, color: theme.textMuted, fontWeight: "600" },
    dotsRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 6,
      paddingVertical: 10,
      backgroundColor: theme.bg,
    },
    dotHit: { padding: 6 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.border },
    dotActive: { backgroundColor: colors.primary, width: 16 },
    chevronFab: {
      position: "absolute",
      top: "50%",
      marginTop: -22,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(0,0,0,0.35)",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 20,
    },
    chevronLeft: { left: 10 },
    chevronRight: { right: 10 },
    body: { paddingHorizontal: 20, paddingTop: 16 },
    nameRow: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: 8 },
    nameText: { fontSize: 26, fontWeight: "800", color: theme.text },
    ageText: { fontSize: 18, color: theme.textSub, fontWeight: "600" },
    metaLine: { fontSize: 14, color: theme.textSub, marginTop: 6, fontWeight: "500" },
    bioBlock: { marginTop: 18 },
    bioLabel: { fontSize: 12, color: theme.textMuted, fontWeight: "700", marginBottom: 6 },
    bioText: { fontSize: 15, color: theme.text, lineHeight: 22 },
    tagSection: { marginTop: 20 },
    tagSectionTitle: { fontSize: 13, fontWeight: "800", color: theme.text, marginBottom: 10 },
    tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    tag: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: theme.iconBg,
      borderWidth: 1,
      borderColor: theme.border,
    },
    tagTxt: { fontSize: 13, color: theme.text, fontWeight: "600" },
    emptyHint: {
      marginTop: 24,
      padding: 14,
      borderRadius: 14,
      backgroundColor: theme.surface2,
      borderWidth: 1,
      borderColor: theme.border,
    },
    emptyHintTxt: { fontSize: 13, color: theme.textSub, textAlign: "center", lineHeight: 19 },
  });
}

// ─── Pill Selector ────────────────────────────────────────────────────────────

interface PillOption { label: string; icon: string }

const makePillStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: theme.iconBg,
      borderWidth: 1,
      borderColor: theme.border,
    },
    pillActive: {
      backgroundColor: theme.isDark ? "rgba(108,92,231,0.35)" : "rgba(108,92,231,0.2)",
      borderColor: colors.primary,
    },
    pillIcon: { fontSize: 14 },
    pillText: { fontSize: 13, color: theme.textMuted, fontWeight: "500" },
    pillTextActive: { color: theme.text, fontWeight: "700" },
    checkCircle: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    addPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: theme.borderHigh,
      borderStyle: "dashed",
    },
    addText: { fontSize: 13, color: colors.primary, fontWeight: "600" },
  });

const PillSelector = ({
  options,
  selected,
  onToggle,
  withCheck = false,
  pillStyles: ps,
}: {
  options: PillOption[];
  selected: string[];
  onToggle: (label: string) => void;
  withCheck?: boolean;
  pillStyles: ReturnType<typeof makePillStyles>;
}) => (
  <View style={ps.wrap}>
    {options.map((opt) => {
      const active = selected.includes(opt.label);
      return (
        <TouchableOpacity
          key={opt.label}
          style={[ps.pill, active && ps.pillActive]}
          onPress={() => onToggle(opt.label)}
          activeOpacity={0.75}
        >
          <Text style={ps.pillIcon}>{opt.icon}</Text>
          <Text style={[ps.pillText, active && ps.pillTextActive]}>
            {opt.label}
          </Text>
          {withCheck && active && (
            <View style={ps.checkCircle}>
              <Ionicons name="checkmark" size={11} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      );
    })}
    <TouchableOpacity style={ps.addPill} activeOpacity={0.7}>
      <Ionicons name="add" size={16} color={colors.primary} />
      <Text style={ps.addText}>{withCheck ? "Agregar hobby" : "Agregar"}</Text>
    </TouchableOpacity>
  </View>
);

// ─── Dropdown picker (custom) ──────────────────────────────────────────────────

const makeDdStyles = (theme: Theme) =>
  StyleSheet.create({
    trigger: {
      backgroundColor: theme.inputBg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    triggerContent: { flex: 1 },
    triggerLabel: { fontSize: 11, color: theme.textSub, marginBottom: 2 },
    triggerValue: { fontSize: 14, color: theme.text, fontWeight: "500" },
    dropdown: {
      position: "absolute",
      top: "100%",
      left: 0,
      right: 0,
      zIndex: 100,
      backgroundColor: theme.surface2,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.borderHigh,
      marginTop: 4,
      overflow: "hidden",
    },
    option: { paddingHorizontal: 14, paddingVertical: 10 },
    optionActive: { backgroundColor: theme.iconBg },
    optionText: { fontSize: 14, color: theme.textSub },
    optionTextActive: { color: theme.text, fontWeight: "700" },
  });

const Dropdown = ({
  label,
  value,
  options,
  onSelect,
  ddStyles,
  iconMutedColor,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  ddStyles: ReturnType<typeof makeDdStyles>;
  iconMutedColor: string;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity
        style={ddStyles.trigger}
        onPress={() => setOpen((o) => !o)}
        activeOpacity={0.8}
      >
        <View style={ddStyles.triggerContent}>
          <Text style={ddStyles.triggerLabel}>{label}</Text>
          <Text style={ddStyles.triggerValue} numberOfLines={1}>
            {value || `Seleccionar`}
          </Text>
        </View>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color={iconMutedColor}
        />
      </TouchableOpacity>
      {open && (
        <View style={ddStyles.dropdown}>
          <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[ddStyles.option, value === opt && ddStyles.optionActive]}
                onPress={() => { onSelect(opt); setOpen(false); }}
              >
                <Text style={[ddStyles.optionText, value === opt && ddStyles.optionTextActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

// ─── Styles (dependen del tema — se generan dentro de la pantalla) ─────────────

function makePhotoModalStyles(theme: Theme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingBottom: 36,
      paddingTop: 12,
      borderTopWidth: 1,
      borderColor: theme.border,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.borderHigh,
      alignSelf: "center",
      marginBottom: 16,
    },
    title: {
      fontSize: 17,
      fontWeight: "800",
      color: theme.text,
      marginBottom: 16,
      textAlign: "center",
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingVertical: 14,
      paddingHorizontal: 12,
      backgroundColor: theme.surface2,
      borderRadius: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    optionTexts: { flex: 1 },
    optionLabel: { fontSize: 15, fontWeight: "700", color: theme.text },
    optionDesc: { fontSize: 12, color: theme.textSub, marginTop: 2 },
    cancelBtn: {
      marginTop: 4,
      paddingVertical: 14,
      alignItems: "center",
    },
    cancelTxt: { fontSize: 15, color: theme.textMuted, fontWeight: "600" },
  });
}

function makeMainStyles(theme: Theme) {
  return StyleSheet.create({
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
    headerTitle: { fontSize: 18, fontWeight: "800", color: theme.text },
    headerSub: { fontSize: 12, color: theme.textSub, marginTop: 2 },
    previewBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    previewText: { fontSize: 13, color: colors.primary, fontWeight: "600" },

    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 8 },

    sectionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
      marginTop: 6,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: theme.text,
      marginBottom: 4,
      marginTop: 14,
    },
    sectionHint: { fontSize: 12, color: theme.textSub, marginTop: 2 },
    sectionBlock: { marginBottom: 4 },
    reorderHint: { flexDirection: "row", alignItems: "center", gap: 4 },
    reorderText: { fontSize: 12, color: theme.textMuted },

    photosGrid: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 8,
    },
    photoSlot: {
      flex: 1,
      aspectRatio: 0.75,
      borderRadius: 14,
      overflow: "hidden",
      backgroundColor: theme.surface2,
      borderWidth: 1,
      borderColor: theme.border,
      position: "relative",
    },
    photoRemove: {
      position: "absolute",
      top: 5,
      right: 5,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: "rgba(0,0,0,0.7)",
      alignItems: "center",
      justifyContent: "center",
    },
    mainPhotoLabel: {
      position: "absolute",
      bottom: 6,
      left: 6,
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    mainPhotoText: { fontSize: 10, color: "#fff", fontWeight: "700" },
    photoPlaceholder: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    photoAdd: {
      width: 72,
      aspectRatio: 0.75,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: theme.borderHigh,
      borderStyle: "dashed",
      backgroundColor: theme.iconBg,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },
    photoAddText: {
      fontSize: 11,
      color: colors.primary,
      textAlign: "center",
      fontWeight: "600",
      lineHeight: 15,
    },
    photoTipRow: { marginBottom: 8 },
    photoTip: { fontSize: 12, color: theme.textSub },
    clearAllPhotosBtn: { alignSelf: "flex-start", paddingVertical: 6, marginBottom: 2 },
    clearAllPhotosText: { fontSize: 13, color: colors.primary, fontWeight: "600", textDecorationLine: "underline" },

    inputField: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.inputBg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 10,
      gap: 10,
    },
    inputIcon: {},
    inputBody: { flex: 1 },
    inputLabel: { fontSize: 11, color: theme.textSub, marginBottom: 3 },
    textInput: { fontSize: 14, color: theme.text, padding: 0 },
    textArea: { minHeight: 60, paddingTop: 2 },
    bioHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
    bioCounter: { fontSize: 11, color: theme.textMuted },
    emojiBtn: { paddingLeft: 4 },
    readonlyValue: { fontSize: 13, color: theme.textMuted, fontStyle: "italic" },

    dropdownRow: {
      flexDirection: "row",
      gap: 0,
      marginBottom: 10,
      zIndex: 10,
    },

    privateTag: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    privateText: { fontSize: 11, color: theme.textSub },

    bottomBar: {
      paddingHorizontal: 16,
      paddingBottom: 24,
      paddingTop: 12,
      backgroundColor: theme.bg,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      gap: 10,
      alignItems: "center",
    },
    saveBtn: {
      width: "100%",
      borderRadius: 18,
      overflow: "hidden",
      shadowColor: "#6C5CE7",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 8,
    },
    saveBtnGradient: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingVertical: 16,
    },
    saveBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
    cancelText: { fontSize: 14, color: colors.primary, fontWeight: "600", paddingVertical: 6 },
  });
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const CreateProfileScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const screenW = Dimensions.get("window").width;
  const { user, refreshUser } = useAuth();
  const styles = useMemo(() => makeMainStyles(theme), [theme]);
  const ddStylesDyn = useMemo(() => makeDdStyles(theme), [theme]);
  const pillStylesDyn = useMemo(() => makePillStyles(theme), [theme]);
  const photoModalStylesDyn = useMemo(() => makePhotoModalStyles(theme), [theme]);
  const previewStyles = useMemo(() => makePreviewStyles(theme, screenW), [theme, screenW]);

  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [program, setProgram] = useState("");
  const [semester, setSemester] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [photoModal, setPhotoModal] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPhotoIdx, setPreviewPhotoIdx] = useState(0);

  const previewPhotos = useMemo(() => photos.filter((u) => (u || "").trim()), [photos]);
  const previewAge = previewCalcAge(user?.dateOfBirth);
  const previewListRef = useRef<FlatList<string>>(null);

  const goToPreviewPhoto = useCallback(
    (index: number) => {
      if (previewPhotos.length === 0) return;
      const i = Math.min(previewPhotos.length - 1, Math.max(0, index));
      setPreviewPhotoIdx(i);
      requestAnimationFrame(() => {
        try {
          previewListRef.current?.scrollToIndex({ index: i, animated: true });
        } catch {
          previewListRef.current?.scrollToOffset({ offset: i * screenW, animated: true });
        }
      });
    },
    [previewPhotos.length, screenW]
  );

  useEffect(() => {
    if (!previewOpen || previewPhotos.length === 0) return;
    const id = requestAnimationFrame(() => {
      previewListRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
    return () => cancelAnimationFrame(id);
  }, [previewOpen, previewPhotos.length]);

  const applyProfileToForm = useCallback((prof: Profile | null | undefined) => {
    if (!prof) return;
    setName(prof.name ?? "");
    setProgram(prof.program ?? "");
    setSemester(prof.semester ? `Semestre ${prof.semester}` : "");
    setBio(prof.bio ?? "");
    setInterests(Array.isArray(prof.interests) ? [...prof.interests] : []);
    setHobbies(Array.isArray(prof.hobbies) ? [...prof.hobbies] : []);
    setPhotos(coerceProfilePhotosArray(prof.photos));
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      applyProfileToForm(user?.profile ?? null);
      const load = async () => {
        try {
          const prof = await profileService.getMyProfile();
          if (!cancelled && prof) applyProfileToForm(prof);
        } catch {
          /* Mantener datos de user.profile si la API falla */
        }
      };
      load();
      return () => { cancelled = true; };
    }, [user?.profile, applyProfileToForm])
  );

  // ─── Photo handlers ────────────────────────────────────────────────────────
  const MAX_PHOTOS = 6;

  const addPhotoUri = (uri: string) => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert('Máximo de fotos', `Puedes subir hasta ${MAX_PHOTOS} fotos.`);
      return;
    }
    setPhotos((p) => [...p, uri]);
  };

  const handlePickGallery = async () => {
    setPhotoModal(false);
    if (!(await ensureMediaLibraryAccess())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (!result.canceled && result.assets?.[0]) addPhotoUri(result.assets[0].uri);
  };

  const handlePickCamera = async () => {
    setPhotoModal(false);
    if (Platform.OS === "web") {
      const uri = await capturePhotoViaInlineWebcam();
      if (uri) addPhotoUri(uri);
      return;
    }
    if (!(await ensureCameraAccess())) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (!result.canceled && result.assets?.[0]) addPhotoUri(result.assets[0].uri);
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotos((p) => p.filter((_, i) => i !== idx));
  };

  const handleClearAllPhotos = () => {
    const count = photos.filter((u) => (u || "").trim()).length;
    if (count === 0) return;
    Alert.alert(
      "Quitar todas las fotos",
      "Se vacían las fotos en esta pantalla. Pulsa «Guardar cambios» al final para guardarlas en el servidor; luego puedes añadir nuevas fotos y guardar de nuevo.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Quitar todas",
          style: "destructive",
          onPress: () => {
            setPhotos([]);
            setPreviewOpen(false);
          },
        },
      ]
    );
  };

  const toggleInterest = (label: string) => {
    setInterests((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]
    );
  };

  const toggleHobby = (label: string) => {
    setHobbies((prev) =>
      prev.includes(label) ? prev.filter((h) => h !== label) : [...prev, label]
    );
  };

  const semesterNumber = parseInt(semester.replace("Semestre ", "")) || undefined;
  const BIO_MAX = 150;

  const handleSave = async () => {
    if (!name.trim() || !program.trim()) {
      Alert.alert("Campos requeridos", "Nombre y programa son obligatorios");
      return;
    }
    setLoading(true);
    try {
      let remotePhotos: string[] = [];
      try {
        remotePhotos = await ensureRemotePhotoUrls(photos);
      } catch (photoErr: unknown) {
        const existingRemote = photos.filter((uri) => {
          const u = (uri || "").trim();
          return isRemoteImageUrl(u) || u.startsWith("/");
        });
        remotePhotos = await ensureRemotePhotoUrls(existingRemote);
        const detail = photoErr instanceof Error ? photoErr.message : "Error al subir imágenes";
        alertUser(
          "Fotos no disponibles",
          `No se pudieron subir algunas fotos ahora (${detail}). Guardaremos tus demás cambios y conservaremos las fotos ya existentes.`
        );
      }
      const data: Record<string, unknown> = {
        name: name.trim(),
        program,
        semester: semesterNumber,
        bio: bio.trim(),
        interests,
        hobbies,
        photos: remotePhotos,
        gender: user?.profile?.gender ?? "PREFER_NOT_TO_SAY",
        relationshipGoal: user?.profile?.relationshipGoal ?? "FRIENDSHIP",
      };

      /** Siempre intentar actualizar: el perfil suele existir aunque `user.profile` en contexto venga vacío tras hidratar. */
      try {
        await profileService.updateProfile(data as UpdateProfileData);
      } catch (e: unknown) {
        const status = (e as { response?: { status?: number } }).response?.status;
        if (status === 404) {
          await profileService.createProfile(data as unknown as CreateProfileData);
        } else {
          throw e;
        }
      }

      setPhotos(remotePhotos);
      await refreshUser();
      Alert.alert("¡Guardado!", "Tu perfil ha sido actualizado");
      navigation.goBack();
    } catch (error: unknown) {
      Alert.alert("Error", apiErrorDisplayMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      {/* ─── Header ───────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Editar perfil</Text>
          <Text style={styles.headerSub}>Actualiza tu información</Text>
        </View>
        <TouchableOpacity
          style={styles.previewBtn}
          activeOpacity={0.8}
          onPress={() => {
            setPreviewPhotoIdx(0);
            setPreviewOpen(true);
          }}
        >
          <Ionicons name="eye-outline" size={16} color={colors.primary} />
          <Text style={styles.previewText}>Vista previa</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* ─── Fotos ────────────────────────────────────────────────────── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Fotos</Text>
          <View style={styles.reorderHint}>
            <Ionicons name="move-outline" size={13} color={theme.textMuted} />
            <Text style={styles.reorderText}>Arrastra para reordenar</Text>
          </View>
        </View>
        <View style={styles.photosGrid}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.photoSlot}>
              {photos[i] ? (
                <>
                  <ProfileFillImage uri={profilePhotoThumbUri(photos[i])} />
                  <TouchableOpacity
                    style={styles.photoRemove}
                    onPress={() => handleRemovePhoto(i)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close" size={13} color="#fff" />
                  </TouchableOpacity>
                  {i === 0 && (
                    <View style={styles.mainPhotoLabel}>
                      <Text style={styles.mainPhotoText}>Foto principal</Text>
                    </View>
                  )}
                </>
              ) : (
                <TouchableOpacity
                  style={styles.photoPlaceholder}
                  onPress={() => setPhotoModal(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle-outline" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          {/* Add photo slot */}
          <TouchableOpacity
            style={styles.photoAdd}
            activeOpacity={0.7}
            onPress={() => setPhotoModal(true)}
          >
            <Ionicons name="add" size={26} color={colors.primary} />
            <Text style={styles.photoAddText}>Agregar{"\n"}foto</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.photoTipRow}>
          <Text style={styles.photoTip}>✨ Agrega entre 3 y 6 fotos para tener más matches</Text>
        </View>
        {photos.some((u) => (u || "").trim()) ? (
          <TouchableOpacity style={styles.clearAllPhotosBtn} onPress={handleClearAllPhotos} activeOpacity={0.75}>
            <Text style={styles.clearAllPhotosText}>Quitar todas las fotos</Text>
          </TouchableOpacity>
        ) : null}

        {/* ─── Información básica ───────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Información básica</Text>

        {/* Nombre */}
        <View style={styles.inputField}>
          <Ionicons name="person-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
          <View style={styles.inputBody}>
            <Text style={styles.inputLabel}>Nombre completo</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="Tu nombre"
              placeholderTextColor={theme.textMuted}
            />
          </View>
        </View>

        {/* Programa + Semestre row */}
        <View style={styles.dropdownRow}>
          <Dropdown
            label="Programa"
            value={program}
            options={PROGRAMS}
            onSelect={setProgram}
            ddStyles={ddStylesDyn}
            iconMutedColor={theme.textMuted}
          />
          <View style={{ width: 10 }} />
          <Dropdown
            label="Semestre"
            value={semester}
            options={SEMESTERS}
            onSelect={setSemester}
            ddStyles={ddStylesDyn}
            iconMutedColor={theme.textMuted}
          />
        </View>

        {/* Biografía */}
        <View style={[styles.inputField, { alignItems: "flex-start" }]}>
          <Ionicons name="pencil-outline" size={18} color={theme.textMuted} style={[styles.inputIcon, { marginTop: 4 }]} />
          <View style={styles.inputBody}>
            <View style={styles.bioHeaderRow}>
              <Text style={styles.inputLabel}>Biografía</Text>
              <Text style={styles.bioCounter}>
                {bio.length}/{BIO_MAX}
              </Text>
            </View>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={bio}
              onChangeText={(t) => setBio(t.slice(0, BIO_MAX))}
              placeholder="Cuéntales un poco sobre ti"
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
          <TouchableOpacity style={styles.emojiBtn}>
            <Ionicons name="happy-outline" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ─── Intereses ────────────────────────────────────────────────── */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Intereses</Text>
          <Text style={styles.sectionHint}>Selecciona tus intereses</Text>
          <View style={{ marginTop: 10 }}>
            <PillSelector
              options={INTEREST_OPTIONS}
              selected={interests}
              onToggle={toggleInterest}
              pillStyles={pillStylesDyn}
            />
          </View>
        </View>

        {/* ─── Hobbies ──────────────────────────────────────────────────── */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Hobbies</Text>
          <Text style={styles.sectionHint}>Selecciona tus hobbies</Text>
          <View style={{ marginTop: 10 }}>
            <PillSelector
              options={HOBBY_OPTIONS}
              selected={hobbies}
              onToggle={toggleHobby}
              withCheck
              pillStyles={pillStylesDyn}
            />
          </View>
        </View>

        {/* ─── Información de contacto ──────────────────────────────────── */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Información de contacto</Text>
            <View style={styles.privateTag}>
              <Ionicons name="lock-closed-outline" size={11} color={theme.textMuted} />
              <Text style={styles.privateText}>Solo visible para ti</Text>
            </View>
          </View>
          <View style={styles.inputField}>
            <Ionicons name="mail-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
            <View style={styles.inputBody}>
              <Text style={styles.inputLabel}>Email institucional</Text>
              <Text style={styles.readonlyValue} numberOfLines={1}>
                {user?.email ?? "—"}
              </Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* ─── Fixed bottom actions ─────────────────────────────────────── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading} activeOpacity={0.88}>
          <LinearGradient
            colors={["#FF6B8B", "#6C5CE7"]}
            style={styles.saveBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Guardar cambios</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
      {/* ─── Photo Source Modal ───────────────────────────────────── */}
      <Modal visible={previewOpen} animationType="slide" onRequestClose={() => setPreviewOpen(false)}>
        <View style={previewStyles.overlayRoot}>
          <View style={[previewStyles.header, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
              style={previewStyles.closeBtn}
              onPress={() => setPreviewOpen(false)}
              activeOpacity={0.8}
              accessibilityLabel="Cerrar vista previa"
            >
              <Ionicons name="close" size={22} color={theme.text} />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={previewStyles.headerTitle}>Vista previa</Text>
              <Text style={previewStyles.headerHint}>Así verán tu perfil en descubrimientos</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <View style={{ flex: 1 }}>
            {previewPhotos.length > 0 ? (
              <>
                <View style={previewStyles.heroCarouselWrap}>
                  <FlatList
                    ref={previewListRef}
                    data={previewPhotos}
                    extraData={previewPhotoIdx}
                    keyExtractor={(_, i) => `pv-${i}`}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    bounces={false}
                    decelerationRate="fast"
                    style={previewStyles.heroFlatList}
                    onMomentumScrollEnd={(e) => {
                      const x = e.nativeEvent.contentOffset.x;
                      const i = Math.round(x / Math.max(1, screenW));
                      setPreviewPhotoIdx(Math.min(previewPhotos.length - 1, Math.max(0, i)));
                    }}
                    getItemLayout={(_, index) => ({
                      length: screenW,
                      offset: screenW * index,
                      index,
                    })}
                    onScrollToIndexFailed={(info) => {
                      setTimeout(() => {
                        previewListRef.current?.scrollToOffset({
                          offset: info.index * screenW,
                          animated: false,
                        });
                      }, 100);
                    }}
                    renderItem={({ item }) => (
                      <View style={previewStyles.heroPage}>
                        <ProfileFillImage uri={profilePhotoThumbUri(item)} />
                      </View>
                    )}
                  />
                  {previewPhotos.length > 1 ? (
                    <>
                      <Pressable
                        style={[previewStyles.chevronFab, previewStyles.chevronLeft]}
                        onPress={() => goToPreviewPhoto(previewPhotoIdx - 1)}
                        disabled={previewPhotoIdx === 0}
                        accessibilityLabel="Foto anterior"
                      >
                        <Ionicons name="chevron-back" size={24} color="#fff" />
                      </Pressable>
                      <Pressable
                        style={[previewStyles.chevronFab, previewStyles.chevronRight]}
                        onPress={() => goToPreviewPhoto(previewPhotoIdx + 1)}
                        disabled={previewPhotoIdx >= previewPhotos.length - 1}
                        accessibilityLabel="Foto siguiente"
                      >
                        <Ionicons name="chevron-forward" size={24} color="#fff" />
                      </Pressable>
                    </>
                  ) : null}
                </View>
                {previewPhotos.length > 1 ? (
                  <View style={previewStyles.dotsRow}>
                    {previewPhotos.map((_, i) => (
                      <Pressable
                        key={`dot-${i}`}
                        style={previewStyles.dotHit}
                        onPress={() => goToPreviewPhoto(i)}
                        accessibilityRole="button"
                        accessibilityLabel={`Ir a la foto ${i + 1}`}
                      >
                        <View style={[previewStyles.dot, i === previewPhotoIdx && previewStyles.dotActive]} />
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </>
            ) : (
              <View style={previewStyles.heroPlaceholder}>
                <Ionicons name="images-outline" size={52} color={theme.textMuted} />
                <Text style={previewStyles.heroPlaceholderTxt}>Aún no has añadido fotos</Text>
              </View>
            )}

            <ScrollView
              style={previewStyles.detailScroll}
              contentContainerStyle={previewStyles.detailScrollInner}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              <View style={previewStyles.body}>
                <View style={previewStyles.nameRow}>
                  <Text style={previewStyles.nameText}>{name.trim() || "Tu nombre"}</Text>
                  {previewAge != null && previewAge >= 16 ? (
                    <Text style={previewStyles.ageText}>, {previewAge}</Text>
                  ) : null}
                </View>
                <Text style={previewStyles.metaLine}>
                  {[program.trim(), semester.trim()].filter(Boolean).join(" · ") ||
                    "Completa programa y semestre arriba"}
                </Text>

                {bio.trim() ? (
                  <View style={previewStyles.bioBlock}>
                    <Text style={previewStyles.bioLabel}>Sobre mí</Text>
                    <Text style={previewStyles.bioText}>{bio.trim()}</Text>
                  </View>
                ) : null}

                {interests.length > 0 ? (
                  <View style={previewStyles.tagSection}>
                    <Text style={previewStyles.tagSectionTitle}>Intereses</Text>
                    <View style={previewStyles.tagWrap}>
                      {interests.map((t) => (
                        <View key={`pi-${t}`} style={previewStyles.tag}>
                          <Text style={previewStyles.tagTxt}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {hobbies.length > 0 ? (
                  <View style={previewStyles.tagSection}>
                    <Text style={previewStyles.tagSectionTitle}>Hobbies</Text>
                    <View style={previewStyles.tagWrap}>
                      {hobbies.map((t) => (
                        <View key={`ph-${t}`} style={previewStyles.tag}>
                          <Text style={previewStyles.tagTxt}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                <View style={previewStyles.emptyHint}>
                  <Text style={previewStyles.emptyHintTxt}>
                    Esta es una aproximación: los demás datos (como confianza o insignias) siguen saliendo de tu perfil
                    guardado cuando exploran tu ficha completa.
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={photoModal} transparent animationType="slide" onRequestClose={() => setPhotoModal(false)}>
        <TouchableOpacity
          style={photoModalStylesDyn.overlay}
          onPress={() => setPhotoModal(false)}
          activeOpacity={1}
        >
          <View style={photoModalStylesDyn.sheet}>
            <View style={photoModalStylesDyn.handle} />
            <Text style={photoModalStylesDyn.title}>Agregar foto</Text>

            <TouchableOpacity style={photoModalStylesDyn.option} onPress={handlePickCamera} activeOpacity={0.8}>
              <View style={[photoModalStylesDyn.iconBox, { backgroundColor: theme.iconBg }]}>
                <Ionicons name="camera-outline" size={22} color={theme.textAccent} />
              </View>
              <View style={photoModalStylesDyn.optionTexts}>
                <Text style={photoModalStylesDyn.optionLabel}>Tomar foto</Text>
                <Text style={photoModalStylesDyn.optionDesc}>Usa la cámara de tu dispositivo</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={photoModalStylesDyn.option} onPress={handlePickGallery} activeOpacity={0.8}>
              <View style={[photoModalStylesDyn.iconBox, { backgroundColor: 'rgba(255,107,139,0.12)' }]}>
                <Ionicons name="images-outline" size={22} color="#FF6B8B" />
              </View>
              <View style={photoModalStylesDyn.optionTexts}>
                <Text style={photoModalStylesDyn.optionLabel}>Elegir de galería</Text>
                <Text style={photoModalStylesDyn.optionDesc}>Selecciona desde tus fotos</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={photoModalStylesDyn.cancelBtn}
              onPress={() => setPhotoModal(false)}
              activeOpacity={0.7}
            >
              <Text style={photoModalStylesDyn.cancelTxt}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default CreateProfileScreen;
