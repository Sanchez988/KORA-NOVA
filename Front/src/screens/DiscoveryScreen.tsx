import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Animated,
  PanResponder,
  ActivityIndicator,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { matchService, DiscoveryUser } from "../services/match.service";
import type { Match } from "../types";
import * as Location from "expo-location";
import { locationService } from "../services/location.service";
import { ProfileCard } from "../components/ProfileCard";
import { KoraNovaLogo } from "../components/KoraNovaLogo";
import { colors } from "../theme/colors";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { firstProfilePhoto } from "../utils/profilePhotos";
import { ensureForegroundLocationAccess, getWebGeolocationCoords } from "../utils/permissions";
import { apiErrorDisplayMessage } from "../services/api";

const { width, height } = Dimensions.get("window");
const SWIPE_THRESHOLD = 120;

function goMatchCelebrate(
  navigation: any,
  matchedName: string,
  theirPhotoUri: string | undefined,
  myPhotoUri: string | undefined,
  advanceDiscoveryUserId: string,
  match: Match
) {
  navigation.navigate("MatchCelebration", {
    matchedName,
    theirPhotoUri,
    myPhotoUri,
    advanceDiscoveryUserId,
    matchId: match.id,
    matchData: match,
  });
}

const DiscoveryScreen = ({ navigation, route }: any) => {
  const { theme } = useTheme();
  const { user: me } = useAuth();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [users, setUsers] = useState<DiscoveryUser[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const position = useRef(new Animated.ValueXY()).current;

  // ─── Refs to avoid stale closures inside PanResponder ──────────────────────
  const usersRef = useRef<DiscoveryUser[]>([]);
  const currentIndexRef = useRef(0);
  const navigationRef = useRef(navigation);
  usersRef.current = users;
  currentIndexRef.current = currentIndex;
  navigationRef.current = navigation;

  // ─── Detect return from ProfileDetail with an action ───────────────────────
  useFocusEffect(
    useCallback(() => {
      if (route.params?.actionedUserId) {
        setCurrentIndex((i) => i + 1);
        navigation.setParams({ actionedUserId: undefined });
      }
    }, [route.params?.actionedUserId])
  );

  const updateLocation = async () => {
    try {
      if (Platform.OS === "web") {
        const coords = await getWebGeolocationCoords(true);
        if (!coords) return;
        await locationService.updateLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        });
        return;
      }

      const ok = await ensureForegroundLocationAccess({
        suppressDenyFollowUp: true,
      });
      if (!ok) return;

      const location = await Location.getCurrentPositionAsync({});
      await locationService.updateLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
      });
    } catch {
      /* silenciar fallos GPS / red durante carga inicial */
    }
  };

  const loadUsers = async () => {
    try {
      const list = await matchService.getDiscoveryUsers();
      setUsers(list);
    } catch (e) {
      const msg = apiErrorDisplayMessage(e);
      Alert.alert(
        "No se pudo cargar Descubrir",
        msg.includes("perfil") || msg.includes("ubicación") || msg.includes("ubicacion")
          ? `${msg}\n\nCompleta tu perfil y permite ubicación, luego vuelve a intentar o pulsa Recargar.`
          : msg || "Revisa tu conexión e inténtalo de nuevo."
      );
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await updateLocation();
      if (!cancelled) await loadUsers();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshDiscovery = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await updateLocation();
      const list = await matchService.getDiscoveryUsers();
      setUsers(list);
      setCurrentIndex(0);
      if (list.length === 0) {
        Alert.alert(
          "Descubrir",
          "No hay más perfiles por ahora. Asegúrate de que otros usuarios tengan perfil y ubicación, o vuelve más tarde."
        );
      }
    } catch (e) {
      const msg = apiErrorDisplayMessage(e);
      Alert.alert(
        "No se pudieron actualizar las recomendaciones",
        msg.includes("perfil") || msg.includes("ubicación") || msg.includes("ubicacion")
          ? `${msg}\n\nActiva compartir ubicación en Ajustes, entra de nuevo a Descubrir o completa el perfil.`
          : msg || "Revisa conexión, que el backend esté en marcha y EXPO_PUBLIC_API_URL en el móvil."
      );
    } finally {
      setRefreshing(false);
    }
  };

  // ─── Stable handlers using refs ────────────────────────────────────────────
  const handleSwipeStable = useCallback(async (direction: "left" | "right" | "up") => {
    const idx = currentIndexRef.current;
    const list = usersRef.current;
    if (idx >= list.length) return;
    const discoveryUser = list[idx];
    const myShot = firstProfilePhoto(me?.profile?.photos as unknown);
    try {
      if (direction === "right") {
        const result = await matchService.likeUser(discoveryUser.id, false);
        if (result.match) {
          goMatchCelebrate(
            navigationRef.current,
            discoveryUser.profile?.name ?? "Tu match",
            firstProfilePhoto(discoveryUser.profile?.photos as unknown),
            myShot,
            discoveryUser.id,
            result.match
          );
          return;
        }
      } else if (direction === "up") {
        const result = await matchService.likeUser(discoveryUser.id, true);
        if (result.match) {
          goMatchCelebrate(
            navigationRef.current,
            discoveryUser.profile?.name ?? "Tu match",
            firstProfilePhoto(discoveryUser.profile?.photos as unknown),
            myShot,
            discoveryUser.id,
            result.match
          );
          return;
        }
      } else {
        await matchService.dislikeUser(discoveryUser.id);
      }
      setCurrentIndex((i) => i + 1);
    } catch {
      Alert.alert("Error", "No se pudo procesar la accion");
    }
  }, [me?.profile?.photos]);

  const handleSwipeRef = useRef(handleSwipeStable);
  handleSwipeRef.current = handleSwipeStable;

  const animateSwipeStable = useCallback(
    (direction: "left" | "right" | "up") => {
      const x = direction === "left" ? -width * 2 : direction === "right" ? width * 2 : 0;
      const y = direction === "up" ? -height * 2 : 0;
      Animated.spring(position, { toValue: { x, y }, useNativeDriver: true }).start(() => {
        position.setValue({ x: 0, y: 0 });
        handleSwipeRef.current(direction);
      });
    },
    [position]
  );

  const animateSwipeRef = useRef(animateSwipeStable);
  animateSwipeRef.current = animateSwipeStable;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        const dx = Math.abs(gesture.dx);
        const dy = Math.abs(gesture.dy);

        // Tap detection (very small movement = open profile detail)
        if (dx < 10 && dy < 10) {
          const idx = currentIndexRef.current;
          const list = usersRef.current;
          if (idx < list.length) {
            navigationRef.current.navigate("ProfileDetail", { user: list[idx] });
          }
          return;
        }

        if (gesture.dy < -SWIPE_THRESHOLD) animateSwipeRef.current("up");
        else if (gesture.dx > SWIPE_THRESHOLD) animateSwipeRef.current("right");
        else if (gesture.dx < -SWIPE_THRESHOLD) animateSwipeRef.current("left");
        else Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
      },
    })
  ).current;

  const rotate = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ["-10deg", "0deg", "10deg"],
    extrapolate: "clamp",
  });

  const likeOpacity = position.x.interpolate({ inputRange: [0, width / 4], outputRange: [0, 1], extrapolate: "clamp" });
  const nopeOpacity = position.x.interpolate({ inputRange: [-width / 4, 0], outputRange: [1, 0], extrapolate: "clamp" });

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Buscando personas cerca de ti...</Text>
        </View>
      </View>
    );
  }

  // ─── Empty ──────────────────────────────────────────────────────────────────
  if (currentIndex >= users.length) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerSideBtn}
            onPress={() => navigation.getParent()?.navigate('Profile')}
            activeOpacity={0.8}
          >
            <Ionicons name="person-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <KoraNovaLogo width={110} height={40} />
          <TouchableOpacity
            style={styles.headerSideBtn}
            activeOpacity={0.7}
            onPress={refreshDiscovery}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="rgba(162,155,254,0.95)" />
            ) : (
              <Ionicons name="sparkles-outline" size={23} color="rgba(162,155,254,0.85)" />
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>😊</Text>
          <Text style={styles.emptyTitle}>No hay más perfiles por ahora.</Text>
          <Text style={styles.emptyText}>¡Vuelve más tarde!</Text>
          <TouchableOpacity
            style={styles.reloadButton}
            onPress={refreshDiscovery}
          >
            <LinearGradient colors={["#6C5CE7", "#FF6B8B"]} style={styles.reloadGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.reloadButtonText}>Recargar</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentUser = users[currentIndex];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerSideBtn}
          activeOpacity={0.8}
          onPress={() => navigation.getParent()?.navigate('Profile')}
        >
          <Ionicons name="person-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <KoraNovaLogo width={110} height={40} />

        <TouchableOpacity
          style={styles.headerSideBtn}
          activeOpacity={0.7}
          onPress={refreshDiscovery}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="rgba(162,155,254,0.95)" />
          ) : (
            <Ionicons name="sparkles-outline" size={23} color="rgba(162,155,254,0.9)" />
          )}
        </TouchableOpacity>
      </View>

      {/* Card stack */}
      <View style={styles.cardContainer}>
        {currentIndex + 1 < users.length && (
          <ProfileCard user={users[currentIndex + 1]} style={styles.nextCard} />
        )}

        <Animated.View
          {...panResponder.panHandlers}
          style={[styles.card, { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] }]}
        >
          <ProfileCard user={currentUser} />

          <Animated.View style={[styles.likeLabel, { opacity: likeOpacity }]}>
            <Text style={styles.likeLabelText}>LIKE</Text>
          </Animated.View>
          <Animated.View style={[styles.nopeLabel, { opacity: nopeOpacity }]}>
            <Text style={styles.nopeLabelText}>NOPE</Text>
          </Animated.View>
        </Animated.View>
      </View>

      {/* Action buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionDislike} onPress={() => animateSwipeStable("left")} activeOpacity={0.85}>
          <Ionicons name="close" size={30} color="rgba(255,255,255,0.75)" />
        </TouchableOpacity>

        <View style={styles.heartRingWrapper}>
          <LinearGradient
            colors={["#6C5CE7", "#FF6B8B"]}
            style={styles.heartRing}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <TouchableOpacity style={styles.heartInner} onPress={() => animateSwipeStable("right")} activeOpacity={0.85}>
              <LinearGradient
                colors={["#FF6B8B", "#6C5CE7"]}
                style={styles.heartGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="heart" size={34} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <TouchableOpacity style={styles.actionStar} onPress={() => animateSwipeStable("up")} activeOpacity={0.85}>
          <Ionicons name="star" size={26} color="#A29BFE" />
        </TouchableOpacity>
      </View>

      {/* Hint */}
      <View style={styles.hintRow}>
        <Text style={styles.hintText}>👆 Toca la tarjeta para ver el perfil completo</Text>
      </View>
    </View>
  );
};

export default DiscoveryScreen;

const makeStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  loadingText: { color: theme.textAccent, fontSize: 15 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: theme.bg,
  },
  headerSideBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: theme.surface2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  cardContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  card: {
    position: "absolute",
  },
  nextCard: {
    transform: [{ scale: 0.95 }],
    opacity: 0.65,
  },

  likeLabel: {
    position: "absolute",
    top: 40,
    left: 20,
    backgroundColor: "#06D6A0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    transform: [{ rotate: "-20deg" }],
    borderWidth: 3,
    borderColor: "#06D6A0",
  },
  likeLabelText: { color: "#fff", fontSize: 28, fontWeight: "800" },
  nopeLabel: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "#EF476F",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    transform: [{ rotate: "20deg" }],
  },
  nopeLabelText: { color: "#fff", fontSize: 28, fontWeight: "800" },

  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 20,
  },
  actionDislike: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.surface2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: theme.border,
  },
  heartRingWrapper: {
    borderRadius: 44,
    overflow: "hidden",
    shadowColor: "#6C5CE7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
  heartRing: {
    padding: 3,
    borderRadius: 44,
  },
  heartInner: {
    borderRadius: 41,
    overflow: "hidden",
  },
  heartGradient: {
    width: 76,
    height: 76,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 38,
  },
  actionStar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.surface2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: theme.border,
  },

  hintRow: {
    alignItems: "center",
    paddingBottom: 14,
  },
  hintText: {
    color: theme.textMuted,
    fontSize: 13,
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyEmoji: { fontSize: 72, marginBottom: 20 },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.text,
    marginBottom: 8,
    textAlign: "center",
    width: "100%",
  },
  emptyText: { fontSize: 14, color: theme.textAccent, textAlign: "center", marginBottom: 32 },
  reloadButton: { borderRadius: 30, overflow: "hidden" },
  reloadGradient: { paddingHorizontal: 36, paddingVertical: 14, alignItems: "center" },
  reloadButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
