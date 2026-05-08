import React, { useState, useMemo, useRef, type ComponentProps } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoImagePicker from 'expo-image-picker';
import { DatePickerInput } from '../components/DatePickerInput';
import { profileService } from '../services/profile.service';
import { ensureRemotePhotoUrls } from '../services/upload.service';
import { profilePhotoThumbUri } from '../utils/profilePhotos';
import { ProfileFillImage } from '../components/ProfileFillImage';
import { useAuth } from '../context/AuthContext';
import { useTheme, type Theme } from '../context/ThemeContext';
import { KORA_BG } from '../design/koraNova';
import { NovaGradientButton } from '../components/nova/NovaGradientButton';
import { ensureCameraAccess, ensureMediaLibraryAccess } from '../utils/permissions';
import { capturePhotoViaInlineWebcam } from '../utils/webCameraCapture';
import { INTEREST_PICK_OPTIONS } from '../data/interestIcons';
import { HOBBY_PICK_OPTIONS } from '../data/hobbyCatalog';
import { CommonActions } from '@react-navigation/native';
import type { UpdateProfileData } from '../services/profile.service';

const ONBOARDING_INTEREST_STEP = 4;
const MIN_INTEREST_SELECTION = 3;
const ONBOARDING_HOBBY_STEP = 5;
const MIN_HOBBY_SELECTION = 2;

/** Borde / acento tipo “neón” de la maqueta, dentro de paleta Kora */
const PASSION_RING_ACCENTS = ['#6C5CE7', '#FF6B8B', '#A29BFE', '#06D6A0', '#FDCB6E', '#E056FD'] as const;

/** Alert.alert es poco usable en navegador; evita “no pasa nada” en errores. */
function alertUser(title: string, message: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

type OnboardingInfoTip = {
  icon: ComponentProps<typeof Ionicons>['name'];
  content: React.ReactNode;
};

const RELATIONSHIP_GOALS = [
  { label: 'Pareja',   value: 'SERIOUS_RELATIONSHIP', emoji: '\uD83D\uDC91' },
  { label: 'Amistad',  value: 'FRIENDSHIP',           emoji: '\uD83E\uDD1D' },
  { label: 'Casuales', value: 'JUST_MEETING_PEOPLE',  emoji: '\uD83D\uDE0A' },
  { label: 'Estudio',  value: 'STUDY_GROUPS',         emoji: '\uD83D\uDCDA' },
];

const SHOW_ME_OPTIONS = [
  { label: 'Mujeres', value: 'WOMEN' },
  { label: 'Hombres', value: 'MEN' },
  { label: 'Todos',   value: 'EVERYONE' },
];

const GENDERS = [
  { label: 'Mujer', value: 'FEMALE' },
  { label: 'Hombre', value: 'MALE' },
  { label: 'No binaria/o', value: 'NON_BINARY' },
  { label: 'Género fluido', value: 'GENDERFLUID' },
  { label: 'Mujer trans', value: 'TRANS_FEMALE' },
  { label: 'Hombre trans', value: 'TRANS_MALE' },
  { label: 'Otro', value: 'OTHER' },
  { label: 'Prefiero no decirlo', value: 'PREFER_NOT_TO_SAY' },
];

const PROGRAM_QUICK_OPTIONS = [
  'Ing. de Sistemas',
  'Ing. Industrial',
  'Ing. Electrónica',
  'Diseño Gráfico',
  'Administración',
  'Contaduría',
] as const;

const DISTANCE_OPTIONS = [5, 10, 25, 50, 100];

function makeOnboardingStyles(theme: Theme) {
  const { isDark, brandPurple, surface, surface2, surfaceHigh, text, textSub, border, borderHigh, inputBg } = theme;
  const dim = isDark ? 'rgba(162,155,254,0.55)' : textSub;
  const footerBg = isDark ? KORA_BG : theme.bg;

  return StyleSheet.create({
    glowTopLeft: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      width: '65%',
      height: '45%',
    },
    glowBottomRight: {
      position: 'absolute' as const,
      bottom: 0,
      right: 0,
      width: '65%',
      height: '50%',
    },
    screen: { flex: 1, backgroundColor: theme.bg },
    progressWrap: { flexDirection: 'row', gap: 5, paddingHorizontal: 20, paddingTop: 52, paddingBottom: 8 },
    progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: surface2, borderWidth: 1, borderColor: border },
    progressBarActive: { backgroundColor: brandPurple, borderColor: brandPurple },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 8 },
    stepWrap: { gap: 20 },
    photoCircle: {
      width: 110, height: 110, borderRadius: 55,
      borderWidth: 2, borderColor: brandPurple, borderStyle: 'dashed',
      backgroundColor: 'rgba(108,92,231,0.08)',
      alignSelf: 'center', alignItems: 'center', justifyContent: 'center', gap: 4, overflow: 'hidden',
    },
    photoCircleImg: { width: 110, height: 110, borderRadius: 55 },
    photoCircleLabel: { fontSize: 12, color: theme.textAccent, fontWeight: '600' },
    fieldWrap: { gap: 8 },
    fieldLabel: { fontSize: 13, color: dim, fontWeight: '600', letterSpacing: 0.4 },
    input: {
      backgroundColor: surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
      color: text, fontSize: 15, borderWidth: 1, borderColor: border,
    },
    charCount: { fontSize: 12, color: dim, textAlign: 'right' },
    /** Carrera: texto principal + rejilla de atajos (2 columnas + Otro ancho completo) */
    programCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: surfaceHigh,
      padding: 16,
      gap: 14,
    },
    programValueInput: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: inputBg,
      paddingHorizontal: 14,
      paddingVertical: 13,
      color: text,
      fontSize: 15,
    },
    programSectionLabel: {
      fontSize: 11,
      color: dim,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    programChipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    programPick: {
      flexGrow: 1,
      flexBasis: '46%',
      minWidth: '44%',
      maxWidth: '48%',
      minHeight: 46,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(162,155,254,0.07)' : 'rgba(108,92,231,0.06)',
      borderWidth: 1,
      borderColor: border,
    },
    programPickWide: {
      flexBasis: '100%',
      minWidth: '100%',
      maxWidth: '100%',
    },
    programPickActive: { backgroundColor: 'rgba(108,92,231,0.32)', borderColor: brandPurple },
    programPickLabel: { fontSize: 13, color: dim, fontWeight: '700', textAlign: 'center' },
    programPickLabelActive: { color: text },
    btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    genderBtn: {
      flexGrow: 1,
      flexBasis: '47%',
      minWidth: '42%',
      maxWidth: '48%',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 14,
      backgroundColor: surface,
      borderWidth: 1,
      borderColor: border,
      alignItems: 'center',
    },
    photoSourceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
    photoSourceBtn: {
      flexGrow: 1,
      flexBasis: '42%',
      minWidth: 130,
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: brandPurple,
      alignItems: 'center',
      backgroundColor: 'rgba(108,92,231,0.08)',
    },
    photoSourceBtnText: { fontSize: 14, fontWeight: '700', color: theme.textAccent },
    genderBtnActive: { backgroundColor: 'rgba(108,92,231,0.25)', borderColor: brandPurple },
    genderBtnText: { fontSize: 14, color: dim, fontWeight: '600' },
    genderBtnTextActive: { color: text },
    fieldHintSm: { fontSize: 12, color: dim, marginTop: 4 },
    photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    photoThumb: { width: 100, height: 125, borderRadius: 14, overflow: 'hidden', position: 'relative' },
    photoPrincipalBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,107,139,0.85)', paddingVertical: 4, alignItems: 'center' },
    photoPrincipalText: { fontSize: 10, color: '#fff', fontWeight: '700' },
    photoRemove: { position: 'absolute', top: 4, right: 4 },
    photoAdd: { width: 100, height: 125, borderRadius: 14, borderWidth: 2, borderColor: brandPurple, borderStyle: 'dashed', backgroundColor: 'rgba(108,92,231,0.06)', alignItems: 'center', justifyContent: 'center', gap: 6 },
    photoAddText: { fontSize: 12, color: theme.textAccent, fontWeight: '600' },
    photoCount: { fontSize: 13, color: dim, textAlign: 'center', marginTop: 4 },
    selectedCount: { fontSize: 13, color: theme.textAccent, textAlign: 'center', fontWeight: '600' },
    passionsWrap: { gap: 14 },
    passionsBadgeRow: { alignSelf: 'center' },
    passionsBadge: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: borderHigh,
      backgroundColor: isDark ? 'rgba(162,155,254,0.08)' : 'rgba(108,92,231,0.1)',
    },
    passionsBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.6,
      color: theme.textAccent,
      textAlign: 'center',
    },
    passionsHeroTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: text,
      textAlign: 'center',
      lineHeight: 32,
      paddingHorizontal: 4,
    },
    passionsHeroSub: {
      fontSize: 14,
      color: dim,
      textAlign: 'center',
      lineHeight: 21,
      paddingHorizontal: 8,
      marginBottom: 2,
    },
    passionsTip: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
      padding: 14,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(162,155,254,0.28)' : 'rgba(108,92,231,0.35)',
      backgroundColor: isDark ? 'rgba(162,155,254,0.06)' : 'rgba(108,92,231,0.07)',
      marginBottom: 4,
    },
    passionsTipText: {
      flex: 1,
      fontSize: 13,
      color: dim,
      lineHeight: 19,
      fontWeight: '500',
    },
    passionsTipBold: {
      fontWeight: '800',
      color: brandPurple,
    },
    passionsStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: border,
      marginTop: 2,
    },
    passionsStatusMuted: {
      fontSize: 13,
      color: theme.textMuted,
      fontWeight: '600',
    },
    passionsList: {
      gap: 10,
      paddingTop: 4,
      paddingBottom: 28,
    },
    customEntryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 2,
      marginBottom: 6,
    },
    customEntryInput: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: inputBg,
      color: text,
      fontSize: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    customEntryBtn: {
      minHeight: 42,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: brandPurple,
      backgroundColor: isDark ? 'rgba(108,92,231,0.24)' : 'rgba(108,92,231,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    customEntryBtnText: {
      color: text,
      fontSize: 13,
      fontWeight: '700',
    },
    selectedCustomWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 2,
      marginBottom: 4,
    },
    selectedCustomChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: brandPurple,
      backgroundColor: isDark ? 'rgba(108,92,231,0.18)' : 'rgba(108,92,231,0.12)',
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    selectedCustomText: {
      color: text,
      fontSize: 12,
      fontWeight: '600',
    },
    passionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 13,
      paddingHorizontal: 14,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: surfaceHigh,
    },
    passionCardActive: {
      backgroundColor: isDark ? 'rgba(108,92,231,0.26)' : 'rgba(108,92,231,0.18)',
      borderColor: brandPurple,
    },
    passionIconBadge: {
      width: 50,
      height: 50,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      backgroundColor: isDark ? 'rgba(162,155,254,0.06)' : 'rgba(255,255,255,0.85)',
    },
    passionIconEmoji: { fontSize: 24 },
    passionTextWrap: { flex: 1, gap: 3 },
    passionRowTitle: { fontSize: 15, fontWeight: '800', color: text },
    passionRowDesc: { fontSize: 12.5, color: dim, fontWeight: '500', lineHeight: 17 },
    cardGroup: { backgroundColor: surface, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: border },
    groupLabel: { fontSize: 13, color: dim, fontWeight: '600' },
    goalBtn: { flexDirection: 'column', alignItems: 'center', gap: 4, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: 'rgba(108,92,231,0.08)', borderWidth: 1, borderColor: border, minWidth: 70 },
    goalBtnActive: { backgroundColor: 'rgba(108,92,231,0.3)', borderColor: brandPurple },
    goalBtnEmoji: { fontSize: 20 },
    goalBtnText: { fontSize: 13, color: dim, fontWeight: '700' },
    goalBtnTextActive: { color: text },
    showMeBtn: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 14, backgroundColor: 'rgba(108,92,231,0.08)', borderWidth: 1, borderColor: border },
    showMeBtnActive: { backgroundColor: 'rgba(108,92,231,0.3)', borderColor: brandPurple },
    showMeText: { fontSize: 14, color: dim, fontWeight: '600' },
    showMeTextActive: { color: text },
    ageRow: { flexDirection: 'row', gap: 16 },
    ageLabel: { fontSize: 12, color: dim, marginBottom: 8 },
    ageBtn: { width: 44, height: 36, borderRadius: 10, backgroundColor: 'rgba(108,92,231,0.08)', borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center' },
    ageBtnActive: { backgroundColor: 'rgba(108,92,231,0.35)', borderColor: brandPurple },
    ageBtnText: { fontSize: 13, color: dim, fontWeight: '700' },
    ageBtnTextActive: { color: text },
    distanceValue: { fontSize: 22, fontWeight: '800', color: text },
    distBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: 'rgba(108,92,231,0.08)', borderWidth: 1, borderColor: border },
    distBtnActive: { backgroundColor: 'rgba(108,92,231,0.35)', borderColor: brandPurple },
    distBtnText: { fontSize: 13, color: dim, fontWeight: '600' },
    distBtnTextActive: { color: text },
    footer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12, backgroundColor: footerBg, borderTopWidth: 1, borderTopColor: border },
    backBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: surface, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center' },
  });
}

interface OnboardingData {
  name: string;
  dateOfBirth: string;
  gender: string;
  program: string;
  semester: string;
  photos: string[];
  bio: string;
  interests: string[];
  hobbies: string[];
  preferences: {
    ageMin: number;
    ageMax: number;
    maxDistance: number;
    relationshipGoal: string;
    showMeTo: string;
  };
}

export default function OnboardingScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => makeOnboardingStyles(theme), [theme]);
  const placeholderColor = isDark ? 'rgba(162,155,254,0.45)' : theme.textMuted;

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [customInterest, setCustomInterest] = useState('');
  const [customHobby, setCustomHobby] = useState('');
  /** Alert.alert es no-op en web; el hueco «Añadir» abre este modal allí */
  const [photoSourceModalVisible, setPhotoSourceModalVisible] = useState(false);
  const programInputRef = useRef<TextInput | null>(null);
  /** Evita doble envío antes de que `loading` deshabilite el botón (doble clic en «Empezar»). */
  const submitInFlightRef = useRef(false);
  const { refreshUser, setOnboardingCompleted } = useAuth();

  const [data, setData] = useState<OnboardingData>({
    name: '',
    dateOfBirth: '',
    gender: '',
    program: '',
    semester: '',
    photos: [],
    bio: '',
    interests: [],
    hobbies: [],
    preferences: {
      ageMin: 18,
      ageMax: 28,
      maxDistance: 10,
      relationshipGoal: '',
      showMeTo: 'EVERYONE',
    },
  });

  const totalSteps = 7;

  const pickerOptions = useMemo(
    () => ({
      mediaTypes: ExpoImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 5] as [number, number],
      quality: 0.8,
    }),
    []
  );

  const guardPhotoLimit = (): boolean => {
    if (data.photos.length >= 6) {
      Alert.alert('Límite', 'Puedes subir como máximo 6 fotos.');
      return false;
    }
    return true;
  };

  const appendPhotoUri = (uri: string) => {
    setData((prev) => ({ ...prev, photos: [...prev.photos, uri] }));
  };

  /** Galería (y PWA/web): mejor UX en Expo. */
  const pickPhotoFromGallery = async () => {
    if (!guardPhotoLimit()) return;
    if (!(await ensureMediaLibraryAccess())) return;
    const result = await ExpoImagePicker.launchImageLibraryAsync(pickerOptions);
    if (!result.canceled && result.assets[0]) {
      appendPhotoUri(result.assets[0].uri);
    }
  };

  /**
   * Cámara nativa usa ImagePicker.
   * En navegador, Expo también usa `<input type="file" capture>` → en escritorio suele ser igual que galería;
   * usamos getUserMedia + vista previa para algo distinto y útil como “cámara”.
   */
  const pickPhotoFromCamera = async () => {
    if (!guardPhotoLimit()) return;

    if (Platform.OS === 'web') {
      const uri = await capturePhotoViaInlineWebcam();
      if (uri) {
        appendPhotoUri(uri);
        return;
      }
      /** En web los fallos suelen mostrarse en `webCameraCapture` (banner). Alert de RN es no-op en web. */
      return;
    }

    if (!(await ensureCameraAccess())) return;
    const result = await ExpoImagePicker.launchCameraAsync({
      ...pickerOptions,
      cameraType: ExpoImagePicker.CameraType.back,
    });
    if (!result.canceled && result.assets[0]) {
      appendPhotoUri(result.assets[0].uri);
    }
  };

  const promptPhotoSource = () => {
    if (!guardPhotoLimit()) return;
    if (Platform.OS === 'web') {
      setPhotoSourceModalVisible(true);
      return;
    }
    Alert.alert('Añadir foto', 'Elige desde la galería o usa la cámara (ideal en el móvil o PWA).', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Galería', onPress: () => void pickPhotoFromGallery() },
      { text: 'Cámara', onPress: () => void pickPhotoFromCamera() },
    ]);
  };

  const closePhotoSourceModal = () => setPhotoSourceModalVisible(false);

  const onWebModalGallery = () => {
    closePhotoSourceModal();
    void pickPhotoFromGallery();
  };

  const onWebModalCamera = () => {
    closePhotoSourceModal();
    void pickPhotoFromCamera();
  };

  const calcAge = (dob: string) => {
    const parts = dob.split('/');
    if (parts.length !== 3) return 0;
    const [day, month, year] = parts.map(Number);
    if (!day || !month || !year || year < 1900) return 0;
    const today = new Date();
    let age = today.getFullYear() - year;
    const m = today.getMonth() - (month - 1);
    if (m < 0 || (m === 0 && today.getDate() < day)) age--;
    return age;
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (data.photos.length < 2) {
          Alert.alert('Fotos', 'Sube al menos 2 fotos (galería o cámara).');
          return false;
        }
        if (!data.name.trim()) {
          Alert.alert('Error', 'Ingresa tu nombre');
          return false;
        }
        if (!data.dateOfBirth) {
          Alert.alert('Error', 'Ingresa tu fecha de nacimiento');
          return false;
        }
        if (calcAge(data.dateOfBirth) < 18) {
          Alert.alert('Edad mínima', 'Debes tener al menos 18 años.');
          return false;
        }
        if (!data.gender) {
          Alert.alert('Error', 'Selecciona tu género.');
          return false;
        }
        return true;
      case 2: {
        if (!data.program.trim()) {
          Alert.alert('Error', 'Ingresa tu carrera');
          return false;
        }
        const semDigits = data.semester.replace(/\D/g, '');
        const semNum = parseInt(semDigits, 10);
        if (!semDigits || !Number.isFinite(semNum) || semNum < 1 || semNum > 24) {
          Alert.alert('Semestre', 'Escribe un número entre 1 y 24.');
          return false;
        }
        return true;
      }
      case 3:
        if (!data.bio.trim() || data.bio.length < 20) {
          Alert.alert('Bio', 'Tu bio debe tener al menos 20 caracteres.');
          return false;
        }
        return true;
      case 4:
        if (data.interests.length < 3) { Alert.alert('Intereses', 'Selecciona al menos 3'); return false; }
        return true;
      case 5:
        if (data.hobbies.length < MIN_HOBBY_SELECTION) {
          Alert.alert('Hobbies', `Selecciona al menos ${MIN_HOBBY_SELECTION}`);
          return false;
        }
        return true;
      case 6:
        if (!data.preferences.relationshipGoal) {
          Alert.alert('Error', 'Selecciona qué buscas.');
          return false;
        }
        return true;
      case 7:
        if (data.preferences.ageMin > data.preferences.ageMax) {
          alertUser('Preferencias', 'La edad mínima no puede ser mayor que la máxima.');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < totalSteps) {
      setCurrentStep((s) => s + 1);
      return;
    }
    await handleSubmit();
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(s => s - 1);
  };

  const handleSubmit = async () => {
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setLoading(true);
    try {
      const goalValue = data.preferences.relationshipGoal || 'FRIENDSHIP';
      let remotePhotos: string[] = [];
      try {
        remotePhotos = await ensureRemotePhotoUrls(data.photos);
      } catch (photoErr: unknown) {
        const detail = photoErr instanceof Error ? photoErr.message : 'Error de red';
        alertUser(
          'Fotos no disponibles',
          `No se pudieron subir tus fotos ahora (${detail}). Continuaremos sin fotos; luego puedes agregarlas desde tu perfil.`
        );
      }
      const semesterNum = data.semester ? parseInt(data.semester, 10) : undefined;

      const fullUpdate: UpdateProfileData = {
        name: data.name.trim(),
        bio: data.bio.trim(),
        gender: data.gender,
        program: data.program.trim(),
        semester: semesterNum && !Number.isNaN(semesterNum) ? semesterNum : undefined,
        interests: data.interests,
        hobbies: data.hobbies,
        relationshipGoal: goalValue,
        photos: remotePhotos,
        minAge: data.preferences.ageMin,
        maxAge: data.preferences.ageMax,
        maxDistance: data.preferences.maxDistance,
        showMeTo: data.preferences.showMeTo,
      };

      try {
        await profileService.createProfile({
          name: fullUpdate.name!,
          bio: fullUpdate.bio,
          gender: fullUpdate.gender!,
          program: fullUpdate.program!,
          semester: fullUpdate.semester,
          interests: fullUpdate.interests!,
          hobbies: fullUpdate.hobbies!,
          relationshipGoal: fullUpdate.relationshipGoal!,
          photos: remotePhotos,
        });
      } catch (e: unknown) {
        const axiosErr = e as { response?: { status?: number; data?: { message?: string } }; message?: string };
        const status = axiosErr.response?.status;
        const raw = axiosErr.response?.data?.message || axiosErr.message || '';
        const msg = String(raw).toLowerCase();
        const duplicate =
          status === 400 && (msg.includes('ya tienes') || msg.includes('perfil creado') || msg.includes('perfil'));
        if (!duplicate) {
          alertUser('Error', String(raw || 'No se pudo guardar tu perfil. Revisa conexión e inténtalo de nuevo.'));
          return;
        }
      }

      try {
        await profileService.updateProfile(fullUpdate);
      } catch (e: unknown) {
        const axiosErr = e as { response?: { data?: { message?: string } }; message?: string };
        alertUser(
          'Error',
          axiosErr.response?.data?.message || axiosErr.message || 'No se pudieron guardar preferencias.'
        );
        return;
      }

      try {
        await refreshUser();
      } catch (_) {}

      setOnboardingCompleted(true);
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        })
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'No se pudo completar el registro';
      alertUser('Error', msg);
    } finally {
      submitInFlightRef.current = false;
      setLoading(false);
    }
  };

  const toggleInterest = (label: string) =>
    setData(prev => ({
      ...prev,
      interests: prev.interests.includes(label)
        ? prev.interests.filter(i => i !== label)
        : [...prev.interests, label],
    }));

  const toggleHobby = (label: string) =>
    setData(prev => ({
      ...prev,
      hobbies: prev.hobbies.includes(label)
        ? prev.hobbies.filter(h => h !== label)
        : [...prev.hobbies, label],
    }));

  const normalizeCustomValue = (raw: string): string => {
    return raw.trim().replace(/\s+/g, ' ').slice(0, 32);
  };

  const addCustomInterest = () => {
    const value = normalizeCustomValue(customInterest);
    if (!value) return;
    if (data.interests.some((x) => x.toLowerCase() === value.toLowerCase())) {
      setCustomInterest('');
      return;
    }
    setData((prev) => ({ ...prev, interests: [...prev.interests, value] }));
    setCustomInterest('');
  };

  const addCustomHobby = () => {
    const value = normalizeCustomValue(customHobby);
    if (!value) return;
    if (data.hobbies.some((x) => x.toLowerCase() === value.toLowerCase())) {
      setCustomHobby('');
      return;
    }
    setData((prev) => ({ ...prev, hobbies: [...prev.hobbies, value] }));
    setCustomHobby('');
  };

  const primaryFooterLabel = useMemo(() => {
    if (currentStep === totalSteps) return 'Empezar';
    if (
      currentStep === ONBOARDING_INTEREST_STEP &&
      data.interests.length < MIN_INTEREST_SELECTION
    ) {
      return `Elige ${MIN_INTEREST_SELECTION - data.interests.length} más`;
    }
    if (
      currentStep === ONBOARDING_HOBBY_STEP &&
      data.hobbies.length < MIN_HOBBY_SELECTION
    ) {
      return `Elige ${MIN_HOBBY_SELECTION - data.hobbies.length} más`;
    }
    return 'Continuar';
  }, [
    currentStep,
    totalSteps,
    data.interests.length,
    data.hobbies.length,
  ]);

  /** Misma jerarquía visual que «¿Qué te apasiona?»: badge, título hero, subtítulo, tip opcional, cuerpo, pie opcional. */
  const onboardingInfoShell = (
    heroTitle: React.ReactNode,
    heroSub: string,
    tip: OnboardingInfoTip | null,
    children: React.ReactNode,
    footerHint?: string,
  ) => (
    <View style={[styles.stepWrap, styles.passionsWrap]}>
      <View style={styles.passionsBadgeRow}>
        <View style={styles.passionsBadge}>
          <Text style={styles.passionsBadgeText}>
            · PASO {currentStep} DE {totalSteps} ·
          </Text>
        </View>
      </View>
      <Text style={styles.passionsHeroTitle}>{heroTitle}</Text>
      <Text style={styles.passionsHeroSub}>{heroSub}</Text>
      {tip ? (
        <View style={styles.passionsTip}>
          <Ionicons name={tip.icon} size={20} color={theme.brandPurple} />
          <Text style={styles.passionsTipText}>{tip.content}</Text>
        </View>
      ) : null}
      {children}
      {footerHint ? <Text style={styles.selectedCount}>{footerHint}</Text> : null}
    </View>
  );

  const renderStep1 = () =>
    onboardingInfoShell(
      <>
        <Text style={{ color: theme.brandPurple }}>Fotos</Text>
        {' y '}
        <Text style={{ color: theme.brandPink }}>datos básicos</Text>
      </>,
      'La primera foto es tu portada. Nombre, nacimiento y género nos ayudan a conectar mejor.',
      {
        icon: 'camera-outline',
        content: (
          <>
            Subí <Text style={styles.passionsTipBold}>mínimo 2 fotos</Text> (hasta 6). Galería o cámara: en el móvil
            o PWA la cámara suele funcionar mejor.
          </>
        ),
      },
      <>
      <View style={styles.photosGrid}>
        {data.photos.map((photo, i) => (
          <View key={`${photo}-${i}`} style={styles.photoThumb}>
            <ProfileFillImage uri={profilePhotoThumbUri(photo)} />
            {i === 0 ? (
              <View style={styles.photoPrincipalBadge}>
                <Text style={styles.photoPrincipalText}>Principal</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={styles.photoRemove}
              onPress={() =>
                setData((prev) => ({ ...prev, photos: prev.photos.filter((_, idx) => idx !== i) }))
              }
            >
              <Ionicons name="close-circle" size={22} color={theme.brandPink} />
            </TouchableOpacity>
          </View>
        ))}
        {data.photos.length < 6 ? (
          <TouchableOpacity style={styles.photoAdd} onPress={promptPhotoSource} activeOpacity={0.85}>
            <Ionicons name="add" size={32} color={theme.textAccent} />
            <Text style={styles.photoAddText}>Añadir</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.photoSourceRow}>
        <TouchableOpacity style={styles.photoSourceBtn} onPress={pickPhotoFromGallery} activeOpacity={0.85}>
          <Ionicons name="images-outline" size={20} color={theme.textAccent} />
          <Text style={styles.photoSourceBtnText}>Galería</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.photoSourceBtn}
          onPress={pickPhotoFromCamera}
          activeOpacity={0.85}
          delayPressIn={Platform.OS === 'web' ? 0 : undefined}
          delayPressOut={Platform.OS === 'web' ? 0 : undefined}
        >
          <Ionicons name="camera-outline" size={20} color={theme.textAccent} />
          <Text style={styles.photoSourceBtnText}>Cámara</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.photoCount}>
        {data.photos.length}/6 fotos{data.photos.length < 2 ? ' · faltan al menos 2' : ''}
      </Text>

      <View style={styles.fieldWrap}>
        <Text style={styles.fieldLabel}>Nombre</Text>
        <TextInput
          style={styles.input}
          placeholder="Tu nombre"
          placeholderTextColor={placeholderColor}
          value={data.name}
          onChangeText={t => setData(d => ({ ...d, name: t }))}
        />
      </View>

      <View style={styles.fieldWrap}>
        <Text style={styles.fieldLabel}>Fecha de nacimiento</Text>
        <DatePickerInput
          value={data.dateOfBirth}
          onChange={v => setData(d => ({ ...d, dateOfBirth: v }))}
          placeholder="DD/MM/AAAA"
        />
      </View>

      <View style={styles.fieldWrap}>
        <Text style={styles.fieldLabel}>Género</Text>
        <View style={styles.btnRow}>
          {GENDERS.map(g => (
            <TouchableOpacity
              key={g.value}
              style={[styles.genderBtn, data.gender === g.value && styles.genderBtnActive]}
              onPress={() => setData(d => ({ ...d, gender: g.value }))}
              activeOpacity={0.75}
            >
              <Text style={[styles.genderBtnText, data.gender === g.value && styles.genderBtnTextActive]}>
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      </>,
    );

  const renderStep2 = () => {
    const programTrim = data.program.trim();
    const matchesQuick = PROGRAM_QUICK_OPTIONS.some((label) => label === programTrim);
    const customProgram = programTrim.length > 0 && !matchesQuick;

    return onboardingInfoShell(
      <>
        <Text style={{ color: theme.brandPurple }}>Vida</Text>
        {' '}
        <Text style={{ color: theme.brandPink }}>académica</Text>
      </>,
      'Carrera y semestre para encontrar personas de tu entorno en Kora.',
      null,
      <>
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Carrera o programa</Text>
          <View style={styles.programCard}>
            <TextInput
              ref={programInputRef}
              style={[
                styles.programValueInput,
                Platform.OS === 'web' ? ({ outlineStyle: 'none' as const, outlineWidth: 0 as const } as object) : null,
              ]}
              placeholder="Ej. Desarrollo de software, Psicología…"
              placeholderTextColor={placeholderColor}
              value={data.program}
              onChangeText={(t) => setData((d) => ({ ...d, program: t }))}
              autoCapitalize="words"
              accessibilityLabel="Tu carrera o programa"
            />
            <Text style={styles.programSectionLabel}>Opciones rápidas</Text>
            <View style={styles.programChipGrid}>
              {PROGRAM_QUICK_OPTIONS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.programPick, data.program === p && styles.programPickActive]}
                  onPress={() => setData((d) => ({ ...d, program: p }))}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.programPickLabel, data.program === p && styles.programPickLabelActive]}
                    numberOfLines={2}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.programPick,
                  styles.programPickWide,
                  customProgram && styles.programPickActive,
                ]}
                onPress={() => {
                  setData((d) => ({ ...d, program: '' }));
                  requestAnimationFrame(() => programInputRef.current?.focus?.());
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.programPickLabel, customProgram && styles.programPickLabelActive]}
                >
                  Otra carrera — escribir
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Semestre</Text>
          <TextInput
            style={[
              styles.input,
              Platform.OS === 'web' ? ({ outlineStyle: 'none' as const, outlineWidth: 0 as const } as object) : null,
            ]}
            placeholder="Ej: 6"
            placeholderTextColor={placeholderColor}
            value={data.semester}
            onChangeText={(raw) =>
              setData((d) => ({ ...d, semester: raw.replace(/\D/g, '').slice(0, 2) }))
            }
            keyboardType="number-pad"
            maxLength={2}
            accessibilityLabel="Semestre actual"
          />
          <Text style={styles.fieldHintSm}>Sólo número: 1 a 24 (posgrado, etc.).</Text>
        </View>
      </>,
    );
  };

  const renderStep4 = () =>
    onboardingInfoShell(
      <>
        Contá{' '}
        <Text style={{ color: theme.brandPurple }}>quién</Text>{' '}
        <Text style={{ color: theme.brandPink }}>eres</Text>
      </>,
      'Una bio auténtica y positiva marca la diferencia en tus matches.',
      {
        icon: 'sparkles',
        content: (
          <>
            Mencioná gustos y qué te hace único.{' '}
            <Text style={styles.passionsTipBold}>Te pedimos al menos 20 caracteres</Text> antes de seguir (lo
            validamos al avanzar).
          </>
        ),
      },
      <>
        <View style={styles.fieldWrap}>
          <TextInput
            style={[styles.input, { height: 140, textAlignVertical: 'top', paddingTop: 14 }]}
            placeholder="Cuéntanos algo sobre ti..."
            placeholderTextColor={placeholderColor}
            value={data.bio}
            onChangeText={t => setData(d => ({ ...d, bio: t }))}
            multiline
            maxLength={500}
          />
          <Text style={styles.charCount}>{data.bio.length}/500</Text>
        </View>
      </>,
      `${data.bio.length}/500 caracteres · refinás el tono después desde perfil`,
    );

  const renderStep5 = () => (
    <View style={[styles.stepWrap, styles.passionsWrap]}>
      <View style={styles.passionsBadgeRow}>
        <View style={styles.passionsBadge}>
          <Text style={styles.passionsBadgeText}>
            · PASO {currentStep} DE {totalSteps} ·
          </Text>
        </View>
      </View>

      <Text style={styles.passionsHeroTitle}>
        ¿Qué te <Text style={{ color: theme.brandPurple }}>apa</Text>
        <Text style={{ color: theme.brandPink }}>siona</Text>?
      </Text>
      <Text style={styles.passionsHeroSub}>
        Elige mínimo {MIN_INTEREST_SELECTION}. Así mejoramos tus conexiones en Kora Nova.
      </Text>

      <View style={styles.passionsTip}>
        <Ionicons name="sparkles" size={20} color={theme.brandPurple} />
        <Text style={styles.passionsTipText}>
          Marca tus intereses: los verás así en chats y cuando hagas match.{' '}
          <Text style={styles.passionsTipBold}>Mínimo {MIN_INTEREST_SELECTION}.</Text>
        </Text>
      </View>

      <View style={styles.passionsStatusRow}>
        <Text style={styles.passionsStatusMuted}>{data.interests.length} seleccionados</Text>
        <Text style={styles.passionsStatusMuted}>Mín. {MIN_INTEREST_SELECTION}</Text>
      </View>

      <View style={styles.customEntryRow}>
        <TextInput
          style={[
            styles.customEntryInput,
            Platform.OS === 'web'
              ? ({ outlineStyle: 'none' as const, outlineWidth: 0 as const } as object)
              : null,
          ]}
          value={customInterest}
          onChangeText={setCustomInterest}
          placeholder="Agregar interés (ej. Fotografía)"
          placeholderTextColor={placeholderColor}
          maxLength={32}
          onSubmitEditing={addCustomInterest}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.customEntryBtn} onPress={addCustomInterest} activeOpacity={0.8}>
          <Text style={styles.customEntryBtnText}>Agregar</Text>
        </TouchableOpacity>
      </View>

      {data.interests.length > 0 ? (
        <View style={styles.selectedCustomWrap}>
          {data.interests.map((label) => (
            <TouchableOpacity
              key={`sel-int-${label}`}
              style={styles.selectedCustomChip}
              onPress={() => toggleInterest(label)}
              activeOpacity={0.8}
            >
              <Text style={styles.selectedCustomText}>{label}</Text>
              <Ionicons name="close" size={14} color={theme.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <View style={styles.passionsList}>
        {INTEREST_PICK_OPTIONS.map((item, idx) => {
          const active = data.interests.includes(item.label);
          const ringColor = PASSION_RING_ACCENTS[idx % PASSION_RING_ACCENTS.length];
          return (
            <TouchableOpacity
              key={item.label}
              style={[styles.passionCard, active && styles.passionCardActive]}
              onPress={() => toggleInterest(item.label)}
              activeOpacity={0.75}
            >
              <View style={[styles.passionIconBadge, { borderColor: ringColor }]}>
                <Text style={styles.passionIconEmoji}>{item.icon}</Text>
              </View>
              <View style={styles.passionTextWrap}>
                <Text style={styles.passionRowTitle} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text style={styles.passionRowDesc}>{item.blurb}</Text>
              </View>
              {active ? (
                <Ionicons name="checkmark-circle" size={26} color={theme.brandPink} />
              ) : (
                <Ionicons name="ellipse-outline" size={26} color={theme.textMuted} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.selectedCount}>
        Podrás afinarlo más tarde desde tu perfil ({data.interests.length} ahora).
      </Text>
    </View>
  );

  const renderStep6 = () => (
    <View style={[styles.stepWrap, styles.passionsWrap]}>
      <View style={styles.passionsBadgeRow}>
        <View style={styles.passionsBadge}>
          <Text style={styles.passionsBadgeText}>
            · PASO {currentStep} DE {totalSteps} ·
          </Text>
        </View>
      </View>

      <Text style={styles.passionsHeroTitle}>
        ¿Qué haces en tu{' '}
        <Text style={{ color: theme.brandPurple }}>tiempo </Text>
        <Text style={{ color: theme.brandPink }}>libre</Text>?
      </Text>
      <Text style={styles.passionsHeroSub}>
        Elegí lo que te relaja o te llena fuera de clase (mínimo {MIN_HOBBY_SELECTION}).
      </Text>

      <View style={styles.passionsTip}>
        <Ionicons name="color-palette-outline" size={20} color={theme.brandPurple} />
        <Text style={styles.passionsTipText}>
          Tus hobbies son súper para romper el hielo en chat.{' '}
          <Text style={styles.passionsTipBold}>Seleccioná al menos {MIN_HOBBY_SELECTION}.</Text>
        </Text>
      </View>

      <View style={styles.passionsStatusRow}>
        <Text style={styles.passionsStatusMuted}>{data.hobbies.length} seleccionados</Text>
        <Text style={styles.passionsStatusMuted}>Mín. {MIN_HOBBY_SELECTION}</Text>
      </View>

      <View style={styles.customEntryRow}>
        <TextInput
          style={[
            styles.customEntryInput,
            Platform.OS === 'web'
              ? ({ outlineStyle: 'none' as const, outlineWidth: 0 as const } as object)
              : null,
          ]}
          value={customHobby}
          onChangeText={setCustomHobby}
          placeholder="Agregar hobby (ej. Ajedrez)"
          placeholderTextColor={placeholderColor}
          maxLength={32}
          onSubmitEditing={addCustomHobby}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.customEntryBtn} onPress={addCustomHobby} activeOpacity={0.8}>
          <Text style={styles.customEntryBtnText}>Agregar</Text>
        </TouchableOpacity>
      </View>

      {data.hobbies.length > 0 ? (
        <View style={styles.selectedCustomWrap}>
          {data.hobbies.map((label) => (
            <TouchableOpacity
              key={`sel-hob-${label}`}
              style={styles.selectedCustomChip}
              onPress={() => toggleHobby(label)}
              activeOpacity={0.8}
            >
              <Text style={styles.selectedCustomText}>{label}</Text>
              <Ionicons name="close" size={14} color={theme.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <View style={styles.passionsList}>
        {HOBBY_PICK_OPTIONS.map((item, idx) => {
          const active = data.hobbies.includes(item.label);
          const ringColor = PASSION_RING_ACCENTS[(idx + 2) % PASSION_RING_ACCENTS.length];
          return (
            <TouchableOpacity
              key={item.label}
              style={[styles.passionCard, active && styles.passionCardActive]}
              onPress={() => toggleHobby(item.label)}
              activeOpacity={0.75}
            >
              <View style={[styles.passionIconBadge, { borderColor: ringColor }]}>
                <Text style={styles.passionIconEmoji}>{item.icon}</Text>
              </View>
              <View style={styles.passionTextWrap}>
                <Text style={styles.passionRowTitle} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text style={styles.passionRowDesc}>{item.blurb}</Text>
              </View>
              {active ? (
                <Ionicons name="checkmark-circle" size={26} color={theme.brandPink} />
              ) : (
                <Ionicons name="ellipse-outline" size={26} color={theme.textMuted} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.selectedCount}>
        Seguís puliendo esto desde perfil cuando quieras ({data.hobbies.length} ahora).
      </Text>
    </View>
  );

  const renderStep7 = () =>
    onboardingInfoShell(
      <>
        ¿Qué{' '}
        <Text style={{ color: theme.brandPurple }}>buscas</Text>
        ?
      </>,
      'Tu intención y a quién te gustaría conocer mejor en la comunidad.',
      {
        icon: 'heart-outline',
        content: (
          <>
            Elegí con honestidad:{' '}
            <Text style={styles.passionsTipBold}>esto orienta tus sugerencias</Text>. Lo revisás cuando quieras en
            ajustes.
          </>
        ),
      },
      <>
      <View style={styles.cardGroup}>
        <Text style={styles.groupLabel}>Tu intención</Text>
        <View style={styles.btnRow}>
          {RELATIONSHIP_GOALS.map(g => {
            const active = data.preferences.relationshipGoal === g.value;
            return (
              <TouchableOpacity
                key={g.value}
                style={[styles.goalBtn, active && styles.goalBtnActive]}
                onPress={() => setData(d => ({
                  ...d, preferences: { ...d.preferences, relationshipGoal: g.value }
                }))}
                activeOpacity={0.75}
              >
                <Text style={styles.goalBtnEmoji}>{g.emoji}</Text>
                <Text style={[styles.goalBtnText, active && styles.goalBtnTextActive]}>{g.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.cardGroup}>
        <Text style={styles.groupLabel}>Prefiero conocer</Text>
        <View style={styles.btnRow}>
          {SHOW_ME_OPTIONS.map(opt => {
            const active = data.preferences.showMeTo === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.showMeBtn, active && styles.showMeBtnActive]}
                onPress={() => setData(d => ({
                  ...d, preferences: { ...d.preferences, showMeTo: opt.value }
                }))}
                activeOpacity={0.75}
              >
                <Text style={[styles.showMeText, active && styles.showMeTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      </>,
      'Siguiente: afinamos edad y distancia para tus sugerencias.',
    );

  const renderStep8 = () =>
    onboardingInfoShell(
      <>
        <Text style={{ color: theme.brandPurple }}>Tus</Text>{' '}
        <Text style={{ color: theme.brandPink }}>preferencias</Text>
      </>,
      'Rango de edad y distancia máxima. Cambiás todo esto después en ajustes.',
      {
        icon: 'options-outline',
        content: (
          <>
            Tip: un rango algo más amplio suma personas cerca que quizá ni mirabas al inicio —{' '}
            <Text style={styles.passionsTipBold}>siempre editable</Text>.
          </>
        ),
      },
      <>
      <View style={styles.cardGroup}>
        <Text style={styles.groupLabel}>
          Rango de edad: {data.preferences.ageMin} – {data.preferences.ageMax} años
        </Text>
        <View style={styles.ageRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ageLabel}>Mínima</Text>
            <View style={styles.btnRow}>
              {[18, 20, 22, 25].map(age => (
                <TouchableOpacity
                  key={age}
                  style={[styles.ageBtn, data.preferences.ageMin === age && styles.ageBtnActive]}
                  onPress={() => setData(d => ({ ...d, preferences: { ...d.preferences, ageMin: age } }))}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.ageBtnText, data.preferences.ageMin === age && styles.ageBtnTextActive]}>{age}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ageLabel}>Máxima</Text>
            <View style={styles.btnRow}>
              {[25, 28, 30, 35].map(age => (
                <TouchableOpacity
                  key={age}
                  style={[styles.ageBtn, data.preferences.ageMax === age && styles.ageBtnActive]}
                  onPress={() => setData(d => ({ ...d, preferences: { ...d.preferences, ageMax: age } }))}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.ageBtnText, data.preferences.ageMax === age && styles.ageBtnTextActive]}>{age}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.cardGroup}>
        <Text style={styles.groupLabel}>Distancia máxima</Text>
        <Text style={styles.distanceValue}>{data.preferences.maxDistance} km</Text>
        <View style={styles.btnRow}>
          {DISTANCE_OPTIONS.map(km => (
            <TouchableOpacity
              key={km}
              style={[styles.distBtn, data.preferences.maxDistance === km && styles.distBtnActive]}
              onPress={() => setData(d => ({ ...d, preferences: { ...d.preferences, maxDistance: km } }))}
              activeOpacity={0.75}
            >
              <Text style={[styles.distBtnText, data.preferences.maxDistance === km && styles.distBtnTextActive]}>{km} km</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      </>,
      'Último paso: tocá «Empezar» cuando estés conforme.',
    );

  const renderStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep4();
      case 4: return renderStep5();
      case 5: return renderStep6();
      case 6: return renderStep7();
      case 7: return renderStep8();
      default: return null;
    }
  };

  return (
    <View style={[styles.screen, isDark && { backgroundColor: KORA_BG }]}>
      {!isDark && (
        <>
          <LinearGradient
            colors={['#FFFFFF', '#F8F9FA', '#EDE9FC']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.3, y: 0 }}
            end={{ x: 0.7, y: 1 }}
          />
          <LinearGradient
            colors={['rgba(108,92,231,0.22)', 'transparent']}
            style={styles.glowTopLeft}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <LinearGradient
            colors={['transparent', 'rgba(255,107,139,0.22)']}
            style={styles.glowBottomRight}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </>
      )}
      <View style={styles.progressWrap}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View key={i} style={[styles.progressBar, i < currentStep && styles.progressBarActive]} />
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderStep()}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          disabled={currentStep === 1}
          activeOpacity={0.8}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={currentStep === 1 ? theme.textMuted : theme.text}
          />
        </TouchableOpacity>

        <NovaGradientButton
          title={primaryFooterLabel}
          onPress={handleNext}
          disabled={loading}
          loading={loading}
          style={{ flex: 1 }}
          iconRight={
            !loading && currentStep < totalSteps ? (
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            ) : !loading && currentStep === totalSteps ? (
              <Ionicons name="sparkles" size={18} color="#fff" />
            ) : undefined
          }
        />
      </View>

      <Modal
        visible={photoSourceModalVisible && Platform.OS === 'web'}
        transparent
        animationType="fade"
        onRequestClose={closePhotoSourceModal}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <Pressable style={{ flex: 1 }} accessibilityRole="button" onPress={closePhotoSourceModal} />
          <View
            style={{
              paddingBottom: 28,
              paddingTop: 8,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              backgroundColor: theme.surface,
              borderTopWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text, textAlign: 'center', paddingVertical: 12 }}>
              Añadir foto
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: theme.textMuted,
                textAlign: 'center',
                paddingHorizontal: 22,
                marginBottom: 16,
              }}
            >
              Elige galería o cámara (en el navegador la cámara usa vista previa en vivo).
            </Text>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                marginHorizontal: 16,
                paddingVertical: 16,
                paddingHorizontal: 16,
                borderRadius: 14,
                backgroundColor: theme.surface2,
                borderWidth: 1,
                borderColor: theme.border,
                marginBottom: 10,
              }}
              activeOpacity={0.85}
              onPress={onWebModalGallery}
            >
              <Ionicons name="images-outline" size={24} color={theme.textAccent} />
              <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: theme.text }}>Galería</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                marginHorizontal: 16,
                paddingVertical: 16,
                paddingHorizontal: 16,
                borderRadius: 14,
                backgroundColor: theme.surface2,
                borderWidth: 1,
                borderColor: theme.border,
                marginBottom: 10,
              }}
              activeOpacity={0.85}
              onPress={onWebModalCamera}
            >
              <Ionicons name="camera-outline" size={24} color={theme.textAccent} />
              <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: theme.text }}>Cámara</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginHorizontal: 16, paddingVertical: 14, alignItems: 'center' }}
              activeOpacity={0.7}
              onPress={closePhotoSourceModal}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: theme.textMuted }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
