import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import EmojiPicker, { es } from 'rn-emoji-keyboard';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { CommonActions } from '@react-navigation/native';
import { messageService } from '../services/message.service';
import { useAuth } from '../context/AuthContext';
import { Message, Match } from '../types';
import {
  ensureCameraAccess,
  ensureMediaLibraryAccess,
  ensureMediaLibrarySaveAccess,
  ensureMicrophoneAccess,
} from '../utils/permissions';
import { saveChatImageToGallery } from '../utils/saveChatImage';
import { KORA_GRADIENT } from '../design/koraNova';
import { useTheme, type Theme } from '../context/ThemeContext';
import { createChatStyles, chatIconColors } from './chatScreenStyles';
import ImageCropEditorModal from '../components/ImageCropEditorModal';
import ReportUserModal from '../components/ReportUserModal';
import { capturePhotoViaInlineWebcam } from '../utils/webCameraCapture';
import { uploadChatAsset, resolveChatAttachmentUrl, isRemoteImageUrl } from '../services/upload.service';
import { firstProfilePhoto } from '../utils/profilePhotos';

// ─── Audio (expo-av): carga perezosa; en web la grabación usa MediaRecorder ──
let AudioLib: any = null;
try {
  AudioLib = require('expo-av').Audio;
} catch {
  AudioLib = null;
}

// ─── Types ───────────────────────────────────────────────────────────────────
type ExtMsg = Message & {
  _audioUri?: string;
  _fileName?: string;
  _fileSize?: number;
  _localId?: string;
};

type PendingAttachment =
  | { type: 'image'; uri: string; visibilitySeconds?: number | null }
  | { type: 'document'; name: string; uri?: string; mimeType?: string; size?: number; visibilitySeconds?: number | null }
  | { type: 'audio'; uri: string; name: string; mimeType: string; durationSec?: number; visibilitySeconds?: number | null };

type ViewerAsset =
  | { type: 'image'; uri: string; name: string }
  | { type: 'file'; uri: string; name: string };

// ─── Constants ───────────────────────────────────────────────────────────────
const ONLINE = '#34D399';
const EMOJI_QUICK = [
  '😀', '😊', '😉', '😍', '🥰', '😎',
  '❤️', '💜', '💕', '🔥', '✨', '💫',
  '👍', '👏', '🙌', '🙏', '🤝', '😂',
  '🎉', '🎵', '📚', '☕', '🍕', '🌙',
];

const AVATAR_COLORS = ['#6C5CE7', '#FF6B8B', '#00CEC9', '#FDCB6E', '#E17055', '#A29BFE'];

const ICEBREAKERS = [
  '¿Cuál fue el mejor momento de tu semestre?',
  'Si pudieras ir a cualquier lugar ahora, ¿a dónde irías?',
  '¿Qué canción has tenido en loop esta semana?',
  '¿Prefieres estudiar de mañana o de noche?',
  '¿Cuál es tu lugar favorito del campus?',
  '¿Café o té cuando estudias?',
];

function alertUser(title: string, message: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

/** Edge/Chromium pueden rechazar un mime concreto; probamos varios y el predeterminado del navegador. */
function createWebMediaRecorder(stream: MediaStream): MediaRecorder {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Este navegador no expone MediaRecorder para grabar audio.');
  }
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  for (const mimeType of candidates) {
    if (!MediaRecorder.isTypeSupported(mimeType)) continue;
    try {
      return new MediaRecorder(stream, { mimeType });
    } catch {
      /* intentar siguiente */
    }
  }
  return new MediaRecorder(stream);
}

const GOAL_LABELS: Record<string, string> = {
  FRIENDSHIP: 'Amistad',
  DATING: 'Citas',
  SERIOUS_RELATIONSHIP: 'Relación seria',
  JUST_MEETING_PEOPLE: 'Conocer gente',
  STUDY_GROUPS: 'Grupos de estudio',
};

const VISIBILITY_OPTIONS: Array<{ label: string; seconds: number | null }> = [
  { label: 'Siempre', seconds: null },
  { label: '24h', seconds: 24 * 60 * 60 },
  { label: '1h', seconds: 60 * 60 },
  { label: '10m', seconds: 10 * 60 },
];

function buildAttachmentType(mime: string, visibilitySeconds?: number | null): string {
  if (visibilitySeconds && visibilitySeconds > 0) return `${mime}|ttl=${visibilitySeconds}`;
  return mime;
}

function parseAttachmentMeta(raw?: string): { mime: string; ttlSec: number | null } {
  const src = (raw || '').trim();
  if (!src) return { mime: '', ttlSec: null };
  const [mime, ...parts] = src.split('|');
  let ttlSec: number | null = null;
  for (const part of parts) {
    const p = part.trim().toLowerCase();
    if (!p.startsWith('ttl=')) continue;
    const v = parseInt(p.slice(4), 10);
    if (Number.isFinite(v) && v > 0) ttlSec = v;
  }
  return { mime, ttlSec };
}

function inferFileNameFromUrl(url: string): string {
  const clean = (url || '').split('?')[0];
  const seg = clean.split('/').filter(Boolean).pop();
  return seg || 'archivo';
}

function hasExpiredByTtl(sentAt: string, ttlSec: number | null): boolean {
  if (!ttlSec || ttlSec <= 0) return false;
  const created = new Date(sentAt).getTime();
  if (!Number.isFinite(created)) return false;
  return Date.now() > created + ttlSec * 1000;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const parseArr = (v: any): string[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v); } catch { return []; }
};

function getInitials(name: string): string {
  const p = name.trim().split(' ');
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function fmtTime(d: string): string {
  return new Date(d).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function fmtDay(d: string): string {
  const dt = new Date(d);
  const now = new Date();
  if (dt.toDateString() === now.toDateString()) return 'Hoy';
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (dt.toDateString() === yest.toDateString()) return 'Ayer';
  return dt.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
}

function fmtDurationClock(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds || 0));
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function formatVisibilityLabel(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return 'Siempre visible';
  if (seconds % (24 * 60 * 60) === 0) {
    const days = seconds / (24 * 60 * 60);
    return `Se ocultará en ${days} día${days === 1 ? '' : 's'}`;
  }
  if (seconds % (60 * 60) === 0) {
    const hours = seconds / (60 * 60);
    return `Se ocultará en ${hours} hora${hours === 1 ? '' : 's'}`;
  }
  if (seconds % 60 === 0) {
    const minutes = seconds / 60;
    return `Se ocultará en ${minutes} minuto${minutes === 1 ? '' : 's'}`;
  }
  return `Se ocultará en ${seconds} segundo${seconds === 1 ? '' : 's'}`;
}

function sameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

// ─── DateSeparator ───────────────────────────────────────────────────────────
const DateSep = ({ label, ds }: { label: string; ds: { row: any; pill: any } }) => (
  <View style={ds.row}>
    <Text style={ds.pill}>{label}</Text>
  </View>
);

// ─── MessageBubble ───────────────────────────────────────────────────────────
const MsgBubble = ({
  msg,
  isOwn,
  bub,
  theme,
  onSaveImage,
  onOpenImage,
  onDownloadImage,
  onOpenAttachment,
  onDownloadAttachment,
  playingVoiceMessageId,
  onToggleVoiceNote,
}: {
  msg: ExtMsg;
  isOwn: boolean;
  bub: any;
  theme: Theme;
  onSaveImage?: (uri: string) => void;
  onOpenImage?: (uri: string) => void;
  onDownloadImage?: (uri: string) => void;
  onOpenAttachment?: (uri: string) => void;
  onDownloadAttachment?: (uri: string) => void;
  playingVoiceMessageId?: string | null;
  onToggleVoiceNote?: (rawUrl: string, messageId: string) => void;
}) => {
  const images = parseArr(msg.images);
  const attachmentNames = parseArr((msg as any).attachmentNames);
  const attachmentTypes = parseArr((msg as any).attachmentTypes);
  const firstAttachmentName = attachmentNames[0] || '';
  const firstAttachmentDisplayName =
    typeof firstAttachmentName === 'string' && firstAttachmentName
      ? inferFileNameFromUrl(firstAttachmentName)
      : '';
  const firstAttachmentType = attachmentTypes[0] ?? '';
  const attachmentMeta = parseAttachmentMeta(firstAttachmentType);
  const isAudioAttachment = attachmentMeta.mime.startsWith('audio/');
  const hasAttachmentFile = !!firstAttachmentName;
  const expired = hasExpiredByTtl(msg.sentAt, attachmentMeta.ttlSec);
  const time = fmtTime(msg.sentAt);
  const firstImg = images[0];
  const chatImageUri = firstImg ? resolveChatAttachmentUrl(String(firstImg)) : '';

  const demoAudioOnly = msg._audioUri === 'demo_audio';
  const voiceRawForPlayback =
    isAudioAttachment && firstAttachmentName
      ? String(firstAttachmentName)
      : demoAudioOnly || !msg._audioUri
        ? ''
        : String(msg._audioUri).trim();
  const isPlayingVoice =
    !!(playingVoiceMessageId && playingVoiceMessageId === msg.id && voiceRawForPlayback);
  const onPressVoiceNote = () => {
    if (demoAudioOnly) {
      alertUser('Demo', 'En el modo demo este audio es solo visual.');
      return;
    }
    if (!voiceRawForPlayback || !onToggleVoiceNote) return;
    onToggleVoiceNote(voiceRawForPlayback, msg.id);
  };

  const imageBlock =
    !!firstImg &&
    !!chatImageUri &&
    (onSaveImage ? (
      <Pressable
        accessibilityRole="image"
        accessibilityHint="Toca para abrir, mantén para más opciones"
        onPress={() => onOpenImage?.(chatImageUri)}
        delayLongPress={380}
        onLongPress={() => {
          Alert.alert('Imagen', '¿Qué deseas hacer?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Ver', onPress: () => onOpenImage?.(chatImageUri) },
            { text: 'Descargar', onPress: () => onDownloadImage?.(chatImageUri) },
            { text: 'Guardar', onPress: () => onSaveImage(chatImageUri) },
          ]);
        }}
      >
        <Image source={{ uri: chatImageUri }} style={bub.img} resizeMode="cover" />
      </Pressable>
    ) : (
      <Pressable onPress={() => onOpenImage?.(chatImageUri)}>
        <Image source={{ uri: chatImageUri }} style={bub.img} resizeMode="cover" />
      </Pressable>
    ));

  const inner = (
    <>
      {!expired && imageBlock}
      {!expired && (!!msg._audioUri || isAudioAttachment) && (
        <Pressable
          style={bub.audioRow}
          accessibilityRole="button"
          accessibilityLabel="Reproducir nota de voz"
          onPress={onPressVoiceNote}
        >
          <Ionicons
            name={isPlayingVoice ? 'pause-circle' : 'play-circle'}
            size={28}
            color={isOwn ? '#fff' : theme.brandPurple}
          />
          <View style={[bub.audioWave, { backgroundColor: isOwn ? 'rgba(255,255,255,0.3)' : 'rgba(108,92,231,0.3)' }]} />
          <Text style={[bub.audioDur, { color: isOwn ? 'rgba(255,255,255,0.6)' : theme.textMuted }]}>
            {msg._audioUri ? '0:05' : 'Audio'}
          </Text>
        </Pressable>
      )}
      {!expired && (!!msg._fileName || (hasAttachmentFile && !isAudioAttachment)) && (
        <Pressable
          style={bub.fileRow}
          onPress={() => {
            if (firstAttachmentName) onOpenAttachment?.(firstAttachmentName);
          }}
          onLongPress={() => {
            if (!firstAttachmentName) return;
            Alert.alert('Archivo', '¿Qué deseas hacer?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Abrir', onPress: () => onOpenAttachment?.(firstAttachmentName) },
              { text: 'Descargar', onPress: () => onDownloadAttachment?.(firstAttachmentName) },
            ]);
          }}
        >
          <View style={[bub.fileIcon, { backgroundColor: isOwn ? 'rgba(255,255,255,0.15)' : 'rgba(108,92,231,0.15)' }]}>
            <Ionicons
              name="document-text-outline"
              size={16}
              color={isOwn ? '#fff' : theme.isDark ? '#A29BFE' : theme.brandPurple}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[bub.fileName, { color: isOwn ? 'rgba(255,255,255,0.95)' : theme.text }]} numberOfLines={1}>
              {msg._fileName || firstAttachmentDisplayName}
            </Text>
            {!!msg._fileSize && (
              <Text style={bub.fileSize}>{(msg._fileSize / 1024).toFixed(0)} KB</Text>
            )}
          </View>
        </Pressable>
      )}
      {expired && <Text style={bub.expiredTxt}>Adjunto expirado</Text>}
      {!!msg.content && (
        <Text style={isOwn ? bub.ownTxt : bub.otherTxt}>{msg.content}</Text>
      )}
    </>
  );

  if (isOwn) {
    return (
      <View style={bub.ownWrap}>
        <LinearGradient
          colors={[...KORA_GRADIENT]}
          style={bub.ownBubble}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {inner}
          <View style={bub.meta}>
            <Text style={bub.ownTime}>{time}</Text>
            <Ionicons
              name={msg.isRead ? 'checkmark-done' : 'checkmark'}
              size={12}
              color={msg.isRead ? '#A29BFE' : 'rgba(255,255,255,0.45)'}
              style={{ marginLeft: 3 }}
            />
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={bub.otherWrap}>
      <View style={bub.otherBubble}>
        {inner}
        <Text style={bub.otherTime}>{time}</Text>
      </View>
    </View>
  );
};

// ─── IceBreakerCard ──────────────────────────────────────────────────────────
const IceBreakerCard = ({
  question,
  onUse,
  ic,
  sparkleColor,
}: {
  question: string;
  onUse: () => void;
  ic: any;
  sparkleColor: string;
}) => (
  <View style={ic.card}>
    <View style={ic.sparkWrap}>
      <Ionicons name="sparkles" size={16} color={sparkleColor} />
    </View>
    <Text style={ic.q} numberOfLines={2}>
      {question}
    </Text>
    <TouchableOpacity style={ic.btn} onPress={onUse} activeOpacity={0.8}>
      <Text style={ic.btnTxt}>Usar</Text>
    </TouchableOpacity>
  </View>
);

// ─── AttachMenu ──────────────────────────────────────────────────────────────
const ATTACH_ITEMS = [
  { id: 'camera', icon: 'camera-outline', label: 'Cámara', color: '#A29BFE' },
  { id: 'gallery', icon: 'image-outline', label: 'Galería', color: '#FF6B8B' },
  { id: 'document', icon: 'document-outline', label: 'Archivo', color: '#00CEC9' },
];

type AttachMenuProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  at: any;
  chevronColor: string;
};

const AttachMenu = ({ visible, onClose, onSelect, at, chevronColor }: AttachMenuProps) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={at.overlayRoot}>
      <TouchableOpacity style={at.flexTap} onPress={onClose} activeOpacity={1} />
      <SafeAreaView edges={['bottom']} style={at.sheetOuter}>
        <View style={at.sheetInner}>
          <View style={at.handle} />
          <Text style={at.title}>Adjuntar</Text>
          {ATTACH_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={at.row}
              onPress={() => {
                onClose();
                onSelect(item.id);
              }}
              activeOpacity={0.75}
            >
              <View style={[at.iconWrap, { backgroundColor: item.color + '22' }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={at.label}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={chevronColor} />
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </View>
  </Modal>
);

/** Hoja emoji compacta sólo para web (picker completo nativo usa rn-emoji-keyboard). */
const EmojiPickerSheet = ({
  visible,
  onClose,
  onPick,
  em,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (emoji: string) => void;
  em: any;
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={em.overlayRoot}>
      <TouchableOpacity style={em.flexTap} onPress={onClose} activeOpacity={1} />
      <SafeAreaView edges={['bottom']} style={em.sheetOuter}>
        <View style={em.sheetInner}>
          <View style={em.handle} />
          <Text style={em.title}>Emojis rápidos</Text>
          <View style={em.grid}>
            {EMOJI_QUICK.map((e) => (
              <TouchableOpacity
                key={e}
                style={em.emojiCell}
                onPress={() => {
                  onPick(e);
                  onClose();
                }}
                activeOpacity={0.75}
              >
                <Text style={em.emojiChar}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </View>
  </Modal>
);

// ─── Demo messages ────────────────────────────────────────────────────────────
const DEMO_SENDER_ID = '__demo_other__';
const now = new Date();
const d = (minutesAgo: number) =>
  new Date(now.getTime() - minutesAgo * 60 * 1000).toISOString();

const DEMO_MESSAGES: ExtMsg[] = [
  {
    id: 'dm1', matchId: 'demo', senderId: '__me__',
    content: 'Hola! Vi que también te gusta el café ☕ ¿cuál es tu lugar favorito del campus?',
    images: [], attachmentNames: [], attachmentTypes: [],
    isRead: true, sentAt: d(62),
  },
  {
    id: 'dm2', matchId: 'demo', senderId: DEMO_SENDER_ID,
    content: '¡Hola! Sí, me encanta el cafecito entre clases. El kiosco del bloque 4 tiene el mejor tinto.',
    images: [], attachmentNames: [], attachmentTypes: [],
    isRead: true, sentAt: d(60),
  },
  {
    id: 'dm3', matchId: 'demo', senderId: '__me__',
    content: '¡Exacto! Oye, ¿tú también tienes parcial de Cálculo la próxima semana?',
    images: [], attachmentNames: [], attachmentTypes: [],
    isRead: true, sentAt: d(58),
  },
  {
    id: 'dm4', matchId: 'demo', senderId: DEMO_SENDER_ID,
    content: 'Jaja sí, estoy sobreviviendo con derivadas 😅 ¿Estudias en grupo normalmente?',
    images: [], attachmentNames: [], attachmentTypes: [],
    isRead: true, sentAt: d(55),
  },
  {
    id: 'dm5', matchId: 'demo', senderId: '__me__',
    content: '', images: ['https://picsum.photos/seed/kora/400/300'],
    attachmentNames: [], attachmentTypes: [],
    isRead: true, sentAt: d(40),
  },
  {
    id: 'dm6', matchId: 'demo', senderId: DEMO_SENDER_ID,
    content: '¡Qué foto tan linda! ¿Eso es en el campus?',
    images: [], attachmentNames: [], attachmentTypes: [],
    isRead: true, sentAt: d(38),
  },
  {
    id: 'dm7', matchId: 'demo', senderId: '__me__',
    content: '', images: [], attachmentNames: ['Apuntes_Calculo.pdf'], attachmentTypes: ['application/pdf'],
    isRead: true, sentAt: d(20),
    _fileName: 'Apuntes_Calculo.pdf', _fileSize: 245000,
  },
  {
    id: 'dm8', matchId: 'demo', senderId: DEMO_SENDER_ID,
    content: 'Qué genial, gracias por compartir los apuntes!',
    images: [], attachmentNames: [], attachmentTypes: [],
    isRead: true, sentAt: d(18),
  },
  {
    id: 'dm9', matchId: 'demo', senderId: '__me__',
    content: '',  images: [], attachmentNames: [], attachmentTypes: [],
    isRead: false, sentAt: d(5),
    _audioUri: 'demo_audio',
  },
  {
    id: 'dm10', matchId: 'demo', senderId: DEMO_SENDER_ID,
    content: '¡Qué buena voz! Oye, ¿quieres que estudiemos juntos el sábado?',
    images: [], attachmentNames: [], attachmentTypes: [],
    isRead: false, sentAt: d(2),
  },
];

// ─── ChatScreen ──────────────────────────────────────────────────────────────
const ChatScreen = ({ route, navigation }: any) => {
  const { matchId, matchData } = route.params ?? {};
  const { user } = useAuth();
  const { theme } = useTheme();
  const st = useMemo(() => createChatStyles(theme), [theme]);
  const icon = useMemo(() => chatIconColors(theme), [theme]);
  const emojiKeyboardTheme = useMemo(
    () => ({
      backdrop: 'rgba(0,0,0,0.62)',
      knob: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(18,18,35,0.12)',
      container: theme.bg,
      header: theme.text,
      skinTonesContainer: theme.surface2,
      category: {
        icon: theme.textMuted,
        iconActive: '#A29BFE',
        container: 'transparent',
        containerActive: 'rgba(108,92,231,0.22)',
      },
      search: {
        background: theme.surface2,
        text: theme.text,
        placeholder: theme.textMuted,
        icon: '#A29BFE',
      },
      customButton: {
        icon: theme.text,
        iconPressed: '#A29BFE',
        background: theme.surface2,
        backgroundPressed: 'rgba(108,92,231,0.28)',
      },
      emoji: { selected: 'rgba(108,92,231,0.38)' },
    }),
    [theme],
  );
  const insets = useSafeAreaInsets();

  // Derive other user info
  const match: Match | undefined = matchData;
  const otherUser = match
    ? (match.user1Id === user?.id ? match.user2 : match.user1)
    : undefined;
  const otherName = (otherUser as any)?.profile?.name ?? 'Match';
  const otherAge = (otherUser as any)?.profile?.age ?? '';
  const otherPhotoUri = firstProfilePhoto((otherUser as any)?.profile?.photos as unknown);
  const otherColor = getAvatarColor(otherName);
  const otherInitials = getInitials(otherName);

  const otherUserId = useMemo(() => {
    if (!match || !user?.id) return undefined;
    return match.user1Id === user.id ? match.user2Id : match.user1Id;
  }, [match, user?.id]);

  // Shared interests
  const myInterests = parseArr((user as any)?.profile?.interests);
  const theirInterests = parseArr((otherUser as any)?.profile?.interests);
  const myHobbies = parseArr((user as any)?.profile?.hobbies);
  const theirHobbies = parseArr((otherUser as any)?.profile?.hobbies);
  const myGoal = (user as any)?.profile?.relationshipGoal ?? '';
  const theirGoal = (otherUser as any)?.profile?.relationshipGoal ?? '';
  const shared = myInterests.length > 0 && theirInterests.length > 0
    ? myInterests.filter((i: string) => theirInterests.includes(i))
    : [];
  const sharedHobbies = myHobbies.length > 0 && theirHobbies.length > 0
    ? myHobbies.filter((h: string) => theirHobbies.includes(h))
    : [];
  const sameGoal = Boolean(myGoal && theirGoal && myGoal === theirGoal);

  const myProfName = (user as any)?.profile?.name ?? 'Tú';
  const matchMyInitials = getInitials(myProfName);

  // State
  const [messages, setMessages] = useState<ExtMsg[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [showBanner, setShowBanner] = useState(true);
  const [showAttach, setShowAttach] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recObj, setRecObj] = useState<any>(null);
  const [recSecs, setRecSecs] = useState(0);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showScrollFab, setShowScrollFab] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [customVisibilityMinutes, setCustomVisibilityMinutes] = useState('');
  const [customVisibilityUnit, setCustomVisibilityUnit] = useState<'min' | 'hour' | 'day'>('min');
  const [viewerAsset, setViewerAsset] = useState<ViewerAsset | null>(null);
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  const [showCompatibilityModal, setShowCompatibilityModal] = useState(false);
  const [showImageCrop, setShowImageCrop] = useState(false);
  const [playingVoiceMessageId, setPlayingVoiceMessageId] = useState<string | null>(null);

  const canReport = Boolean(otherUserId && matchId && matchId !== 'demo' && !isDemoMode);

  const otherLastActivity = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.senderId !== user?.id) return m.sentAt;
    }
    return null;
  }, [messages, user?.id]);

  const isOtherRecentlyOnline = useMemo(() => {
    if (!otherLastActivity) return false;
    const t = new Date(otherLastActivity).getTime();
    if (!Number.isFinite(t)) return false;
    return Date.now() - t < 5 * 60 * 1000;
  }, [otherLastActivity]);

  const onlineLabel = useMemo(() => {
    if (!otherLastActivity) return 'Sin actividad reciente';
    if (isOtherRecentlyOnline) return 'Activo hace un momento';
    const dt = new Date(otherLastActivity);
    return `Última actividad ${dt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;
  }, [otherLastActivity, isOtherRecentlyOnline]);

  const compatibility = useMemo(() => {
    const interestsRatio =
      myInterests.length > 0 && theirInterests.length > 0
        ? shared.length / Math.max(myInterests.length, theirInterests.length)
        : 0;
    const hobbiesRatio =
      myHobbies.length > 0 && theirHobbies.length > 0
        ? sharedHobbies.length / Math.max(myHobbies.length, theirHobbies.length)
        : 0;
    const score = Math.round(interestsRatio * 55 + hobbiesRatio * 30 + (sameGoal ? 15 : 0));
    const tone =
      score >= 75 ? { label: 'Alta', color: '#06D6A0' } :
      score >= 45 ? { label: 'Media', color: '#FDCB6E' } :
      { label: 'Baja', color: '#FF6B8B' };
    return {
      score: Math.max(0, Math.min(100, score)),
      tone,
      sharedInterests: shared,
      sharedHobbies,
      sameGoal,
    };
  }, [myInterests, theirInterests, myHobbies, theirHobbies, shared, sharedHobbies, sameGoal]);

  const openVideoCallInfo = () => {
    alertUser('Videollamada', 'Próximamente podrás iniciar videollamadas desde este chat.');
  };

  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput | null>(null);
  const timerRef = useRef<any>(null);
  const webRecorderRef = useRef<any>(null);
  const webChunksRef = useRef<Blob[]>([]);
  const webStreamRef = useRef<MediaStream | null>(null);
  const iceIdx = useRef(Math.floor(Math.random() * ICEBREAKERS.length));
  const voicePlaybackRef = useRef<
    | { kind: 'web'; msgId: string; el: HTMLAudioElement }
    | { kind: 'native'; msgId: string; sound: any }
    | null
  >(null);

  useEffect(() => {
    if (!pendingAttachment) {
      setCustomVisibilityMinutes('');
      setCustomVisibilityUnit('min');
      return;
    }
    const ttl = pendingAttachment.visibilitySeconds ?? null;
    if (!ttl || ttl <= 0) {
      setCustomVisibilityMinutes('');
      return;
    }
    const isPreset = VISIBILITY_OPTIONS.some((opt) => opt.seconds === ttl);
    if (isPreset) {
      setCustomVisibilityMinutes('');
      setCustomVisibilityUnit('min');
      return;
    }
    const asDays = ttl / (24 * 60 * 60);
    const asHours = ttl / (60 * 60);
    const asMinutes = ttl / 60;
    if (Number.isInteger(asDays)) {
      setCustomVisibilityUnit('day');
      setCustomVisibilityMinutes(String(asDays));
      return;
    }
    if (Number.isInteger(asHours)) {
      setCustomVisibilityUnit('hour');
      setCustomVisibilityMinutes(String(asHours));
      return;
    }
    setCustomVisibilityUnit('min');
    setCustomVisibilityMinutes(String(Math.max(1, Math.round(asMinutes))));
  }, [pendingAttachment]);

  useEffect(() => {
    if (!pendingAttachment) setShowImageCrop(false);
  }, [pendingAttachment]);

  // Load messages
  useEffect(() => {
    (async () => {
      try {
        const data = await messageService.getMessages(matchId);
        setMessages(data as ExtMsg[]);
      } catch {
        setMessages([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [matchId]);

  const scrollEnd = () =>
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      if (contentSize.height <= 0) return;
      const threshold = 80;
      const fromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      setShowScrollFab(fromBottom > threshold && messages.length > 3);
    },
    [messages.length]
  );

  const loadDemoMessages = () => {
    // Replace sender IDs with actual user ID so isOwn works correctly
    const demo = DEMO_MESSAGES.map((m) => ({
      ...m,
      matchId: matchId ?? 'demo',
      senderId: m.senderId === '__me__' ? (user?.id ?? '__me__') : DEMO_SENDER_ID,
    }));
    setMessages(demo);
    setIsDemoMode(true);
    setShowBanner(false);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 200);
  };

  const exitDemo = () => {
    setMessages([]);
    setIsDemoMode(false);
    setShowBanner(true);
    setLoading(true);
    (async () => {
      try {
        const data = await messageService.getMessages(matchId);
        setMessages(data as ExtMsg[]);
      } catch {
        setMessages([]);
      } finally {
        setLoading(false);
      }
    })();
  };

  // ─── Send text ────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const content = text.trim();
    if (!content) return;
    setText('');

    // In demo mode, append locally without API call
    if (isDemoMode) {
      const localMsg: ExtMsg = {
        id: `demo_${Date.now()}`,
        matchId: matchId ?? 'demo',
        senderId: user?.id ?? '__me__',
        content,
        images: [],
        attachmentNames: [],
        attachmentTypes: [],
        isRead: false,
        sentAt: new Date().toISOString(),
      };
      setMessages((p) => [...p, localMsg]);
      scrollEnd();
      return;
    }

    try {
      const msg = await messageService.sendMessage(matchId, { content });
      setMessages((p) => [...p, msg as ExtMsg]);
      scrollEnd();
    } catch {
      setText(content);
    }
  };

  // ─── Send image ───────────────────────────────────────────────────────────
  const sendImageUri = async (uri: string) => {
    try {
      const remoteImage = isRemoteImageUrl(uri)
        ? uri
        : await uploadChatAsset(uri, { filename: `img-${Date.now()}.jpg`, mimeType: 'image/jpeg' });
      const msg = await messageService.sendMessage(matchId, { content: '', images: [remoteImage] });
      setMessages((p) => [...p, msg as ExtMsg]);
      scrollEnd();
    } catch {
      Alert.alert('Error', 'No se pudo enviar la imagen.');
    }
  };

  const appendLocalDocumentMessage = (file: { name: string; mimeType?: string; size?: number }) => {
    const localId = `file_${Date.now()}`;
    const localMsg: ExtMsg = {
      id: localId,
      _localId: localId,
      matchId,
      senderId: user?.id ?? '',
      content: '',
      images: [],
      attachmentNames: [file.name],
      attachmentTypes: [file.mimeType ?? 'application/octet-stream'],
      isRead: false,
      sentAt: new Date().toISOString(),
      _fileName: file.name,
      _fileSize: file.size,
    };
    setMessages((p) => [...p, localMsg]);
    scrollEnd();
  };

  const confirmPendingAttachment = async () => {
    if (!pendingAttachment) return;
    const picked = pendingAttachment;
    setPendingAttachment(null);
    if (picked.type === 'image') {
      try {
        const remoteImage = isRemoteImageUrl(picked.uri)
          ? picked.uri
          : await uploadChatAsset(picked.uri, { filename: `img-${Date.now()}.jpg`, mimeType: 'image/jpeg' });
        const msg = await messageService.sendMessage(matchId, {
          content: '',
          images: [remoteImage],
          attachmentTypes: [buildAttachmentType('image/jpeg', picked.visibilitySeconds)],
        });
        setMessages((p) => [...p, msg as ExtMsg]);
        scrollEnd();
      } catch {
        Alert.alert('Error', 'No se pudo enviar la imagen.');
      }
      return;
    }
    if (picked.type === 'audio') {
      try {
        const remoteUrl = await uploadChatAsset(picked.uri, {
          filename: picked.name,
          mimeType: picked.mimeType,
        });
        const msg = await messageService.sendMessage(matchId, {
          content: '',
          attachmentNames: [remoteUrl],
          attachmentTypes: [buildAttachmentType(picked.mimeType, picked.visibilitySeconds)],
        });
        setMessages((p) => [...p, msg as ExtMsg]);
        scrollEnd();
      } catch {
        Alert.alert('Error', 'No se pudo enviar el audio.');
      }
      return;
    }
    if (picked.uri) {
      try {
        const remoteUrl = await uploadChatAsset(picked.uri, {
          filename: picked.name,
          mimeType: picked.mimeType,
        });
        const msg = await messageService.sendMessage(matchId, {
          content: '',
          attachmentNames: [remoteUrl],
          attachmentTypes: [
            buildAttachmentType(picked.mimeType ?? 'application/octet-stream', picked.visibilitySeconds),
          ],
        });
        setMessages((p) => [...p, msg as ExtMsg]);
        scrollEnd();
        return;
      } catch {
        Alert.alert('Error', 'No se pudo enviar el archivo.');
      }
    }

    appendLocalDocumentMessage({
      name: picked.name,
      mimeType: picked.mimeType,
      size: picked.size,
    });
  };

  const applyCustomVisibility = () => {
    const raw = customVisibilityMinutes.trim();
    if (!raw) {
      Alert.alert('Tiempo de visibilidad', 'Escribe cuánto tiempo quieres que dure visible.');
      return;
    }
    const amount = Number(raw.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Tiempo de visibilidad', 'Ingresa un valor válido mayor a 0.');
      return;
    }
    const multiplier =
      customVisibilityUnit === 'day'
        ? 24 * 60 * 60
        : customVisibilityUnit === 'hour'
          ? 60 * 60
          : 60;
    const ttlSeconds = Math.max(1, Math.round(amount * multiplier));
    setPendingAttachment((prev) => (prev ? { ...prev, visibilitySeconds: ttlSeconds } : prev));
  };

  // ─── Camera ───────────────────────────────────────────────────────────────
  const handleCamera = async () => {
    if (Platform.OS === 'web') {
      const uri = await capturePhotoViaInlineWebcam();
      if (uri) {
        setPendingAttachment({ type: 'image', uri, visibilitySeconds: null });
      }
      return;
    }
    if (!(await ensureCameraAccess())) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets?.[0]) {
      setPendingAttachment({ type: 'image', uri: result.assets[0].uri, visibilitySeconds: null });
    }
  };

  // ─── Gallery ─────────────────────────────────────────────────────────────
  const handleGallery = async () => {
    if (!(await ensureMediaLibraryAccess())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPendingAttachment({ type: 'image', uri: result.assets[0].uri, visibilitySeconds: null });
    }
  };

  // ─── Document ────────────────────────────────────────────────────────────
  const handleDocument = async () => {
    try {
      /**
       * Forzamos chequeo de permiso de librería en nativo antes de abrir
       * el selector de archivos para que el usuario tenga feedback explícito.
       */
      if (Platform.OS !== 'web' && !(await ensureMediaLibraryAccess())) return;
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (result.assets && result.assets[0]) {
        const file = result.assets[0];
        setPendingAttachment({
          type: 'document',
          name: file.name,
          uri: file.uri,
          mimeType: file.mimeType ?? undefined,
          size: file.size ?? undefined,
          visibilitySeconds: null,
        });
      }
    } catch {
      Alert.alert('Error', 'No se pudo seleccionar el archivo.');
    }
  };

  // ─── Audio start ──────────────────────────────────────────────────────────
  const handleAudioStart = async () => {
    if (Platform.OS === 'web') {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        alertUser(
          'Micrófono',
          'Este entorno no permite capturar audio. Usa HTTPS o localhost, o actualiza Edge.'
        );
        return;
      }
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = createWebMediaRecorder(stream);
        webChunksRef.current = [];
        recorder.ondataavailable = (event: BlobEvent) => {
          if (event.data && event.data.size > 0) webChunksRef.current.push(event.data);
        };
        // Intervalo de datos: algunos navegadores (p. ej. Edge) no emiten chunks hasta stop sin timeslice
        recorder.start(250);
        webRecorderRef.current = recorder;
        webStreamRef.current = stream;
        stream = null;
        setIsRecording(true);
        setRecSecs(0);
        timerRef.current = setInterval(() => setRecSecs((s) => s + 1), 1000);
      } catch (e) {
        stream?.getTracks().forEach((t) => t.stop());
        const detail = e instanceof Error ? e.message : String(e);
        alertUser(
          'Micrófono',
          `No se pudo iniciar la grabación.\n\n${detail}\n\nEn Edge: ícono candado → Permisos para este sitio → Micrófono → Permitir.`
        );
      }
      return;
    }

    if (!AudioLib) {
      Alert.alert('Audio no disponible', 'La grabación de audio no está disponible en este dispositivo.');
      return;
    }
    if (!(await ensureMicrophoneAccess())) return;
    try {
      await AudioLib.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await AudioLib.Recording.createAsync(
        AudioLib.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecObj(recording);
      setIsRecording(true);
      setRecSecs(0);
      timerRef.current = setInterval(() => setRecSecs((s) => s + 1), 1000);
    } catch {
      Alert.alert('Error', 'No se pudo iniciar la grabación.');
    }
  };

  // ─── Audio stop ───────────────────────────────────────────────────────────
  const handleAudioStop = async () => {
    clearInterval(timerRef.current);
    if (Platform.OS === 'web') {
      const durationSec = recSecs;
      setRecSecs(0);
      setIsRecording(false);
      const recorder = webRecorderRef.current as MediaRecorder | null;
      if (!recorder) return;
      recorder.onstop = () => {
        const chunks = webChunksRef.current;
        webChunksRef.current = [];
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const uri = URL.createObjectURL(blob);
        const mt = blob.type || recorder.mimeType || 'audio/webm';
        const ext = mt.includes('mp4') ? 'mp4' : mt.includes('ogg') ? 'ogg' : 'webm';
        setPendingAttachment({
          type: 'audio',
          uri,
          name: `audio-${Date.now()}.${ext}`,
          mimeType: mt,
          durationSec,
          visibilitySeconds: null,
        });
        webStreamRef.current?.getTracks().forEach((t) => t.stop());
        webStreamRef.current = null;
        webRecorderRef.current = null;
      };
      recorder.stop();
      return;
    }

    if (!recObj) { setIsRecording(false); return; }
    try {
      await recObj.stopAndUnloadAsync();
      const uri = recObj.getURI();
      setRecObj(null);
      setIsRecording(false);
      const durationSec = recSecs;
      setRecSecs(0);
      if (uri) {
        setPendingAttachment({
          type: 'audio',
          uri,
          name: `audio-${Date.now()}.m4a`,
          mimeType: 'audio/m4a',
          durationSec,
          visibilitySeconds: null,
        });
      }
    } catch {
      setIsRecording(false);
    }
    if (AudioLib) {
      AudioLib.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
    }
  };

  // ─── Attach handler ───────────────────────────────────────────────────────
  const handleAttach = (id: string) => {
    if (id === 'camera') handleCamera();
    else if (id === 'gallery') handleGallery();
    else if (id === 'document') handleDocument();
  };

  const handleSaveBubbleImage = async (uri: string) => {
    if (!(await ensureMediaLibrarySaveAccess())) return;
    try {
      await saveChatImageToGallery(uri);
      Alert.alert('Guardado', 'La imagen se guardó en tu galería.');
    } catch {
      Alert.alert('Error', 'No se pudo guardar la imagen.');
    }
  };

  const openImage = async (uri: string) => {
    const resolved = resolveChatAttachmentUrl(uri);
    setViewerAsset({ type: 'image', uri: resolved, name: inferFileNameFromUrl(uri) });
  };

  const downloadImage = async (uri: string) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const a = document.createElement('a');
      a.href = uri;
      a.download = inferFileNameFromUrl(uri);
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
    await handleSaveBubbleImage(uri);
  };

  const openAttachment = async (uri: string) => {
    const resolved = resolveChatAttachmentUrl(uri);
    setViewerAsset({ type: 'file', uri: resolved, name: inferFileNameFromUrl(uri) });
  };

  const downloadAttachment = async (uri: string) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const a = document.createElement('a');
      a.href = uri;
      a.download = inferFileNameFromUrl(uri);
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
    await openAttachment(uri);
  };

  const openExternally = async (uri: string) => {
    const resolved = resolveChatAttachmentUrl(uri);
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(resolved, '_blank', 'noopener,noreferrer');
        return;
      }
      await Linking.openURL(resolved);
    } catch {
      Alert.alert('Error', 'No se pudo abrir el archivo.');
    }
  };

  const stopVoicePlayback = useCallback(async () => {
    const h = voicePlaybackRef.current;
    if (!h) return;
    voicePlaybackRef.current = null;
    setPlayingVoiceMessageId(null);
    try {
      if (h.kind === 'web') {
        h.el.pause();
        h.el.src = '';
      } else {
        await h.sound.stopAsync?.();
        await h.sound.unloadAsync?.();
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    return () => {
      void stopVoicePlayback();
    };
  }, [stopVoicePlayback]);

  useEffect(() => {
    void stopVoicePlayback();
  }, [matchId, stopVoicePlayback]);

  const handleToggleVoiceNote = useCallback(
    async (rawUrl: string, messageId: string) => {
      const uri = resolveChatAttachmentUrl(rawUrl);
      if (!uri.trim()) return;

      if (voicePlaybackRef.current?.msgId === messageId) {
        await stopVoicePlayback();
        return;
      }

      await stopVoicePlayback();

      if (Platform.OS === 'web') {
        if (typeof Audio === 'undefined') {
          alertUser('Audio', 'Tu navegador no puede reproducir audio aquí.');
          return;
        }
        try {
          const el = new globalThis.Audio(uri);
          el.onended = () => {
            const cur = voicePlaybackRef.current;
            if (cur?.kind === 'web' && cur.el === el) {
              voicePlaybackRef.current = null;
              setPlayingVoiceMessageId(null);
            }
          };
          el.onerror = () => {
            alertUser('Error', 'No se pudo reproducir el audio.');
            voicePlaybackRef.current = null;
            setPlayingVoiceMessageId(null);
          };
          voicePlaybackRef.current = { kind: 'web', msgId: messageId, el };
          await el.play();
          setPlayingVoiceMessageId(messageId);
        } catch {
          alertUser('Error', 'No se pudo reproducir el audio.');
          voicePlaybackRef.current = null;
          setPlayingVoiceMessageId(null);
        }
        return;
      }

      try {
        if (!AudioLib?.Sound) {
          alertUser('Audio', 'La reproducción de audio no está disponible.');
          return;
        }
        await AudioLib.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        const mid = messageId;
        const onPlaybackStatusUpdate = (status: any) => {
          if (!status?.didJustFinish) return;
          const cur = voicePlaybackRef.current;
          if (cur?.kind === 'native' && cur.msgId === mid) {
            cur.sound?.unloadAsync?.().catch(() => {});
            voicePlaybackRef.current = null;
            setPlayingVoiceMessageId(null);
          }
        };
        const { sound } = await AudioLib.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        voicePlaybackRef.current = { kind: 'native', msgId: messageId, sound };
        setPlayingVoiceMessageId(messageId);
      } catch {
        alertUser('Error', 'No se pudo reproducir el audio.');
        voicePlaybackRef.current = null;
        setPlayingVoiceMessageId(null);
      }
    },
    [stopVoicePlayback]
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={st.s.loading}>
        <ActivityIndicator size="large" color={theme.textAccent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={st.s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* ── Header ── */}
      <View style={[st.s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={st.s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={24} color={icon.back} />
        </TouchableOpacity>

        <LinearGradient
          colors={['#6C5CE7', '#FF6B8B']}
          style={st.s.avatarRing}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={st.s.avatarInner}>
            {otherPhotoUri ? (
              <Image source={{ uri: otherPhotoUri }} style={st.s.avatarImg} />
            ) : (
              <View style={[st.s.avatarFallback, { backgroundColor: otherColor }]}>
                <Text style={st.s.avatarInitial}>{otherInitials}</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        <View style={st.s.hInfo}>
          <Text style={st.s.hName} numberOfLines={1}>
            {otherName}{otherAge ? `, ${otherAge}` : ''}
          </Text>
          <View style={st.s.onlineRow}>
            <View style={[st.s.onlineDot, !isOtherRecentlyOnline && st.s.onlineDotOff]} />
            <Text style={[st.s.onlineTxt, !isOtherRecentlyOnline && st.s.onlineTxtOff]}>{onlineLabel}</Text>
          </View>
        </View>

        <View style={st.s.hActions}>
          <TouchableOpacity style={st.s.hBtn} activeOpacity={0.8} onPress={openVideoCallInfo}>
            <Ionicons name="videocam-outline" size={19} color={icon.headerAction} />
          </TouchableOpacity>
          {canReport ? (
            <TouchableOpacity
              style={st.s.hBtn}
              activeOpacity={0.8}
              onPress={() => setReportOpen(true)}
              accessibilityLabel="Reportar usuario"
            >
              <Ionicons name="flag-outline" size={17} color={icon.headerAction} />
            </TouchableOpacity>
          ) : null}
          {isDemoMode ? (
            <TouchableOpacity style={[st.s.hBtn, st.s.hBtnDemo]} onPress={exitDemo} activeOpacity={0.8}>
              <Ionicons name="close-circle" size={17} color="#FF6B8B" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={st.s.hBtn} onPress={loadDemoMessages} activeOpacity={0.8}>
              <Ionicons name="flask-outline" size={17} color={icon.headerAction} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Match Banner ── */}
      {showBanner && (
        <View style={st.s.banner}>
          <View style={{ flex: 1 }}>
            <View style={st.s.overlapRow}>
              <LinearGradient colors={['#6C5CE7', '#7C6CE9']} style={[st.s.miniBubble, st.s.miniBubbleFirst]}>
                <Text style={st.s.miniBubbleTxt}>{matchMyInitials}</Text>
              </LinearGradient>
              <LinearGradient colors={['#E0568A', '#FF6B8B']} style={[st.s.miniBubble, st.s.miniBubbleSecond]}>
                <Text style={st.s.miniBubbleTxt}>{otherInitials}</Text>
              </LinearGradient>
            </View>
            <Text style={st.s.bannerTxt}>
              ¡Es un match! Tú y {otherName.split(' ')[0]} se han gustado
            </Text>
            {shared.length > 0 && (
              <View style={st.s.chips}>
                {shared.slice(0, 4).map((item: string) => (
                  <View key={item} style={st.s.chip}>
                    <Text style={st.s.chipTxt}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => setShowBanner(false)} style={{ padding: 4 }} activeOpacity={0.7}>
            <Ionicons name="close" size={15} color={icon.bannerDismiss} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Demo Mode Banner ── */}
      {isDemoMode && (
        <View style={st.s.demoBanner}>
          <Ionicons name="flask" size={13} color={icon.demoFlask} />
          <Text style={st.s.demoBannerTxt}>Modo demo — conversación simulada</Text>
          <TouchableOpacity onPress={exitDemo} activeOpacity={0.8}>
            <Text style={st.s.demoBannerExit}>Salir</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Messages ── */}
      <FlatList
        ref={listRef}
        style={st.s.messagesFlex}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={st.s.list}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={32}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={st.s.emptyBox}>
            <Text style={st.s.emptyEmoji}>👋</Text>
            <Text style={st.s.emptyTxt}>¡Di hola y rompe el hielo!</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const prev = index > 0 ? messages[index - 1] : null;
          const showDate = !prev || !sameDay(prev.sentAt, item.sentAt);
          const isOwn = item.senderId === user?.id;
          return (
            <>
              {showDate && <DateSep label={fmtDay(item.sentAt)} ds={st.ds} />}
              <MsgBubble
                msg={item}
                isOwn={isOwn}
                bub={st.bub}
                theme={theme}
                playingVoiceMessageId={playingVoiceMessageId}
                onToggleVoiceNote={handleToggleVoiceNote}
                onSaveImage={
                  Platform.OS !== 'web' && parseArr(item.images).length > 0
                    ? handleSaveBubbleImage
                    : undefined
                }
                onOpenImage={openImage}
                onDownloadImage={downloadImage}
                onOpenAttachment={openAttachment}
                onDownloadAttachment={downloadAttachment}
              />
            </>
          );
        }}
      />

      {/* ── Ice Breaker (only when no messages) ── */}
      {messages.length === 0 && (
        <IceBreakerCard
          question={ICEBREAKERS[iceIdx.current]}
          onUse={() => setText(ICEBREAKERS[iceIdx.current])}
          ic={st.ic}
          sparkleColor={icon.iceSparkles}
        />
      )}

      {/* ── Quick Actions ── */}
      <View style={st.s.quickBar}>
        <TouchableOpacity
          style={st.s.quickBtn}
          onPress={() =>
            navigation.dispatch(
              CommonActions.navigate({
                name: 'MainTabs',
                params: { screen: 'Planes' },
              }),
            )
          }
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={13} color={icon.quickCalendar} />
          <Text style={st.s.quickTxt}>Proponer plan</Text>
        </TouchableOpacity>
        <View style={st.s.quickDiv} />
        <TouchableOpacity
          style={st.s.quickBtn}
          activeOpacity={0.8}
          onPress={() => setShowInterestsModal(true)}
        >
          <Ionicons name="star-outline" size={14} color={icon.quickStar} />
          <Text style={st.s.quickTxt}>Ver intereses</Text>
        </TouchableOpacity>
        <View style={st.s.quickDiv} />
        <TouchableOpacity
          style={st.s.quickBtn}
          activeOpacity={0.8}
          onPress={() => setShowCompatibilityModal(true)}
        >
          <Ionicons name="heart" size={14} color={icon.quickHeart} />
          <Text style={st.s.quickTxt}>Compatibilidad</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showInterestsModal} transparent animationType="slide" onRequestClose={() => setShowInterestsModal(false)}>
        <View style={st.qa.overlayRoot}>
          <TouchableOpacity style={st.qa.flexTap} onPress={() => setShowInterestsModal(false)} activeOpacity={1} />
          <SafeAreaView edges={['bottom']} style={st.qa.sheetOuter}>
            <View style={st.qa.sheetInner}>
              <View style={st.qa.handle} />
              <Text style={st.qa.title}>Afinidades con {otherName.split(' ')[0]}</Text>
              <Text style={st.qa.subtitle}>Intereses en común</Text>
              <View style={st.qa.chipsWrap}>
                {compatibility.sharedInterests.length > 0 ? (
                  compatibility.sharedInterests.map((item: string) => (
                    <View key={`si-${item}`} style={st.qa.chip}>
                      <Text style={st.qa.chipTxt}>{item}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={st.qa.emptyTxt}>Aún no tienen intereses en común visibles.</Text>
                )}
              </View>
              <Text style={st.qa.subtitle}>Hobbies en común</Text>
              <View style={st.qa.chipsWrap}>
                {compatibility.sharedHobbies.length > 0 ? (
                  compatibility.sharedHobbies.map((item: string) => (
                    <View key={`sh-${item}`} style={st.qa.chipAlt}>
                      <Text style={st.qa.chipTxt}>{item}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={st.qa.emptyTxt}>No hay hobbies compartidos todavía.</Text>
                )}
              </View>
              <TouchableOpacity style={st.qa.closeBtn} onPress={() => setShowInterestsModal(false)} activeOpacity={0.85}>
                <Text style={st.qa.closeTxt}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal visible={showCompatibilityModal} transparent animationType="slide" onRequestClose={() => setShowCompatibilityModal(false)}>
        <View style={st.qa.overlayRoot}>
          <TouchableOpacity style={st.qa.flexTap} onPress={() => setShowCompatibilityModal(false)} activeOpacity={1} />
          <SafeAreaView edges={['bottom']} style={st.qa.sheetOuter}>
            <View style={st.qa.sheetInner}>
              <View style={st.qa.handle} />
              <Text style={st.qa.title}>Compatibilidad</Text>
              <View style={st.qa.scoreRow}>
                <Text style={st.qa.scoreNum}>{compatibility.score}%</Text>
                <View style={[st.qa.levelPill, { backgroundColor: `${compatibility.tone.color}22` }]}>
                  <Text style={[st.qa.levelTxt, { color: compatibility.tone.color }]}>{compatibility.tone.label}</Text>
                </View>
              </View>
              <View style={st.qa.progressBg}>
                <View style={[st.qa.progressFill, { width: `${compatibility.score}%` as any }]} />
              </View>
              <View style={st.qa.metricRow}>
                <Text style={st.qa.metricLabel}>Intereses compartidos</Text>
                <Text style={st.qa.metricVal}>{compatibility.sharedInterests.length}</Text>
              </View>
              <View style={st.qa.metricRow}>
                <Text style={st.qa.metricLabel}>Hobbies compartidos</Text>
                <Text style={st.qa.metricVal}>{compatibility.sharedHobbies.length}</Text>
              </View>
              <View style={st.qa.metricRow}>
                <Text style={st.qa.metricLabel}>Objetivo de conexión</Text>
                <Text style={st.qa.metricVal}>
                  {compatibility.sameGoal
                    ? `Coincide (${GOAL_LABELS[myGoal] ?? 'Sí'})`
                    : `${GOAL_LABELS[myGoal] ?? 'Sin definir'} / ${GOAL_LABELS[theirGoal] ?? 'Sin definir'}`}
                </Text>
              </View>
              <TouchableOpacity style={st.qa.closeBtn} onPress={() => setShowCompatibilityModal(false)} activeOpacity={0.85}>
                <Text style={st.qa.closeTxt}>Listo</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {showScrollFab && !isRecording && (
        <TouchableOpacity
          style={[st.s.scrollFab, { bottom: Math.max(insets.bottom, 12) + 136 }]}
          onPress={() => listRef.current?.scrollToEnd({ animated: true })}
          activeOpacity={0.85}
        >
          <Ionicons name="chevron-down" size={20} color={icon.scrollFab} />
        </TouchableOpacity>
      )}

      {/* ── Input Bar ── */}
      <View style={[st.s.inputDock, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={st.s.toolbarScroll}
          >
            <TouchableOpacity style={st.s.toolHit} onPress={() => setShowAttach(true)} activeOpacity={0.75}>
              <View style={st.s.toolCircle}>
                <Ionicons name="attach-outline" size={21} color={icon.toolbarAttach} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={st.s.toolHit} onPress={() => handleDocument()} activeOpacity={0.75}>
              <View style={st.s.toolCircle}>
                <Ionicons name="document-text-outline" size={20} color={icon.toolbarDoc} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={st.s.toolHit} onPress={handleCamera} activeOpacity={0.75}>
              <View style={st.s.toolCircle}>
                <Ionicons name="camera-outline" size={21} color={icon.toolbarCamera} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={st.s.toolHit} onPress={handleGallery} activeOpacity={0.75}>
              <View style={st.s.toolCircle}>
                <Ionicons name="images-outline" size={21} color={icon.toolbarGallery} />
              </View>
            </TouchableOpacity>
          </ScrollView>

          <View style={st.s.composerRow}>
            <View style={st.s.inputWrap}>
              <TextInput
                ref={inputRef}
                style={st.s.input}
                placeholder="Escribe un mensaje…"
                placeholderTextColor={theme.textMuted}
                value={text}
                onChangeText={setText}
                multiline
                maxLength={1000}
              />
            </View>

            <TouchableOpacity
              style={st.s.roundHit}
              onPress={() => {
                if (Platform.OS === 'web') {
                  setShowEmojiPicker(true);
                } else {
                  setShowEmojiPicker(false);
                  inputRef.current?.focus();
                }
              }}
              hitSlop={8}
              activeOpacity={0.75}
            >
              <Ionicons name="happy-outline" size={24} color={icon.composerEmoji} />
            </TouchableOpacity>

            <Pressable
              style={[
                st.s.roundHit,
                isRecording && st.s.roundHitRecording,
                Platform.OS === 'web' && ({ cursor: 'pointer' } as object),
              ]}
              onPress={isRecording ? handleAudioStop : handleAudioStart}
              hitSlop={8}
              accessibilityLabel={isRecording ? 'Detener grabación' : 'Grabar nota de voz'}
            >
              <Ionicons
                name={isRecording ? 'stop-circle' : 'mic-outline'}
                size={24}
                color={isRecording ? '#FF6B8B' : icon.composerMicIdle}
              />
            </Pressable>
            {isRecording && (
              <View style={st.s.recordingMiniPill}>
                <View style={st.s.recordingMiniDot} />
                <Text style={st.s.recordingMiniTxt}>Grabando… {fmtDurationClock(recSecs)}</Text>
              </View>
            )}

            <TouchableOpacity onPress={handleSend} disabled={!text.trim()} activeOpacity={0.88}>
              <LinearGradient
                colors={[...KORA_GRADIENT]}
                style={[st.s.sendOrb, !text.trim() && { opacity: 0.38 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="send" size={17} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

      {/* ── Adjuntos y emojis ── */}
      <AttachMenu
        visible={showAttach}
        onClose={() => setShowAttach(false)}
        onSelect={handleAttach}
        at={st.at}
        chevronColor={icon.attachChevron}
      />
      <Modal
        visible={!!pendingAttachment}
        transparent
        animationType="slide"
        onRequestClose={() => setPendingAttachment(null)}
      >
        <View style={st.pv.overlayRoot}>
          <TouchableOpacity style={st.pv.flexTap} onPress={() => setPendingAttachment(null)} activeOpacity={1} />
          <SafeAreaView edges={['bottom']} style={st.pv.sheetOuter}>
            <View style={st.pv.sheetInner}>
              <View style={st.pv.handle} />
              <Text style={st.pv.title}>Previsualizar adjunto</Text>
              {pendingAttachment?.type === 'image' ? (
                <View style={st.pv.previewImageWrap}>
                  <Image source={{ uri: pendingAttachment.uri }} style={st.pv.previewImage} resizeMode="contain" />
                </View>
              ) : pendingAttachment?.type === 'audio' ? (
                <View style={st.pv.docBox}>
                  <Ionicons name="mic-outline" size={26} color={icon.previewMic} />
                  <Text style={st.pv.docName} numberOfLines={2}>{pendingAttachment.name}</Text>
                  <Text style={st.pv.docMeta}>
                    Nota de voz {pendingAttachment.durationSec ? `· ${pendingAttachment.durationSec}s` : ''}
                  </Text>
                </View>
              ) : pendingAttachment ? (
                <View style={st.pv.docBox}>
                  <Ionicons name="document-text-outline" size={26} color={icon.previewDoc} />
                  <Text style={st.pv.docName} numberOfLines={2}>{pendingAttachment.name}</Text>
                  <Text style={st.pv.docMeta}>
                    {(pendingAttachment.mimeType ?? 'Archivo')} {pendingAttachment.size ? `· ${Math.max(1, Math.round(pendingAttachment.size / 1024))} KB` : ''}
                  </Text>
                </View>
              ) : null}
              <View style={st.pv.visibilityWrap}>
                {VISIBILITY_OPTIONS.map((opt) => {
                  const active = (pendingAttachment?.visibilitySeconds ?? null) === opt.seconds;
                  return (
                    <TouchableOpacity
                      key={`vis-${opt.label}`}
                      style={[st.pv.visibilityChip, active && st.pv.visibilityChipActive]}
                      onPress={() => {
                        setPendingAttachment((prev) =>
                          prev ? { ...prev, visibilitySeconds: opt.seconds } : prev
                        );
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[st.pv.visibilityTxt, active && st.pv.visibilityTxtActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={st.pv.customVisibilityRow}>
                <TextInput
                  style={st.pv.customVisibilityInput}
                  value={customVisibilityMinutes}
                  onChangeText={setCustomVisibilityMinutes}
                  placeholder="Tiempo personalizado"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                />
                <View style={st.pv.customUnitWrap}>
                  {[
                    { id: 'min', label: 'min' },
                    { id: 'hour', label: 'horas' },
                    { id: 'day', label: 'días' },
                  ].map((unit) => {
                    const active = customVisibilityUnit === unit.id;
                    return (
                      <TouchableOpacity
                        key={`unit-${unit.id}`}
                        style={[st.pv.customUnitChip, active && st.pv.customUnitChipActive]}
                        onPress={() => setCustomVisibilityUnit(unit.id as 'min' | 'hour' | 'day')}
                        activeOpacity={0.85}
                      >
                        <Text style={[st.pv.customUnitTxt, active && st.pv.customUnitTxtActive]}>{unit.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity style={st.pv.customVisibilityBtn} onPress={applyCustomVisibility} activeOpacity={0.85}>
                  <Text style={st.pv.customVisibilityBtnTxt}>Aplicar</Text>
                </TouchableOpacity>
              </View>
              <Text style={st.pv.visibilityHint}>
                {formatVisibilityLabel(pendingAttachment?.visibilitySeconds ?? null)}
              </Text>
              <View style={st.pv.row}>
                {pendingAttachment?.type === 'image' ? (
                  <TouchableOpacity
                    style={st.pv.editBtn}
                    onPress={() => setShowImageCrop(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={st.pv.editTxt}>Editar/Recortar</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={st.pv.cancelBtn} onPress={() => setPendingAttachment(null)} activeOpacity={0.8}>
                  <Text style={st.pv.cancelTxt}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={st.pv.sendBtn} onPress={confirmPendingAttachment} activeOpacity={0.88}>
                  <LinearGradient colors={[...KORA_GRADIENT]} style={st.pv.sendGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Ionicons name="send" size={15} color="#fff" />
                    <Text style={st.pv.sendTxt}>Enviar</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
      <Modal
        visible={!!viewerAsset}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerAsset(null)}
      >
        <View style={st.vw.overlay}>
          <View style={st.vw.topBar}>
            <TouchableOpacity style={st.vw.iconBtn} onPress={() => setViewerAsset(null)} activeOpacity={0.85}>
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={st.vw.title} numberOfLines={1}>{viewerAsset?.name || 'Adjunto'}</Text>
            <View style={st.vw.actions}>
              <TouchableOpacity
                style={st.vw.iconBtn}
                onPress={() => {
                  if (!viewerAsset) return;
                  if (viewerAsset.type === 'image') downloadImage(viewerAsset.uri);
                  else downloadAttachment(viewerAsset.uri);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="download-outline" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={st.vw.iconBtn}
                onPress={() => viewerAsset && openExternally(viewerAsset.uri)}
                activeOpacity={0.85}
              >
                <Ionicons name="open-outline" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={st.vw.body}>
            {viewerAsset?.type === 'image' ? (
              <Image source={{ uri: viewerAsset.uri }} style={st.vw.image} resizeMode="contain" />
            ) : (
              <View style={st.vw.fileBox}>
                <Ionicons name="document-text-outline" size={44} color="#7DD3FC" />
                <Text style={st.vw.fileName}>{viewerAsset?.name}</Text>
                <TouchableOpacity style={st.vw.openBtn} onPress={() => viewerAsset && openExternally(viewerAsset.uri)} activeOpacity={0.85}>
                  <Text style={st.vw.openTxt}>Abrir archivo</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
      <ImageCropEditorModal
        visible={showImageCrop && !!pendingAttachment && pendingAttachment.type === 'image'}
        imageUri={pendingAttachment?.type === 'image' ? pendingAttachment.uri : null}
        onClose={() => setShowImageCrop(false)}
        onApply={(uri) => {
          setPendingAttachment((prev) =>
            prev && prev.type === 'image' ? { ...prev, uri } : prev
          );
          setShowImageCrop(false);
        }}
      />
      {Platform.OS === 'web' ? (
        <EmojiPickerSheet
          visible={showEmojiPicker}
          onClose={() => setShowEmojiPicker(false)}
          onPick={(e) => setText((prev) => prev + e)}
          em={st.em}
        />
      ) : (
        <EmojiPicker
          open={showEmojiPicker}
          onClose={() => setShowEmojiPicker(false)}
          onEmojiSelected={(em) => {
            setText((prev) => prev + em.emoji);
            setShowEmojiPicker(false);
          }}
          translation={es}
          theme={emojiKeyboardTheme}
          enableSearchBar
          enableRecentlyUsed
          categoryPosition="top"
          defaultHeight="44%"
          expandedHeight="78%"
          expandable
        />
      )}
      <ReportUserModal
        visible={reportOpen && !!otherUserId}
        onClose={() => setReportOpen(false)}
        reportedUserId={otherUserId!}
        onSuccess={() => navigation.goBack()}
      />
    </KeyboardAvoidingView>
  );
};

export default ChatScreen;
