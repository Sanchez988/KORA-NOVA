import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, borderRadius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { planService, Plan } from '../services/plan.service';
import { matchService } from '../services/match.service';
import { useAuth } from '../context/AuthContext';
import { Match } from '../types';
import { displayPhotosForImage } from '../utils/profilePhotos';
import { useScreenInsets } from '../utils/screenInsets';

type TabType = 'activos' | 'misplanes' | 'finalizados';


const CATEGORIES = [
  { key: 'SOCIAL',   label: 'Social',   icon: '🎉' },
  { key: 'ESTUDIO',  label: 'Estudio',  icon: '📚' },
  { key: 'DEPORTE',  label: 'Deporte',  icon: '⚽' },
  { key: 'CULTURAL', label: 'Cultural', icon: '🎨' },
  { key: 'OTRO',     label: 'Otro',     icon: '✨' },
];

const AVATAR_COLORS = ['#6C5CE7', '#FF6B8B', '#A29BFE', '#00CEC9', '#FDCB6E', '#E17055'];

function getCategoryConfig(cat: string) {
  return CATEGORIES.find((c) => c.key === cat) ?? { key: 'OTRO', label: 'Otro', icon: '✨' };
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    const today = new Date();
    const isToday =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
    const timeStr = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Hoy · ${timeStr}`;
    return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' }) + ` · ${timeStr}`;
  } catch {
    return iso;
  }
}

function formatTimeLeft(targetIso: string, nowMs: number): string {
  const targetMs = new Date(targetIso).getTime();
  if (!Number.isFinite(targetMs)) return 'Fecha inválida';
  const diffSec = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  if (diffSec <= 0) return 'Inicia ahora';
  const days = Math.floor(diffSec / (24 * 60 * 60));
  const hours = Math.floor((diffSec % (24 * 60 * 60)) / (60 * 60));
  const mins = Math.floor((diffSec % (60 * 60)) / 60);
  const secs = diffSec % 60;
  if (days > 0) return `Faltan ${days}d ${hours}h`;
  if (hours > 0) return `Faltan ${hours}h ${mins}m`;
  if (mins > 0) return `Faltan ${mins}m ${secs}s`;
  return `Faltan ${secs}s`;
}

function alertPlanMapLocationHint() {
  const msg =
    'Tu plan está publicado. Para que salga en el mapa de planes, activa «Compartir ubicación» en Configuración → Privacidad y asegúrate de que la app tenga tu posición (pantalla Descubrir o permiso de ubicación en el navegador si usas web). Luego abre de nuevo el mapa.';
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`Mapa de planes\n\n${msg}`);
  } else {
    Alert.alert('Mapa de planes', msg);
  }
}

function formatEndedAgo(targetIso: string, nowMs: number): string {
  const targetMs = new Date(targetIso).getTime();
  if (!Number.isFinite(targetMs)) return 'Fecha inválida';
  const diffSec = Math.max(0, Math.floor((nowMs - targetMs) / 1000));
  if (diffSec < 60) return 'Finalizó hace un momento';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `Finalizó hace ${mins} min`;
  const hours = Math.floor(diffSec / (60 * 60));
  if (hours < 48) return `Finalizó hace ${hours} h`;
  const days = Math.floor(diffSec / (24 * 60 * 60));
  return `Finalizó hace ${days} día${days === 1 ? '' : 's'}`;
}

function dedupePlansById(lists: Plan[][]): Plan[] {
  const map = new Map<string, Plan>();
  for (const list of lists) {
    for (const p of list) {
      if (!map.has(p.id)) map.set(p.id, p);
    }
  }
  return [...map.values()];
}

function toLocalYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toLocalHM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Interpreta fecha + hora en hora local (sin UTC raro al editar planes). */
function parsePlanDateTime(datePart: string, timePart: string): Date {
  const dp = datePart && /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : toLocalYMD(new Date());
  const tp = timePart && /^\d{1,2}:\d{2}$/.test(timePart) ? timePart : '12:00';
  const [hh, mm] = tp.split(':').map((x) => parseInt(x, 10));
  const [y, mo, d] = dp.split('-').map((x) => parseInt(x, 10));
  return new Date(y, mo - 1, d, hh, mm, 0, 0);
}

const ParticipantAvatars = ({
  participants,
  max = 4,
}: {
  participants: Plan['participants'];
  max?: number;
}) => {
  const { theme } = useTheme();
  const shown = participants.slice(0, max);
  const extra = participants.length - max;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {shown.map((p, i) => {
        const name = p.user?.profile?.name ?? p.user?.id ?? '?';
        const initial = name[0].toUpperCase();
        const bg = AVATAR_COLORS[i % AVATAR_COLORS.length];
        return (
          <View
            key={p.userId}
            style={[av.circle, { backgroundColor: bg, marginLeft: i === 0 ? 0 : -8, zIndex: max - i, borderColor: theme.surface }]}
          >
            <Text style={av.initial}>{initial}</Text>
          </View>
        );
      })}
      {extra > 0 && (
        <View style={[av.circle, { backgroundColor: 'rgba(162,155,254,0.2)', marginLeft: -8 }]}>
          <Text style={[av.initial, { color: '#A29BFE' }]}>+{extra}</Text>
        </View>
      )}
    </View>
  );
};

const av = StyleSheet.create({
  circle: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#16162A' },
  initial: { fontSize: 10, fontWeight: '700', color: '#fff' },
});

const PlanCard = ({
  plan, userId, onJoin, onLeave, onCancel, onEdit, onInvite, nowMs, past,
}: {
  plan: Plan; userId?: string;
  onJoin: (id: string) => void; onLeave: (id: string) => void; onCancel: (id: string) => void; onEdit: (plan: Plan) => void;
  onInvite?: (plan: Plan) => void;
  nowMs: number;
  past?: boolean;
}) => {
  const { theme } = useTheme();
  const isCreator = plan.creatorId === userId;
  const isJoined = plan.participants.some((p) => p.userId === userId && p.status === 'JOINED');
  const isFull = plan.maxParticipants != null && plan.participantCount >= plan.maxParticipants;
  const category = getCategoryConfig(plan.category);
  const cuposLeft = plan.maxParticipants != null ? plan.maxParticipants - plan.participantCount : null;
  const statusLabel = past ? 'Finalizado' : isFull ? 'Lleno' : 'Abierto';
  const statusColor = past ? '#94A3B8' : isFull ? '#E17055' : '#00CEC9';
  const statusBg = past ? 'rgba(148,163,184,0.14)' : isFull ? 'rgba(225,112,85,0.14)' : 'rgba(0,206,201,0.14)';
  const timeLeftLabel = past ? formatEndedAgo(plan.date, nowMs) : formatTimeLeft(plan.date, nowMs);

  return (
    <View style={[card.wrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={card.topRow}>
        <View style={[card.badge, { backgroundColor: statusBg, borderColor: statusColor }]}>
          <Text style={[card.badgeText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
        <Text style={card.bigEmoji}>{category.icon}</Text>
      </View>
      <Text style={[card.title, { color: theme.text }]} numberOfLines={2}>{plan.title}</Text>
      <View style={card.infoRow}>
        <Ionicons name="calendar-outline" size={12} color={theme.textMuted} />
        <Text style={[card.infoText, { color: theme.textMuted }]}>{formatDate(plan.date)}</Text>
        {plan.location ? (
          <>
            <Text style={[card.infoDot, { color: theme.textMuted }]}>·</Text>
            <Ionicons name="location-outline" size={12} color={theme.textMuted} />
            <Text style={[card.infoText, { color: theme.textMuted }]} numberOfLines={1}>{plan.location}</Text>
          </>
        ) : null}
      </View>
      <Text style={[card.timeLeftText, { color: past ? theme.textMuted : theme.textSub }]}>{timeLeftLabel}</Text>
      <View style={card.bottomRow}>
        <View style={card.bottomLeft}>
          {plan.participants.length > 0 ? <ParticipantAvatars participants={plan.participants} /> : null}
          <Text style={[card.cuposText, { color: theme.textMuted }]}>
            {past
              ? `${plan.participantCount} participantes`
              : cuposLeft != null
                ? cuposLeft === 0 ? 'Sin cupos' : `${cuposLeft} cupos disponibles`
                : `${plan.participantCount} participantes`}
          </Text>
        </View>
        {past ? (
          isCreator ? (
            <View style={card.creatorActions}>
              <TouchableOpacity style={card.iconBtn} onPress={() => onCancel(plan.id)} activeOpacity={0.8}>
                <Ionicons name="trash-outline" size={14} color={colors.error} />
              </TouchableOpacity>
            </View>
          ) : null
        ) : isCreator ? (
          <View style={card.creatorActions}>
            {onInvite && !isFull ? (
              <TouchableOpacity style={card.inviteBtn} onPress={() => onInvite(plan)} activeOpacity={0.8}>
                <Ionicons name="person-add-outline" size={15} color="#00CEC9" />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={card.editBtn} onPress={() => onEdit(plan)} activeOpacity={0.8}>
              <Ionicons name="pencil-outline" size={14} color="#A29BFE" />
            </TouchableOpacity>
            <TouchableOpacity style={card.iconBtn} onPress={() => onCancel(plan.id)} activeOpacity={0.8}>
              <Ionicons name="trash-outline" size={14} color={colors.error} />
            </TouchableOpacity>
          </View>
        ) : isJoined ? (
          <TouchableOpacity style={card.joinedBtn} onPress={() => onLeave(plan.id)} activeOpacity={0.8}>
            <Text style={card.joinedText}>Unido</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[card.joinBtn, isFull && card.joinBtnDisabled]}
            onPress={() => !isFull && onJoin(plan.id)}
            activeOpacity={0.8}
            disabled={isFull}
          >
            <Text style={[card.joinText, isFull && card.joinTextDisabled]}>
              {isFull ? 'Lleno' : 'Unirme'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const card = StyleSheet.create({
  wrap: { borderRadius: 18, padding: spacing.lg, marginBottom: 12, borderWidth: 1 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.sm },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  bigEmoji: { fontSize: 44, lineHeight: 52 },
  title: { fontSize: 17, fontWeight: '800', marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14, flexWrap: 'wrap' },
  infoText: { fontSize: 12 },
  infoDot: { fontSize: 12, marginHorizontal: 2 },
  timeLeftText: { fontSize: 12, fontWeight: '700', marginTop: -6, marginBottom: 12, color: '#A29BFE' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bottomLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  cuposText: { fontSize: 12, flexShrink: 1 },
  joinBtn: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.55)', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 7 },
  joinBtnDisabled: { borderColor: 'rgba(255,255,255,0.15)' },
  joinText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  joinTextDisabled: { color: 'rgba(255,255,255,0.25)' },
  joinedBtn: { backgroundColor: 'rgba(108,92,231,0.22)', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 7, borderWidth: 1.5, borderColor: 'rgba(108,92,231,0.5)' },
  joinedText: { fontSize: 13, fontWeight: '700', color: '#A29BFE' },
  iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(239,71,111,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(239,71,111,0.3)' },
  editBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(162,155,254,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(162,155,254,0.3)' },
  inviteBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,206,201,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,206,201,0.35)' },
  creatorActions: { flexDirection: 'row', gap: 8 },
});

const CreatePlanModal = ({
  visible, onClose, onCreated, editPlan,
}: {
  visible: boolean; onClose: () => void; onCreated: () => void; editPlan?: Plan | null;
}) => {
  const isEdit = !!editPlan;
  const { insets } = useScreenInsets();
  const { theme } = useTheme();
  const iosPickerTheme = theme.isDark ? 'dark' : 'light';

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('SOCIAL');
  const [datePart, setDatePart] = useState(''); // YYYY-MM-DD
  const [timePart, setTimePart] = useState(''); // HH:MM
  const [location, setLocation] = useState('');
  const [maxP, setMaxP] = useState('');
  const [saving, setSaving] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);

  React.useEffect(() => {
    if (!visible) {
      setDatePickerOpen(false);
      setTimePickerOpen(false);
    }
  }, [visible]);

  // Pre-fill fields when editing
  React.useEffect(() => {
    if (editPlan) {
      setTitle(editPlan.title);
      setDesc(editPlan.description ?? '');
      setCategory(editPlan.category);
      setLocation(editPlan.location ?? '');
      setMaxP(editPlan.maxParticipants != null ? String(editPlan.maxParticipants) : '');
      const d = new Date(editPlan.date);
      setDatePart(toLocalYMD(d));
      setTimePart(toLocalHM(d));
    } else {
      setTitle(''); setDesc(''); setCategory('SOCIAL'); setDatePart(''); setTimePart(''); setLocation(''); setMaxP('');
    }
  }, [editPlan, visible]);

  const reset = () => { setTitle(''); setDesc(''); setCategory('SOCIAL'); setDatePart(''); setTimePart(''); setLocation(''); setMaxP(''); };

  const handleCreate = async () => {
    if (!title.trim()) { Alert.alert('Error', 'El título es obligatorio'); return; }
    if (!datePart) { Alert.alert('Error', 'La fecha es obligatoria'); return; }
    if (!timePart) { Alert.alert('Error', 'La hora es obligatoria'); return; }
    const parsed = parsePlanDateTime(datePart, timePart);
    if (isNaN(parsed.getTime())) { Alert.alert('Error', 'Fecha u hora inválida'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await planService.updatePlan(editPlan!.id, {
          title: title.trim(),
          description: desc.trim() || undefined,
          category,
          date: parsed.toISOString(),
          location: location.trim() || undefined,
          maxParticipants: maxP ? parseInt(maxP) : undefined,
        });
      } else {
        const created = await planService.createPlan({
          title: title.trim(),
          description: desc.trim() || undefined,
          category,
          date: parsed.toISOString(),
          location: location.trim() || undefined,
          maxParticipants: maxP ? parseInt(maxP) : undefined,
        });
        const hasMapPin =
          created.approxMapLat != null &&
          created.approxMapLng != null &&
          Number.isFinite(Number(created.approxMapLat)) &&
          Number.isFinite(Number(created.approxMapLng));
        if (!hasMapPin) alertPlanMapLocationHint();
      }
      onCreated(); reset(); onClose();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || (isEdit ? 'No se pudo actualizar el plan' : 'No se pudo crear el plan'));
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[mo.container, { backgroundColor: theme.bg }]}>
        <View style={[mo.header, { borderBottomColor: theme.border, paddingTop: Math.max(insets.top, 12) + 8 }]}>
          <Text style={[mo.title, { color: theme.text }]}>{isEdit ? 'Editar plan' : 'Nuevo plan'}</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={theme.textSub} />
          </TouchableOpacity>
        </View>
        <ScrollView
          style={mo.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 36 }}
        >
          <Text style={[mo.label, { color: theme.textAccent }]}>Título *</Text>
          <TextInput style={[mo.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]} placeholder="Ej: Partido de fútbol en la cancha norte" value={title} onChangeText={setTitle} placeholderTextColor={theme.textMuted} />
          <Text style={[mo.label, { color: theme.textAccent }]}>Categoría</Text>
          <View style={mo.catRow}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity key={c.key} style={[mo.catChip, { backgroundColor: theme.surface, borderColor: theme.border }, category === c.key && mo.catChipActive]} onPress={() => setCategory(c.key)} activeOpacity={0.8}>
                <Text style={mo.catEmoji}>{c.icon}</Text>
                <Text style={[mo.catText, { color: theme.textSub }, category === c.key && mo.catTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[mo.label, { color: theme.textAccent }]}>Descripción</Text>
          <TextInput style={[mo.input, mo.inputMulti, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]} placeholder="Cuéntanos de qué va el plan..." value={desc} onChangeText={setDesc} multiline numberOfLines={3} placeholderTextColor={theme.textMuted} />
          <Text style={[mo.label, { color: theme.textAccent }]}>Fecha y hora *</Text>
          {Platform.OS === 'web' ? (
            <View style={mo.dateTimeRow}>
              <View style={mo.dateTimeField}>
                <Text style={[mo.dateTimeLabel, { color: theme.textAccent }]}>Fecha</Text>
                <input type="date" style={webInputStyle} onChange={(e) => setDatePart(e.target.value)} />
              </View>
              <View style={mo.dateTimeField}>
                <Text style={[mo.dateTimeLabel, { color: theme.textAccent }]}>Hora</Text>
                <input type="time" style={webInputStyle} onChange={(e) => setTimePart(e.target.value)} />
              </View>
            </View>
          ) : (
            <View style={mo.dateTimeRow}>
              <View style={mo.dateTimeField}>
                <Text style={[mo.dateTimeLabel, { color: theme.textAccent }]}>Fecha</Text>
                <TouchableOpacity
                  style={[mo.input, mo.dateTimeTouchable, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => {
                    setTimePickerOpen(false);
                    const base = parsePlanDateTime(datePart, timePart);
                    if (Platform.OS === 'android') {
                      DateTimePickerAndroid.open({
                        value: base,
                        mode: 'date',
                        is24Hour: true,
                        display: 'default',
                        onChange: (event, selected) => {
                          if (event.type === 'dismissed' || !selected) return;
                          const tp =
                            timePart && /^\d{1,2}:\d{2}$/.test(timePart) ? timePart : '12:00';
                          const [hh, mm] = tp.split(':').map((x) => parseInt(x, 10));
                          setDatePart(toLocalYMD(selected));
                          setTimePart(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
                        },
                      });
                      return;
                    }
                    setDatePickerOpen(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={{ color: datePart ? theme.text : theme.textMuted, fontSize: 14 }}>
                    {datePart || 'Toca para elegir fecha'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={mo.dateTimeField}>
                <Text style={[mo.dateTimeLabel, { color: theme.textAccent }]}>Hora</Text>
                <TouchableOpacity
                  style={[mo.input, mo.dateTimeTouchable, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => {
                    setDatePickerOpen(false);
                    const base = parsePlanDateTime(datePart, timePart);
                    if (Platform.OS === 'android') {
                      DateTimePickerAndroid.open({
                        value: base,
                        mode: 'time',
                        is24Hour: true,
                        display: 'default',
                        onChange: (event, selected) => {
                          if (event.type === 'dismissed' || !selected) return;
                          const dp =
                            datePart && /^\d{4}-\d{2}-\d{2}$/.test(datePart)
                              ? datePart
                              : toLocalYMD(new Date());
                          const [y, mon, d] = dp.split('-').map((x) => parseInt(x, 10));
                          setDatePart(dp);
                          setTimePart(
                            toLocalHM(
                              new Date(y, mon - 1, d, selected.getHours(), selected.getMinutes(), 0, 0)
                            )
                          );
                        },
                      });
                      return;
                    }
                    setTimePickerOpen(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={{ color: timePart ? theme.text : theme.textMuted, fontSize: 14 }}>
                    {timePart || 'Toca para elegir hora'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          <Text style={[mo.label, { color: theme.textAccent }]}>Lugar</Text>
          <TextInput style={[mo.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]} placeholder="Ej: Cancha bloque 12, Biblioteca, etc." value={location} onChangeText={setLocation} placeholderTextColor={theme.textMuted} />
          <Text style={[mo.label, { color: theme.textAccent }]}>Máximo de participantes (opcional)</Text>
          <TextInput style={[mo.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]} placeholder="Ej: 10" value={maxP} onChangeText={setMaxP} keyboardType="numeric" placeholderTextColor={theme.textMuted} />
          <TouchableOpacity style={mo.submitBtn} onPress={handleCreate} disabled={saving} activeOpacity={0.88}>
            <LinearGradient colors={['#6C5CE7', '#FF6B8B']} style={mo.submitGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {saving ? <ActivityIndicator color="#fff" /> : (<><Ionicons name={isEdit ? 'save-outline' : 'checkmark'} size={18} color="#fff" /><Text style={mo.submitText}>{isEdit ? 'Guardar cambios' : 'Crear plan'}</Text></>)}
            </LinearGradient>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
        {Platform.OS === 'ios' && (datePickerOpen || timePickerOpen) ? (
          <Modal
            visible
            transparent
            animationType="fade"
            presentationStyle="overFullScreen"
            statusBarTranslucent
            onRequestClose={() => {
              setDatePickerOpen(false);
              setTimePickerOpen(false);
            }}
          >
            <View style={mo.iosPickerOverlay}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => {
                  setDatePickerOpen(false);
                  setTimePickerOpen(false);
                }}
              />
              <View style={[mo.iosPickerSheet, { backgroundColor: theme.surface }]}>
                {datePickerOpen ? (
                  <DateTimePicker
                    themeVariant={iosPickerTheme}
                    value={parsePlanDateTime(datePart, timePart)}
                    mode="date"
                    display="spinner"
                    onChange={(ev, sel) => {
                      if (ev.type === 'dismissed') return;
                      if (!sel) return;
                      const tp =
                        timePart && /^\d{1,2}:\d{2}$/.test(timePart) ? timePart : '12:00';
                      const [hh, mm] = tp.split(':').map((x) => parseInt(x, 10));
                      setDatePart(toLocalYMD(sel));
                      setTimePart(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
                    }}
                  />
                ) : null}
                {timePickerOpen ? (
                  <DateTimePicker
                    themeVariant={iosPickerTheme}
                    value={parsePlanDateTime(datePart, timePart)}
                    mode="time"
                    display="spinner"
                    onChange={(ev, sel) => {
                      if (ev.type === 'dismissed') return;
                      if (!sel) return;
                      const dp =
                        datePart && /^\d{4}-\d{2}-\d{2}$/.test(datePart)
                          ? datePart
                          : toLocalYMD(new Date());
                      const [y, mon, d] = dp.split('-').map((x) => parseInt(x, 10));
                      setDatePart(dp);
                      setTimePart(
                        toLocalHM(
                          new Date(y, mon - 1, d, sel.getHours(), sel.getMinutes(), 0, 0)
                        )
                      );
                    }}
                  />
                ) : null}
                <View style={[mo.pickerDoneBar, { borderTopColor: theme.border }]}>
                  <TouchableOpacity
                    onPress={() => {
                      setDatePickerOpen(false);
                      setTimePickerOpen(false);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={[mo.pickerDoneText, { color: theme.textAccent }]}>Listo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        ) : null}
      </View>
    </Modal>
  );
};

// Shared web input style (must be a plain object, not StyleSheet)
const webInputStyle: React.CSSProperties = {
  border: '1.5px solid rgba(108,92,231,0.3)',
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 14,
  color: '#fff',
  backgroundColor: '#16162A',
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
  colorScheme: 'dark',
} as any;

const mo = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1 },
  title: { fontSize: 20, fontWeight: '800' },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: spacing.sm },
  input: { borderRadius: borderRadius.md, borderWidth: 1.5, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 14, marginBottom: spacing.sm },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5 },
  catChipActive: { borderColor: 'rgba(108,92,231,0.6)', backgroundColor: 'rgba(108,92,231,0.12)' },
  catEmoji: { fontSize: 14 },
  catText: { fontSize: 13, fontWeight: '600' },
  catTextActive: { color: '#A29BFE' },
  submitBtn: { borderRadius: 999, overflow: 'hidden', marginTop: spacing.lg },
  submitGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  dateTimeRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.sm },
  dateTimeField: { flex: 1 },
  dateTimeTouchable: { justifyContent: 'center', minHeight: 48 },
  dateTimeLabel: { fontSize: 12, fontWeight: '600', marginBottom: 5 },
  iosPickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  iosPickerSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 28,
  },
  pickerDoneBar: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    alignItems: 'flex-end',
  },
  pickerDoneText: { fontSize: 17, fontWeight: '700' },
});

const INVITE_AVATAR_BG = ['#6C5CE7', '#FF6B8B', '#00CEC9', '#FDCB6E', '#E17055', '#A29BFE', '#636e72'];

function inviteInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || '?';
}

function inviteAvatarBg(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return INVITE_AVATAR_BG[Math.abs(hash) % INVITE_AVATAR_BG.length];
}

function otherFromMatch(match: Match, myId: string) {
  return match.user1Id === myId ? match.user2 : match.user1;
}

function otherIdFromMatch(match: Match, myId: string) {
  return match.user1Id === myId ? match.user2Id : match.user1Id;
}

const InviteToPlanModal = ({
  visible,
  plan,
  onClose,
  onAdded,
}: {
  visible: boolean;
  plan: Plan | null;
  onClose: () => void;
  onAdded: () => void;
}) => {
  const { insets } = useScreenInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const myId = user?.id ?? '';
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !plan || !myId) return;
    setSearch('');
    setLoading(true);
    matchService
      .getMyMatches()
      .then(setMatches)
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  }, [visible, plan?.id, myId]);

  const handleAdd = async (targetUserId: string) => {
    if (!plan) return;
    setAddingId(targetUserId);
    try {
      await planService.addParticipantToPlan(plan.id, targetUserId);
      onAdded();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'No se pudo agregar a la persona');
    } finally {
      setAddingId(null);
    }
  };

  if (!plan) return null;

  const joinedIds = new Set(
    plan.participants.filter((p) => p.status === 'JOINED').map((p) => p.userId)
  );
  let candidates = matches.filter((m) => {
    const oid = otherIdFromMatch(m, myId);
    return oid && !joinedIds.has(oid);
  });
  const q = search.trim().toLowerCase();
  if (q) {
    candidates = candidates.filter((m) => {
      const o = otherFromMatch(m, myId);
      return (o?.profile?.name ?? '').toLowerCase().includes(q);
    });
  }

  const isFull =
    plan.maxParticipants != null && plan.participantCount >= plan.maxParticipants;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[imo.container, { backgroundColor: theme.bg }]}>
        <View style={[imo.header, { borderBottomColor: theme.border, paddingTop: Math.max(insets.top, 12) + 8 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[imo.title, { color: theme.text }]}>Agregar al plan</Text>
            <Text style={[imo.sub, { color: theme.textMuted }]} numberOfLines={2}>
              {plan.title}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={theme.textSub} />
          </TouchableOpacity>
        </View>

        <Text style={[imo.hint, { color: theme.textMuted }]}>
          Solo puedes agregar personas con las que tengas match.
        </Text>

        <View style={[imo.searchRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="search" size={18} color={theme.textMuted} />
          <TextInput
            style={[imo.searchInput, { color: theme.text }]}
            placeholder="Buscar por nombre"
            placeholderTextColor={theme.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {isFull ? (
          <View style={imo.emptyWrap}>
            <Text style={{ color: theme.textMuted, textAlign: 'center' }}>
              Este plan ya alcanzó el máximo de participantes.
            </Text>
          </View>
        ) : loading ? (
          <View style={imo.emptyWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : candidates.length === 0 ? (
          <View style={imo.emptyWrap}>
            <Ionicons name="people-outline" size={40} color={theme.textMuted} />
            <Text style={[imo.emptyTitle, { color: theme.text }]}>
              {matches.length === 0 ? 'No tienes matches aún' : 'Nadie más por agregar'}
            </Text>
            <Text style={[imo.emptySub, { color: theme.textMuted }]}>
              {matches.length === 0
                ? 'Haz match en Descubrir para invitar a tus planes.'
                : 'Todos tus matches ya están en este plan o no coinciden con la búsqueda.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={candidates}
            keyExtractor={(m) => m.id}
            style={{ flex: 1 }}
            contentContainerStyle={[imo.listContent, { paddingBottom: insets.bottom + 28 }]}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item: m }) => {
              const o = otherFromMatch(m, myId);
              const oid = otherIdFromMatch(m, myId);
              const name = o?.profile?.name ?? 'Usuario';
              const photos = displayPhotosForImage(o?.profile?.photos);
              const busy = addingId === oid;
              const initials = inviteInitials(name);
              const bg = inviteAvatarBg(name);
              return (
                <TouchableOpacity
                  style={[imo.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => !busy && handleAdd(oid)}
                  disabled={busy}
                  activeOpacity={0.82}
                >
                  {photos[0] ? (
                    <Image source={{ uri: photos[0] }} style={imo.avatar} />
                  ) : (
                    <View style={[imo.avatar, imo.avatarPh, { backgroundColor: bg }]}>
                      <Text style={imo.avatarInitial}>{initials}</Text>
                    </View>
                  )}
                  <Text style={[imo.rowName, { color: theme.text }]} numberOfLines={1}>
                    {name}
                  </Text>
                  {busy ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="add-circle-outline" size={26} color="#00CEC9" />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
};

const imo = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 4 },
  hint: { fontSize: 12, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 6 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: 10,
  },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarPh: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 16, fontWeight: '800', color: '#fff' },
  rowName: { flex: 1, fontSize: 16, fontWeight: '600' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  emptySub: { fontSize: 13, textAlign: 'center', maxWidth: 280 },
});

const PlanesScreen = ({
  navigation,
}: {
  navigation: { navigate: (name: 'PlansMap' | 'Discovery' | string, params?: object) => void };
}) => {
  const { headerTop } = useScreenInsets();
  const { user } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const goToDiscover = useCallback(() => {
    navigation.navigate('Discovery', { screen: 'DiscoveryMain' });
  }, [navigation]);
  const [activeTab, setActiveTab] = useState<TabType>('activos');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [myPlans, setMyPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [invitePlan, setInvitePlan] = useState<Plan | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());

  const handleEdit = (plan: Plan) => { setEditingPlan(plan); setShowCreate(true); };
  const handleCloseModal = () => { setShowCreate(false); setEditingPlan(null); };

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [allRes, mineRes] = await Promise.allSettled([
        planService.getPlans(),
        planService.getMyPlans(),
      ]);

      if (allRes.status === 'fulfilled') {
        setPlans(allRes.value);
      }
      if (mineRes.status === 'fulfilled') {
        setMyPlans(mineRes.value);
      }

      if (allRes.status === 'rejected' && mineRes.status === 'rejected') {
        Alert.alert('Error', 'No se pudieron cargar los planes en este momento.');
      } else if (mineRes.status === 'rejected') {
        Alert.alert('Aviso', 'No pudimos cargar "Mis planes", pero sí los planes activos.');
      }
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los planes.');
    }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleJoin = async (id: string) => {
    try { await planService.joinPlan(id); loadData(true); }
    catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'No se pudo unir al plan'); }
  };

  const handleLeave = (id: string) =>
    Alert.alert('Salir del plan', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: async () => { try { await planService.leavePlan(id); loadData(true); } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Error'); } } },
    ]);

  const handleCancel = (id: string) =>
    Alert.alert('Cancelar plan', '¿Estás seguro? Esta acción no se puede deshacer.', [
      { text: 'No', style: 'cancel' },
      { text: 'Sí, cancelar', style: 'destructive', onPress: async () => { try { await planService.cancelPlan(id); loadData(true); } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Error'); } } },
    ]);

  const base = activeTab === 'activos' ? plans : activeTab === 'misplanes' ? myPlans : dedupePlansById([plans, myPlans]);
  const filteredByCategory =
    selectedCategory === 'ALL' ? base : base.filter((p) => p.category === selectedCategory);

  const displayedRaw =
    activeTab === 'finalizados'
      ? filteredByCategory.filter((p) => {
          const t = new Date(p.date).getTime();
          return Number.isFinite(t) ? t <= nowMs : false;
        })
      : filteredByCategory.filter((p) => {
          const t = new Date(p.date).getTime();
          return Number.isFinite(t) ? t > nowMs : true;
        });

  const displayed =
    activeTab === 'finalizados'
      ? [...displayedRaw].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      : [...displayedRaw].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: headerTop }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.discoverArrowBtn}
            onPress={goToDiscover}
            activeOpacity={0.82}
            hitSlop={{ top: 10, bottom: 10, left: 4, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Ir a Descubrir"
          >
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Planes</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.mapHeaderBtn}
            onPress={() => navigation.navigate('PlansMap')}
            activeOpacity={0.85}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
            accessibilityRole="button"
            accessibilityLabel="Mapa de planes"
          >
            <Ionicons name="map-outline" size={22} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.newBtn} onPress={() => setShowCreate(true)} activeOpacity={0.85}>
            <Ionicons name="add" size={16} color={theme.text} />
            <Text style={styles.newBtnText}>Nuevo</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <View style={styles.tabToggle}>
          {(['activos', 'misplanes', 'finalizados'] as TabType[]).map((tab) => (
            <TouchableOpacity key={tab} style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]} onPress={() => setActiveTab(tab)} activeOpacity={0.8}>
              <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
                {tab === 'activos' ? 'Activos' : tab === 'misplanes' ? 'Mis planes' : 'Finalizados'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filtersContent}>
        <TouchableOpacity style={[styles.chip, selectedCategory === 'ALL' && styles.chipActive]} onPress={() => setSelectedCategory('ALL')} activeOpacity={0.8}>
          <Text style={[styles.chipText, selectedCategory === 'ALL' && styles.chipTextActive]}>Todos</Text>
        </TouchableOpacity>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity key={cat.key} style={[styles.chip, selectedCategory === cat.key && styles.chipActive]} onPress={() => setSelectedCategory(cat.key)} activeOpacity={0.8}>
            <Text style={styles.chipEmoji}>{cat.icon}</Text>
            <Text style={[styles.chipText, selectedCategory === cat.key && styles.chipTextActive]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.id}
          contentContainerStyle={displayed.length === 0 ? styles.emptyList : styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons name={activeTab === 'finalizados' ? 'archive-outline' : 'calendar-outline'} size={36} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>
                {activeTab === 'activos'
                  ? 'No hay planes activos'
                  : activeTab === 'misplanes'
                    ? 'Sin planes creados'
                    : 'Sin planes finalizados'}
              </Text>
              <Text style={styles.emptySub}>
                {activeTab === 'activos'
                  ? 'Sé el primero en crear uno'
                  : activeTab === 'misplanes'
                    ? '¡Sé el primero en crear uno!'
                    : 'Aquí verás los planes cuya fecha y hora ya pasaron'}
              </Text>
              {activeTab !== 'finalizados' ? (
                <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)} activeOpacity={0.85}>
                  <LinearGradient colors={['#6C5CE7', '#FF6B8B']} style={styles.createBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.createBtnText}>Crear plan</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <PlanCard
              plan={item}
              userId={user?.id}
              onJoin={handleJoin}
              onLeave={handleLeave}
              onCancel={handleCancel}
              onEdit={handleEdit}
              onInvite={activeTab === 'finalizados' ? undefined : (p) => setInvitePlan(p)}
              nowMs={nowMs}
              past={activeTab === 'finalizados'}
            />
          )}
        />
      )}
      <CreatePlanModal visible={showCreate} onClose={handleCloseModal} onCreated={() => loadData(true)} editPlan={editingPlan} />
      <InviteToPlanModal
        visible={!!invitePlan}
        plan={invitePlan}
        onClose={() => setInvitePlan(null)}
        onAdded={() => loadData(true)}
      />
    </View>
  );
};

const makeStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: theme.bg },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  discoverArrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 28, fontWeight: '900', color: theme.text, flexShrink: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mapHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.surface2 },
  newBtnText: { color: theme.text, fontWeight: '700', fontSize: 13 },
  tabContainer: { paddingHorizontal: spacing.lg, paddingVertical: 10, backgroundColor: theme.bg },
  tabToggle: { flexDirection: 'row', backgroundColor: theme.surface2, borderRadius: 999, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 999, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#6C5CE7' },
  tabBtnText: { fontSize: 14, fontWeight: '600', color: theme.textMuted },
  tabBtnTextActive: { color: '#FFFFFF', fontWeight: '800' },
  filtersScroll: { backgroundColor: theme.bg, maxHeight: 52 },
  filtersContent: { paddingHorizontal: spacing.lg, paddingVertical: 8, gap: 8, flexDirection: 'row' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1.5, borderColor: theme.border, backgroundColor: 'transparent' },
  chipActive: { backgroundColor: '#6C5CE7', borderColor: '#6C5CE7' },
  chipEmoji: { fontSize: 13 },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.textSub },
  chipTextActive: { color: '#FFFFFF', fontWeight: '800' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.md },
  emptyList: { flex: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, paddingTop: 80 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(108,92,231,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 6, textAlign: 'center' },
  emptySub: { fontSize: 14, color: theme.textSub, marginBottom: spacing.xl, textAlign: 'center' },
  createBtn: { borderRadius: 999, overflow: 'hidden' },
  createBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.xl, paddingVertical: 13 },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default PlanesScreen;
