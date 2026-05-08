import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { KORA_LILAC } from "../design/koraNova";
import { DiscoveryUser } from "../services/match.service";
import { INTEREST_ICONS } from "../data/interestIcons";
import { displayPhotosForImage, coerceProfileStringList } from "../utils/profilePhotos";

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width - 28;
const CARD_HEIGHT = height * 0.68;

interface ProfileCardProps {
  user: DiscoveryUser;
  style?: any;
}

const calcAge = (dob: string) => {
  const b = new Date(dob);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
};

export const ProfileCard: React.FC<ProfileCardProps> = ({ user, style }) => {
  const profile = user.profile;
  const [photoIdx, setPhotoIdx] = useState(0);

  const photos = displayPhotosForImage(profile?.photos);

  const interests = coerceProfileStringList(profile?.interests as unknown);
  const hobbies = coerceProfileStringList(profile?.hobbies as unknown);

  const mainPhoto = photos[photoIdx] || null;
  const age = calcAge(user.dateOfBirth);
  const distanceKm = user.distance ? Math.round(user.distance / 1000) : null;

  const goNext = () => { if (photoIdx < photos.length - 1) setPhotoIdx(photoIdx + 1); };
  const goPrev = () => { if (photoIdx > 0) setPhotoIdx(photoIdx - 1); };

  return (
    <View style={[styles.card, style]}>
      {/* Photo */}
      {mainPhoto ? (
        <Image source={{ uri: mainPhoto }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="person" size={80} color="rgba(162,155,254,0.3)" />
        </View>
      )}

      {/* Photo progress bars */}
      {photos.length > 1 && (
        <View style={styles.progressBars}>
          {photos.map((_: any, i: number) => (
            <View key={i} style={[styles.progressBar, i === photoIdx && styles.progressBarActive]} />
          ))}
        </View>
      )}

      {/* Tap zones for photo navigation */}
      {photos.length > 1 && (
        <>
          <TouchableOpacity style={styles.tapLeft} onPress={goPrev} activeOpacity={1} />
          <TouchableOpacity style={styles.tapRight} onPress={goNext} activeOpacity={1} />
        </>
      )}

      {/* Top badges (referencia: minimal — solo distancia si aplica) */}
      {distanceKm !== null && (
        <View style={styles.topBadgesRow}>
          <View style={[styles.badge, styles.badgeRight]}>
            <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.75)" />
            <Text style={styles.badgeText}>{distanceKm} km</Text>
          </View>
        </View>
      )}

      {/* Bottom gradient + info */}
      <LinearGradient
        colors={["transparent", "rgba(18,18,35,0.82)", `${colors.background}`]}
        style={styles.gradient}
        locations={[0, 0.4, 1]}
      />

      <View style={styles.infoContainer}>
        {/* Name + age + verified */}
        <View style={styles.nameRow}>
          <Text style={styles.name}>{profile?.name ?? "Usuario"}</Text>
          <Text style={styles.age}>, {age}</Text>
          {user.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={21} color={KORA_LILAC} />
            </View>
          )}
        </View>

        {/* Referencia tipo “María”: carrera + universidad en dos líneas */}
        <Text style={styles.studyLine} numberOfLines={2}>
          {profile?.program
            ? `Estudia ${profile.program}`
            : 'Estudiante Pascual Bravo'}
        </Text>
        <Text style={styles.univLine} numberOfLines={1}>
          Instituto Tecnológico Pascual Bravo
        </Text>

        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          style={styles.infoScroll}
          contentContainerStyle={styles.infoScrollInner}
          keyboardShouldPersistTaps="handled"
        >
          {/* Descripción */}
          {profile?.bio ? (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Descripción</Text>
              <Text style={styles.bio}>{profile.bio}</Text>
            </View>
          ) : null}

          {/* Gustos / intereses */}
          {interests.length > 0 && (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Gustos</Text>
              <View style={styles.tags}>
                {interests.slice(0, 12).map((int: string, i: number) => (
                  <View key={`g-${i}`} style={styles.tag}>
                    <Text style={styles.tagText}>
                      {INTEREST_ICONS[int] ?? "•"} {int}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Pasatiempos */}
          {hobbies.length > 0 && (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Pasatiempos</Text>
              <View style={styles.tags}>
                {hobbies.slice(0, 12).map((h: string, i: number) => (
                  <View key={`h-${i}`} style={styles.tagHobby}>
                    <Text style={styles.tagText}>{h}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 30,
    backgroundColor: "#1A1A2E",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
  },
  image: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "#1A1A38",
    alignItems: "center",
    justifyContent: "center",
  },
  progressBars: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    gap: 5,
    zIndex: 10,
  },
  progressBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  progressBarActive: {
    backgroundColor: "#FFFFFF",
  },
  tapLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: "35%",
    width: "45%",
    zIndex: 5,
  },
  tapRight: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: "35%",
    width: "45%",
    zIndex: 5,
  },
  topBadgesRow: {
    position: "absolute",
    top: 26,
    left: 14,
    right: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(10,10,30,0.72)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(162,155,254,0.2)",
  },
  badgeRight: {
    marginLeft: "auto",
  },
  badgeText: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 12,
    fontWeight: "600",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "60%",
  },
  infoContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
    paddingBottom: 16,
  },
  infoScroll: {
    maxHeight: height * 0.33,
    marginHorizontal: -2,
    marginTop: 4,
  },
  infoScrollInner: {
    paddingBottom: 12,
    flexGrow: 1,
  },
  sectionBlock: {
    marginTop: 6,
    marginBottom: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(162,155,254,0.95)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    flexWrap: "nowrap",
  },
  name: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  age: {
    fontSize: 24,
    fontWeight: "400",
    color: "#FFFFFF",
    marginLeft: 1,
  },
  verifiedBadge: {
    marginLeft: 6,
  },
  studyLine: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
    lineHeight: 20,
  },
  univLine: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.88)",
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 20,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  tag: {
    backgroundColor: "rgba(20,20,45,0.75)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(162,155,254,0.25)",
  },
  tagHobby: {
    backgroundColor: "rgba(255,107,139,0.12)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,107,139,0.35)",
  },
  tagText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "500",
  },
});
