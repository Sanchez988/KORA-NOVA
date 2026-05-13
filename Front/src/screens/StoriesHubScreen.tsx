import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { spacing, colors } from "../theme/colors";
import {
  getMatchesStories,
  getMyStories,
  type MatchStoryGroup,
  type StoryItem,
} from "../services/story.service";
import { displayPhotosForImage } from "../utils/profilePhotos";

const RING = 76;
const AVATAR = 68;

export type StoryViewerGroupParam = {
  userId: string;
  name: string;
  avatarUri?: string;
  isOwn: boolean;
  stories: StoryItem[];
};

export function buildStoryViewerGroups(
  user: { id: string; profile?: { name?: string; photos?: unknown } } | null | undefined,
  mine: StoryItem[],
  matchGroups: MatchStoryGroup[]
): StoryViewerGroupParam[] {
  const out: StoryViewerGroupParam[] = [];
  const myPhotos = displayPhotosForImage(user?.profile?.photos);
  if (mine.length > 0) {
    out.push({
      userId: user?.id ?? "me",
      name: "Tu historia",
      avatarUri: myPhotos[0],
      isOwn: true,
      stories: mine,
    });
  }
  for (const g of matchGroups) {
    if (!g.stories?.length) continue;
    const photos = displayPhotosForImage(g.user?.profile?.photos);
    out.push({
      userId: g.user.id,
      name: g.user.profile?.name ?? "Match",
      avatarUri: photos[0],
      isOwn: false,
      stories: g.stories,
    });
  }
  return out;
}

export default function StoriesHubScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [mine, setMine] = useState<StoryItem[]>([]);
  const [matchGroups, setMatchGroups] = useState<MatchStoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [m, mg] = await Promise.all([getMyStories(), getMatchesStories()]);
      setMine(m);
      setMatchGroups(mg);
    } catch {
      setMine([]);
      setMatchGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const groups = useMemo(
    () => buildStoryViewerGroups(user, mine, matchGroups),
    [user, mine, matchGroups]
  );

  const stripData = useMemo(() => {
    const items: {
      key: string;
      label: string;
      uri?: string;
      hasRing: boolean;
      onPress: () => void;
    }[] = [];

    items.push({
      key: "add",
      label: "Publicar",
      uri: user?.profile ? displayPhotosForImage(user.profile.photos)[0] : undefined,
      hasRing: mine.length > 0,
      onPress: () => navigation.navigate("CreateStory"),
    });

    for (const g of groups) {
      const unread = g.stories.some((s) => !s.viewed);
      items.push({
        key: g.userId,
        label: g.isOwn ? "Tú" : g.name.split(" ")[0] ?? "Match",
        uri: g.avatarUri,
        hasRing: unread || g.isOwn,
        onPress: () => {
          const all = buildStoryViewerGroups(user, mine, matchGroups);
          const idx = all.findIndex((x) => x.userId === g.userId);
          navigation.navigate("StoryViewer", {
            groups: all,
            startIndex: Math.max(0, idx),
          });
        },
      });
    }
    return items;
  }, [groups, mine, matchGroups, navigation, user]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Historias</Text>
          <Text style={styles.headerSub}>Visibles para tus matches; caducan en 24 h</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn} hitSlop={12}>
          <Ionicons name="close" size={26} color={theme.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          <Text style={styles.section}>Toca un avatar para ver · «Publicar» para crear</Text>
          <FlatList
            horizontal
            data={stripData}
            keyExtractor={(i) => i.key}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.strip}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.ringWrap} onPress={item.onPress} activeOpacity={0.85}>
                {item.key === "add" ? (
                  <LinearGradient
                    colors={["#6C5CE7", "#FF6B8B"]}
                    style={styles.ringOuter}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.ringInner}>
                      {item.uri ? (
                        <Image source={{ uri: item.uri }} style={styles.avatar} />
                      ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                          <Ionicons name="person" size={28} color="rgba(255,255,255,0.5)" />
                        </View>
                      )}
                      <View style={styles.plusBadge}>
                        <Ionicons name="add" size={18} color="#fff" />
                      </View>
                    </View>
                  </LinearGradient>
                ) : item.hasRing ? (
                  <LinearGradient
                    colors={["#6C5CE7", "#FF6B8B"]}
                    style={styles.ringOuter}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.ringInner}>
                      {item.uri ? (
                        <Image source={{ uri: item.uri }} style={styles.avatar} />
                      ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                          <Text style={styles.mono}>{item.label[0]?.toUpperCase() ?? "?"}</Text>
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                ) : (
                  <View style={styles.ringOuterMuted}>
                    <View style={styles.ringInner}>
                      {item.uri ? (
                        <Image source={{ uri: item.uri }} style={styles.avatar} />
                      ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholderMuted]}>
                          <Text style={styles.mono}>{item.label[0]?.toUpperCase() ?? "?"}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
                <Text style={styles.ringLabel} numberOfLines={1}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />

          {groups.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="images-outline" size={52} color={theme.textMuted} />
              <Text style={styles.emptyTitle}>Aún no hay historias activas</Text>
              <Text style={styles.emptySub}>
                Crea la tuya o vuelve cuando tus matches publiquen. Las historias desaparecen solas a las 24 horas.
              </Text>
              <TouchableOpacity
                style={styles.cta}
                onPress={() => navigation.navigate("CreateStory")}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={["#6C5CE7", "#FF6B8B"]}
                  style={styles.ctaGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.ctaTxt}>Nueva historia</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
    },
    headerTitle: { fontSize: 26, fontWeight: "900", color: theme.text },
    headerSub: { fontSize: 13, color: theme.textMuted, marginTop: 4 },
    closeBtn: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: theme.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    section: {
      fontSize: 11,
      fontWeight: "800",
      color: theme.textMuted,
      letterSpacing: 1.1,
      paddingHorizontal: spacing.lg,
      marginBottom: 10,
    },
    strip: { paddingHorizontal: spacing.md, paddingBottom: 20 },
    ringWrap: { alignItems: "center", width: RING + 16, marginHorizontal: 4 },
    ringOuter: {
      width: RING,
      height: RING,
      borderRadius: RING / 2,
      padding: 3,
      alignItems: "center",
      justifyContent: "center",
    },
    ringOuterMuted: {
      width: RING,
      height: RING,
      borderRadius: RING / 2,
      padding: 3,
      borderWidth: 2,
      borderColor: theme.border,
      alignItems: "center",
      justifyContent: "center",
    },
    ringInner: {
      width: AVATAR,
      height: AVATAR,
      borderRadius: AVATAR / 2,
      backgroundColor: theme.surface,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 },
    avatarPlaceholder: { backgroundColor: "#3d3756", alignItems: "center", justifyContent: "center" },
    avatarPlaceholderMuted: { backgroundColor: theme.surface2, alignItems: "center", justifyContent: "center" },
    mono: { fontSize: 22, fontWeight: "800", color: theme.textMuted },
    plusBadge: {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: "#6C5CE7",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: theme.bg,
    },
    ringLabel: {
      marginTop: 8,
      fontSize: 11,
      fontWeight: "600",
      color: theme.textMuted,
      maxWidth: RING + 12,
      textAlign: "center",
    },
    empty: { paddingHorizontal: spacing.lg, paddingTop: 32, alignItems: "center" },
    emptyTitle: { fontSize: 18, fontWeight: "800", color: theme.text, marginTop: 16 },
    emptySub: { fontSize: 14, color: theme.textMuted, textAlign: "center", marginTop: 8, lineHeight: 21 },
    cta: { marginTop: 24, borderRadius: 16, overflow: "hidden" },
    ctaGrad: { paddingVertical: 14, paddingHorizontal: 28 },
    ctaTxt: { color: "#fff", fontWeight: "800", fontSize: 16, textAlign: "center" },
  });
