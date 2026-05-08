import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, RefreshControl, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { matchService } from '../services/match.service';
import { useAuth } from '../context/AuthContext';
import { Match } from '../types';
import { colors, spacing } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { displayPhotosForImage } from '../utils/profilePhotos';

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
  return d.toLocaleDateString('es', { day: '2-digit', month: '2-digit' });
}

const ConversationItem = ({
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
  avatarWrap: { marginRight: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  initial: { fontSize: 16, fontWeight: '800', color: '#fff' },
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

const MensajesScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try { setMatches(await matchService.getMyMatches()); } catch { setMatches([]); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const filtered = search.trim()
    ? matches.filter((m) => {
        const other = m.user1Id === user?.id ? m.user2 : m.user1;
        return (other?.profile?.name ?? '').toLowerCase().includes(search.toLowerCase());
      })
    : matches;

  const totalUnread = matches.reduce((acc, m) => acc + (m.unreadCount ?? 0), 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mensajes</Text>
          <Text style={styles.headerSub}>Tus conversaciones</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{totalUnread > 0 ? totalUnread : matches.length}</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={theme.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Buscar conversacion..."
          placeholderTextColor={theme.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubble-outline" size={48} color={theme.textAccent} />
          <Text style={styles.emptyTitle}>{search ? 'Sin resultados' : 'Sin conversaciones aun'}</Text>
          <Text style={styles.emptySub}>{search ? 'Intenta con otro nombre' : 'Conecta con alguien en Matches'}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={<Text style={styles.sectionLabel}>RECIENTES</Text>}
          renderItem={({ item }) => (
            <ConversationItem
              match={item}
              currentUserId={user?.id ?? ''}
              onPress={() => navigation.navigate('Chat', { matchId: item.id, matchData: item })}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true); }}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const makeStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 52, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: theme.bg },
  headerTitle: { fontSize: 28, fontWeight: '900', color: theme.text },
  headerSub: { fontSize: 13, color: theme.textAccent, marginTop: 2 },
  badge: { backgroundColor: '#6C5CE7', borderRadius: 20, minWidth: 36, height: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  badgeText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 14, marginHorizontal: spacing.lg, marginTop: 4, marginBottom: 4, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: theme.border },
  searchInput: { flex: 1, fontSize: 14 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: theme.textMuted, letterSpacing: 1.2, paddingHorizontal: spacing.lg, paddingTop: 14, paddingBottom: 4 },
  separator: { height: 1, backgroundColor: theme.border, marginHorizontal: spacing.lg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.textSub, marginTop: 12 },
  emptySub: { fontSize: 13, color: theme.textMuted, textAlign: 'center', paddingHorizontal: 32 },
});

export default MensajesScreen;
