import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { matchService } from '../services/match.service';
import { useAuth } from '../context/AuthContext';
import { Match } from '../types';
import { colors, spacing } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { displayPhotosForImage } from '../utils/profilePhotos';
import { useScreenInsets } from '../utils/screenInsets';

const AVATAR_BG = ['#6C5CE7', '#FF6B8B', '#00CEC9', '#FDCB6E', '#E17055', '#A29BFE', '#636e72'];

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarBg(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_BG[Math.abs(hash) % AVATAR_BG.length];
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'ahora';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return d.toLocaleDateString('es', { weekday: 'short' });
  return d.toLocaleDateString('es', { day: '2-digit', month: '2-digit' });
}

const NewMatchAvatar = ({
  match, currentUserId, onPress,
}: { match: Match; currentUserId: string; onPress: () => void }) => {
  const { theme } = useTheme();
  const other = match.user1Id === currentUserId ? match.user2 : match.user1;
  const name = other?.profile?.name ?? 'Usuario';
  const photos = displayPhotosForImage(other?.profile?.photos);
  const initials = getInitials(name);
  const bg = getAvatarBg(name);
  const firstName = name.split(' ')[0];

  return (
    <TouchableOpacity style={nm.wrap} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={['#6C5CE7', '#FF6B8B']}
        style={nm.ring}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <View style={[nm.ringInner, { borderColor: theme.bg }]}>
          {photos[0] ? (
            <Image source={{ uri: photos[0] }} style={nm.img} />
          ) : (
            <View style={[nm.placeholder, { backgroundColor: bg }]}>
              <Text style={nm.initial}>{initials}</Text>
            </View>
          )}
        </View>
      </LinearGradient>
      <Text style={[nm.name, { color: theme.textSub }]} numberOfLines={1}>{firstName}</Text>
    </TouchableOpacity>
  );
};

const nm = StyleSheet.create({
  wrap: { alignItems: 'center', marginRight: 16, width: 68 },
  ring: { width: 62, height: 62, borderRadius: 31, padding: 2.5 },
  ringInner: { flex: 1, borderRadius: 28, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  img: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 18, fontWeight: '800', color: '#fff' },
  name: { fontSize: 12, marginTop: 6, fontWeight: '600', textAlign: 'center' },
});

const ConversationRow = ({
  match, currentUserId, onPress,
}: { match: Match; currentUserId: string; onPress: () => void }) => {
  const { theme } = useTheme();
  const other = match.user1Id === currentUserId ? match.user2 : match.user1;
  const name = other?.profile?.name ?? 'Usuario';
  const photos = displayPhotosForImage(other?.profile?.photos);
  const initials = getInitials(name);
  const bg = getAvatarBg(name);
  const lastMsg = match.lastMessage;
  const unread = match.unreadCount ?? 0;
  const isOwn = lastMsg?.senderId === currentUserId;
  const preview = lastMsg
    ? (isOwn ? `Tu: ${lastMsg.content}` : lastMsg.content)
    : 'Comienza la conversacion';
  const time = lastMsg ? formatTime(lastMsg.sentAt) : formatTime(match.matchedAt);

  return (
    <TouchableOpacity style={cv.row} onPress={onPress} activeOpacity={0.75}>
      <View style={cv.avatarWrap}>
        {photos[0] ? (
          <Image source={{ uri: photos[0] }} style={cv.avatar} />
        ) : (
          <View style={[cv.avatar, { backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={cv.initial}>{initials}</Text>
          </View>
        )}
        <View style={[cv.onlineDot, { borderColor: theme.bg }]} />
      </View>
      <View style={cv.info}>
        <View style={cv.topRow}>
          <Text style={[cv.name, { color: theme.text }]} numberOfLines={1}>{name}</Text>
          <Text style={[cv.time, { color: theme.textMuted }]}>{time}</Text>
        </View>
        <View style={cv.bottomRow}>
          <Text style={[cv.preview, { color: theme.textSub }, unread > 0 && cv.previewBold]} numberOfLines={1}>{preview}</Text>
          {unread > 0 && (
            <View style={cv.badge}>
              <Text style={cv.badgeText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const cv = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: spacing.lg },
  avatarWrap: { position: 'relative', marginRight: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  initial: { fontSize: 16, fontWeight: '800', color: '#fff' },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#00CEC9', borderWidth: 2 },
  info: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  name: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  time: { fontSize: 11 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  preview: { fontSize: 13, flex: 1, marginRight: 8 },
  previewBold: { fontWeight: '600' },
  badge: { backgroundColor: '#6C5CE7', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
});

const MatchesScreen = ({ navigation }: any) => {
  const { headerTop } = useScreenInsets();
  const { user } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try { setMatches(await matchService.getMyMatches()); } catch { setMatches([]); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const newMatches = matches.filter((m) => !m.lastMessage);
  const conversations = matches.filter((m) => !!m.lastMessage);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: headerTop }]}>
        <View>
          <Text style={styles.headerTitle}>Matches</Text>
          <Text style={styles.headerSub}>{matches.length} matches nuevos</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{matches.length}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : matches.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>💕</Text>
          <Text style={styles.emptyTitle}>Aun no tienes matches</Text>
          <Text style={styles.emptySub}>Empieza a dar likes en Discovery para conectar</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Discovery')} activeOpacity={0.85} style={styles.emptyBtn}>
            <LinearGradient colors={['#6C5CE7', '#FF6B8B']} style={styles.emptyBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="flame" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>Ir a Discovery</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true); }}
              tintColor={colors.primary}
            />
          }
        >
          {newMatches.length > 0 && (
            <View>
              <Text style={styles.sectionLabel}>NUEVOS</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: 10 }}>
                {newMatches.map((m) => (
                  <NewMatchAvatar
                    key={m.id} match={m} currentUserId={user?.id ?? ''}
                    onPress={() => navigation.navigate('Chat', { matchId: m.id, matchData: m })}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {conversations.length > 0 && (
            <View>
              <Text style={styles.sectionLabel}>CONVERSACIONES</Text>
              {conversations.map((m, i) => (
                <View key={m.id}>
                  <ConversationRow
                    match={m} currentUserId={user?.id ?? ''}
                    onPress={() => navigation.navigate('Chat', { matchId: m.id, matchData: m })}
                  />
                  {i < conversations.length - 1 && <View style={styles.separator} />}
                </View>
              ))}
            </View>
          )}

          {newMatches.length > 0 && conversations.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Text style={{ color: theme.textMuted, fontSize: 13 }}>Inicia una conversacion!</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const makeStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: theme.bg },
  headerTitle: { fontSize: 28, fontWeight: '900', color: theme.text },
  headerSub: { fontSize: 13, color: theme.textAccent, marginTop: 2 },
  badge: { backgroundColor: '#6C5CE7', borderRadius: 20, minWidth: 36, height: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  badgeText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: theme.textMuted, letterSpacing: 1.2, paddingHorizontal: spacing.lg, paddingTop: 20, paddingBottom: 2 },
  separator: { height: 1, backgroundColor: theme.border, marginHorizontal: spacing.lg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: theme.text, marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 14, color: theme.textSub, textAlign: 'center', marginBottom: 24 },
  emptyBtn: { borderRadius: 999, overflow: 'hidden' },
  emptyBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 13 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default MatchesScreen;
