import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  PanResponder,
  Alert,
  StatusBar,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { viewStory, deleteStory, type StoryItem } from "../services/story.service";
import type { StoryViewerGroupParam } from "./StoriesHubScreen";
import { apiErrorDisplayMessage } from "../services/api";
import { resolveRenderableMediaUri } from "../utils/mediaUri";

/** Espacio reservado para la barra Anterior / Siguiente en web (evita solapar pie de foto e indicación). */
const WEB_STORY_NAV_RESERVE = 80;

export default function StoryViewerScreen({ navigation, route }: { navigation: any; route: any }) {
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const safeW = Math.max(1, winW);
  const safeH = Math.max(1, winH);
  const styles = useMemo(() => makeStyles(safeW, safeH), [safeW, safeH]);

  const [localGroups, setLocalGroups] = useState<StoryViewerGroupParam[]>(() => route.params?.groups ?? []);
  const startIndex = Math.min(
    Math.max(0, route.params?.startIndex ?? 0),
    Math.max(0, (route.params?.groups ?? []).length - 1)
  );

  const [gIdx, setGIdx] = useState(startIndex);
  const [sIdx, setSIdx] = useState(0);
  const viewedRef = useRef<Set<string>>(new Set());

  const group = localGroups[gIdx];
  const story: StoryItem | undefined = group?.stories[sIdx];

  const registerView = useCallback(async () => {
    if (!story || !group) return;
    if (group.isOwn) return;
    if (viewedRef.current.has(story.id)) return;
    viewedRef.current.add(story.id);
    try {
      await viewStory(story.id);
    } catch {
      viewedRef.current.delete(story.id);
    }
  }, [story, group]);

  useEffect(() => {
    registerView();
  }, [registerView]);

  /** Precarga todas las historias del grupo actual y el siguiente (web / decodificación). */
  useEffect(() => {
    const urls = new Set<string>();
    const add = (u: string | undefined) => {
      const x = (u || "").trim();
      if (x) urls.add(resolveRenderableMediaUri(x));
    };
    group?.stories?.forEach((st) => add(st.imageUrl));
    localGroups[gIdx + 1]?.stories?.forEach((st) => add(st.imageUrl));
    urls.forEach((uri) => {
      Image.prefetch(uri).catch(() => undefined);
    });
  }, [group, localGroups, gIdx]);
  useEffect(() => {
    if (!group?.stories?.length) return;
    const urls = new Set<string>();
    const add = (u: string | undefined) => {
      const x = (u || "").trim();
      if (x) urls.add(resolveRenderableMediaUri(x));
    };
    add(group.stories[sIdx + 1]?.imageUrl);
    add(group.stories[sIdx - 1]?.imageUrl);
    if (sIdx >= group.stories.length - 1) {
      add(localGroups[gIdx + 1]?.stories?.[0]?.imageUrl);
    }
    if (sIdx <= 0) {
      const prevG = localGroups[gIdx - 1];
      const plen = prevG?.stories?.length ?? 0;
      if (plen > 0) add(prevG!.stories[plen - 1]?.imageUrl);
    }
    urls.forEach((uri) => {
      Image.prefetch(uri).catch(() => undefined);
    });
  }, [group, localGroups, gIdx, sIdx]);

  const goNextRef = useRef<() => void>(() => {});
  const goPrevRef = useRef<() => void>(() => {});

  goNextRef.current = () => {
    const gr = localGroups[gIdx];
    if (!gr) return;
    if (sIdx < gr.stories.length - 1) {
      setSIdx((i) => i + 1);
      return;
    }
    if (gIdx < localGroups.length - 1) {
      setGIdx((i) => i + 1);
      setSIdx(0);
      return;
    }
    navigation.goBack();
  };

  goPrevRef.current = () => {
    const gr = localGroups[gIdx];
    if (!gr) return;
    if (sIdx > 0) {
      setSIdx((i) => i - 1);
      return;
    }
    if (gIdx > 0) {
      const prevLen = localGroups[gIdx - 1]?.stories.length ?? 1;
      setGIdx((i) => i - 1);
      setSIdx(Math.max(0, prevLen - 1));
    }
  };

  /** En web el pan en el contenedor suele robar el foco a los toques; el avance va por la barra inferior y teclado. */
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 12 || Math.abs(g.dx) > 12,
      onPanResponderRelease: (_, g) => {
        if (g.dy > 90) {
          navigation.goBack();
          return;
        }
        if (g.dx < -40) goNextRef.current();
        else if (g.dx > 40) goPrevRef.current();
      },
    })
  ).current;

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNextRef.current();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrevRef.current();
      } else if (e.key === "Escape") {
        e.preventDefault();
        navigation.goBack();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigation]);

  const onDelete = useCallback(() => {
    if (!story || !group?.isOwn) return;

    const runDelete = async () => {
      const idToDelete = story.id;
      const gi = gIdx;
      const si = sIdx;
      try {
        await deleteStory(idToDelete);
      } catch (e) {
        const msg = apiErrorDisplayMessage(e);
        if (Platform.OS === "web" && typeof window !== "undefined") {
          window.alert(`Error\n\n${msg}`);
        } else {
          Alert.alert("Error", msg);
        }
        return;
      }

      const cur = localGroups[gi];
      if (!cur) return;
      const filtered = cur.stories.filter((s) => s.id !== idToDelete);
      let nextGroups: StoryViewerGroupParam[];
      let nextGIdx: number;
      let nextSIdx: number;

      if (filtered.length > 0) {
        nextGroups = localGroups.map((g, i) => (i === gi ? { ...g, stories: filtered } : g));
        nextGIdx = gi;
        nextSIdx = Math.min(si, filtered.length - 1);
      } else {
        // Solo se borran historias propias: al vaciar el grupo, salir (no abrir historias de matches).
        navigation.goBack();
        return;
      }

      setLocalGroups(nextGroups);
      setGIdx(nextGIdx);
      setSIdx(nextSIdx);
      if (typeof navigation.setParams === "function") {
        navigation.setParams({ groups: nextGroups });
      }
    };

    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm("¿Quitar esta publicación ahora?")) {
        void runDelete();
      }
      return;
    }

    Alert.alert("Eliminar historia", "¿Quitar esta publicación ahora?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => void runDelete(),
      },
    ]);
  }, [story, group?.isOwn, navigation, localGroups, gIdx, sIdx]);

  if (!group || !story) {
    return (
      <View style={[styles.fill, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.topBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.noMore}>No hay historias para mostrar</Text>
      </View>
    );
  }

  const rootPan = Platform.OS === "web" ? {} : pan.panHandlers;

  const storyImgKey = `${gIdx}-${sIdx}-${story.id}`;
  const rawStoryImg = typeof story.imageUrl === 'string' ? story.imageUrl.trim() : '';
  const storyImageUri = rawStoryImg ? resolveRenderableMediaUri(rawStoryImg) : '';

  return (
    <View
      style={[
        styles.fill,
        Platform.OS === "web" &&
          ({
            userSelect: "none",
            WebkitUserSelect: "none",
          } as Record<string, string>),
      ]}
      {...rootPan}
      pointerEvents={Platform.OS === "web" ? "box-none" : "auto"}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.imageStage} pointerEvents="none">
        {storyImageUri ? (
          <Image
            key={storyImgKey}
            source={{ uri: storyImageUri }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={0}
          />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#1a1a24' }]} />
        )}
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topBtn} hitSlop={14}>
          <Ionicons name="chevron-down" size={30} color="#fff" />
        </TouchableOpacity>
        <View style={styles.topCenter}>
          <Text style={styles.topName} numberOfLines={1}>
            {group.name}
          </Text>
          {group.isOwn ? (
            <View style={styles.viewsPill}>
              <Ionicons name="eye-outline" size={14} color="#fff" />
              <Text style={styles.viewsTxt}>
                {story.viewCount} vista{story.viewCount === 1 ? "" : "s"}
              </Text>
            </View>
          ) : null}
        </View>
        {group.isOwn ? (
          <Pressable
            onPress={onDelete}
            style={({ pressed }) => [styles.topBtn, pressed && styles.tapPressed]}
            hitSlop={12}
            accessibilityLabel="Eliminar historia"
            {...(Platform.OS === "web" ? ({ role: "button" } as object) : {})}
          >
            <Ionicons name="trash-outline" size={22} color="#ff6b6b" />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <View style={[styles.progressRow, { top: insets.top + 44 }]}>
        {group.stories.map((seg, i) => (
          <View
            key={seg.id}
            style={[styles.progressSeg, i <= sIdx ? styles.progressSegOn : styles.progressSegOff]}
          />
        ))}
      </View>

      {Platform.OS === "web" ? (
        <View style={[styles.webBottomBar, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          <Pressable
            style={({ pressed }) => [styles.webBottomBtn, pressed && styles.tapPressed]}
            onPress={() => goPrevRef.current()}
          >
            <Text style={styles.webBottomBtnTxt}>← Anterior</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.webBottomBtn, styles.webBottomBtnPrimary, pressed && styles.tapPressed]}
            onPress={() => goNextRef.current()}
          >
            <Text style={styles.webBottomBtnTxt}>Siguiente →</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <TouchableOpacity
            style={styles.tapL}
            onPress={() => goPrevRef.current()}
            activeOpacity={0.85}
            accessibilityLabel="Historia anterior"
          >
            <View style={styles.tapInner} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tapR}
            onPress={() => goNextRef.current()}
            activeOpacity={0.85}
            accessibilityLabel="Siguiente historia"
          >
            <View style={styles.tapInner} />
          </TouchableOpacity>
        </>
      )}

      {story.caption ? (
        <View
          style={[
            styles.captionBox,
            {
              paddingBottom:
                Platform.OS === "web"
                  ? WEB_STORY_NAV_RESERVE + Math.max(insets.bottom, 10)
                  : insets.bottom + 20,
            },
          ]}
        >
          <Text style={styles.caption}>{story.caption}</Text>
        </View>
      ) : null}

      <Text
        style={[
          styles.hint,
          {
            bottom:
              Platform.OS === "web"
                ? WEB_STORY_NAV_RESERVE + Math.max(insets.bottom, 8)
                : insets.bottom + 8,
          },
        ]}
        pointerEvents="none"
      >
        {Platform.OS === "web"
          ? "Barra inferior o teclas ← → · Esc para cerrar"
          : "Desliza abajo para cerrar · Toca los lados para avanzar"}
      </Text>
    </View>
  );
}

const makeStyles = (winW: number, winH: number) =>
  StyleSheet.create({
    fill: {
      flex: 1,
      backgroundColor: "#000",
      ...(Platform.OS === "web"
        ? ({
            minHeight: "100vh",
            maxHeight: "100vh",
            height: "100%",
            width: "100%",
            overflow: "hidden",
          } as object)
        : {}),
    },
    imageStage: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 0,
      overflow: "hidden",
    },
    topBar: {
      position: "absolute",
      left: 0,
      right: 0,
      zIndex: 20,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      gap: 8,
    },
    topBtn: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      ...Platform.select({ web: { cursor: "pointer" as const }, default: {} }),
    },
    topCenter: { flex: 1, alignItems: "center" },
    topName: {
      color: "#fff",
      fontWeight: "800",
      fontSize: 15,
      textShadowColor: "rgba(0,0,0,0.6)",
      textShadowRadius: 6,
    },
    viewsPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 4,
      backgroundColor: "rgba(0,0,0,0.45)",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    viewsTxt: { color: "#fff", fontSize: 12, fontWeight: "600" },
    progressRow: {
      position: "absolute",
      left: 12,
      right: 12,
      flexDirection: "row",
      gap: 4,
      zIndex: 19,
    },
    progressSeg: { flex: 1, height: 3, borderRadius: 2 },
    progressSegOn: { backgroundColor: "#fff" },
    progressSegOff: { backgroundColor: "rgba(255,255,255,0.35)" },
    tapInner: { flex: 1, backgroundColor: "transparent" },
    tapPressed: { opacity: 0.82 },
    tapL: {
      position: "absolute",
      left: 0,
      top: 0,
      width: Math.max(120, winW * 0.35),
      height: winH,
      zIndex: 12,
    },
    tapR: {
      position: "absolute",
      right: 0,
      top: 0,
      width: Math.max(120, winW * 0.35),
      height: winH,
      zIndex: 12,
    },
    webBottomBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 200,
      flexDirection: "row",
      justifyContent: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 10,
      backgroundColor: "rgba(0,0,0,0.82)",
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: "rgba(255,255,255,0.12)",
    },
    webBottomBtn: {
      flex: 1,
      maxWidth: 200,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.12)",
      alignItems: "center",
      justifyContent: "center",
      ...Platform.select({ web: { cursor: "pointer" as const }, default: {} }),
    },
    webBottomBtnPrimary: {
      backgroundColor: "rgba(224,86,138,0.95)",
    },
    webBottomBtnTxt: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "700",
    },
    captionBox: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 25,
      paddingHorizontal: 16,
    },
    caption: {
      color: "#fff",
      fontSize: 15,
      lineHeight: 22,
      fontWeight: "600",
      textShadowColor: "rgba(0,0,0,0.75)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 8,
    },
    hint: {
      position: "absolute",
      alignSelf: "center",
      color: "rgba(255,255,255,0.45)",
      fontSize: 11,
    },
    noMore: { color: "#fff", textAlign: "center", marginTop: 80, fontSize: 16 },
  });
