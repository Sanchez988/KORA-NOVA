import React, { useState } from 'react';
import ReportUserModal from '../components/ReportUserModal';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { matchService, DiscoveryUser } from '../services/match.service';
import { KoraNovaLogo } from '../components/KoraNovaLogo';
import { colors, spacing, borderRadius } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { firstProfilePhoto, displayPhotosForImage, coerceProfileStringList } from '../utils/profilePhotos';
import type { Match } from '../types';
import { INTEREST_ICONS } from '../data/interestIcons';

const { width } = Dimensions.get('window');
const PHOTO_HEIGHT = width * 0.9;

const calcAge = (dob: string) => {
  const b = new Date(dob);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (
    n.getMonth() < b.getMonth() ||
    (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())
  )
    a--;
  return a;
};

const ProfileDetailScreen = ({ route, navigation }: any) => {
  const { user }: { user: DiscoveryUser } = route.params;
  const { user: me } = useAuth();
  const [photoIdx, setPhotoIdx] = useState(0);
  const [actioned, setActioned] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const profile = user.profile;

  const photos = displayPhotosForImage(profile?.photos);

  const interests = coerceProfileStringList(profile?.interests as unknown);
  const hobbies = coerceProfileStringList(profile?.hobbies as unknown);

  const age = calcAge(user.dateOfBirth);
  const distanceKm = user.distance ? Math.round(user.distance / 1000) : null;

  const handleAction = async (direction: 'left' | 'right' | 'up') => {
    if (actioned) return;
    setActioned(true);
    let openedCelebrate = false;
    try {
      if (direction === 'right') {
        const result = await matchService.likeUser(user.id, false);
        if (result.match) {
          openedCelebrate = true;
          navigation.navigate('MatchCelebration', {
            matchedName: profile?.name ?? 'Tu match',
            theirPhotoUri: firstProfilePhoto(profile?.photos as unknown),
            myPhotoUri: firstProfilePhoto(me?.profile?.photos as unknown),
            advanceDiscoveryUserId: user.id,
            matchId: result.match.id,
            matchData: result.match as Match,
          });
        }
      } else if (direction === 'up') {
        const result = await matchService.likeUser(user.id, true);
        if (result.match) {
          openedCelebrate = true;
          navigation.navigate('MatchCelebration', {
            matchedName: profile?.name ?? 'Tu match',
            theirPhotoUri: firstProfilePhoto(profile?.photos as unknown),
            myPhotoUri: firstProfilePhoto(me?.profile?.photos as unknown),
            advanceDiscoveryUserId: user.id,
            matchId: result.match.id,
            matchData: result.match as Match,
          });
        }
      } else {
        await matchService.dislikeUser(user.id);
      }
    } catch {}
    if (!openedCelebrate) {
      navigation.navigate('DiscoveryMain', { actionedUserId: user.id });
    }
  };

  return (
    <View style={styles.container}>
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <KoraNovaLogo width={44} height={44} />

        {me?.id && user.id !== me.id ? (
          <TouchableOpacity
            style={styles.headerBtn}
            activeOpacity={0.8}
            onPress={() => setReportOpen(true)}
          >
            <Ionicons name="flag-outline" size={20} color="rgba(162,155,254,0.85)" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      {/* ─── Name + verified ────────────────────────────────────────────── */}
      <View style={styles.nameRow}>
        <Text style={styles.nameText}>
          {profile?.name ?? 'Usuario'}, {age}
        </Text>
        {user.verified && (
          <Ionicons
            name="checkmark-circle"
            size={22}
            color="#4FC3F7"
            style={{ marginLeft: 6 }}
          />
        )}
      </View>

      {/* ─── Scroll content ─────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Photo carousel */}
        <View style={styles.photoWrapper}>
          {photos[photoIdx] ? (
            <Image
              source={{ uri: photos[photoIdx] }}
              style={styles.photo}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Ionicons name="person" size={72} color="rgba(162,155,254,0.25)" />
            </View>
          )}

          {/* Distance badge */}
          {distanceKm !== null && (
            <View style={styles.distanceBadge}>
              <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.9)" />
              <Text style={styles.distanceText}>{distanceKm} km de ti</Text>
            </View>
          )}

          {/* Photo counter */}
          {photos.length > 1 && (
            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>
                {photoIdx + 1}/{photos.length}
              </Text>
            </View>
          )}

          {/* Dots */}
          {photos.length > 1 && (
            <View style={styles.dotsRow}>
              {photos.map((_: any, i: number) => (
                <View
                  key={i}
                  style={[styles.dot, i === photoIdx && styles.dotActive]}
                />
              ))}
            </View>
          )}

          {/* Tap zones */}
          {photos.length > 1 && (
            <>
              <TouchableOpacity
                style={styles.tapLeft}
                onPress={() => setPhotoIdx(Math.max(0, photoIdx - 1))}
                activeOpacity={1}
              />
              <TouchableOpacity
                style={styles.tapRight}
                onPress={() =>
                  setPhotoIdx(Math.min(photos.length - 1, photoIdx + 1))
                }
                activeOpacity={1}
              />
            </>
          )}
        </View>

        {/* ─── Info card (program / university / age) ─────────────────── */}
        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <Ionicons name="school-outline" size={22} color={colors.primary} />
            <Text style={styles.infoValue} numberOfLines={1}>
              {profile?.program ?? 'Sin carrera'}
            </Text>
            <Text style={styles.infoLabel}>Carrera</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoItem}>
            <Ionicons name="business-outline" size={22} color={colors.primary} />
            <Text style={styles.infoValue}>Pascual Bravo</Text>
            <Text style={styles.infoLabel}>Universidad</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoItem}>
            <Ionicons name="person-outline" size={22} color={colors.primary} />
            <Text style={styles.infoValue}>{age} años</Text>
            <Text style={styles.infoLabel}>Edad</Text>
          </View>
        </View>

        {/* ─── Bio ────────────────────────────────────────────────────── */}
        {profile?.bio ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Descripción</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        ) : null}

        {interests.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Gustos</Text>
            <View style={styles.tagsWrap}>
              {interests.map((int: string, i: number) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>
                    {INTEREST_ICONS[int] ?? '•'} {int}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {hobbies.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Pasatiempos</Text>
            <View style={styles.tagsWrap}>
              {hobbies.map((h: string, i: number) => (
                <View key={`h-${i}`} style={[styles.tag, styles.tagHobbyDetail]}>
                  <Text style={styles.tagText}>{h}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ─── Conexiones ─────────────────────────────────────────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Conexiones</Text>
          <View style={styles.conexionesRow}>
            {user.verified && (
              <View style={styles.conexionItem}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={15}
                  color={colors.primary}
                />
                <Text style={styles.conexionText}>Correo verificado</Text>
              </View>
            )}
            <View style={styles.conexionItem}>
              <Ionicons name="business-outline" size={15} color={colors.primary} />
              <Text style={styles.conexionText}>Estudiante verificado</Text>
            </View>
          </View>
        </View>

        {/* Space for fixed action bar */}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ─── Fixed action buttons ────────────────────────────────────────── */}
      <View style={styles.actionsBar}>
        <TouchableOpacity
          style={styles.actionDislike}
          onPress={() => handleAction('left')}
          activeOpacity={0.85}
        >
          <Ionicons name="close" size={30} color="rgba(255,255,255,0.75)" />
        </TouchableOpacity>

        <View style={styles.heartRingWrapper}>
          <LinearGradient
            colors={['#6C5CE7', '#FF6B8B']}
            style={styles.heartRing}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <TouchableOpacity
              style={styles.heartInner}
              onPress={() => handleAction('right')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#FF6B8B', '#6C5CE7']}
                style={styles.heartGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="heart" size={34} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <TouchableOpacity
          style={styles.actionStar}
          onPress={() => handleAction('up')}
          activeOpacity={0.85}
        >
          <Ionicons name="star" size={26} color="#A29BFE" />
        </TouchableOpacity>
      </View>

      <ReportUserModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        reportedUserId={user.id}
        onSuccess={() =>
          navigation.navigate('DiscoveryMain', { actionedUserId: user.id })
        }
      />
    </View>
  );
};

export default ProfileDetailScreen;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D1A' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#0D0D1A',
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#1C1C35',
    alignItems: 'center',
    justifyContent: 'center',
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  nameText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 4,
  },

  // Photo carousel
  photoWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 14,
    height: PHOTO_HEIGHT,
    backgroundColor: '#1A1A2E',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  distanceBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(10,10,30,0.72)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(162,155,254,0.2)',
  },
  distanceText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },

  counterBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(10,10,30,0.72)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(162,155,254,0.2)',
  },
  counterText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },

  dotsRow: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 9,
    height: 9,
  },
  tapLeft: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '45%' },
  tapRight: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '45%' },

  // Info card
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#16162A',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(108,92,231,0.18)',
    alignItems: 'center',
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  infoDivider: {
    width: 1,
    height: 48,
    backgroundColor: 'rgba(108,92,231,0.2)',
    marginHorizontal: 4,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: 'rgba(162,155,254,0.5)',
    textAlign: 'center',
  },

  // Section cards
  sectionCard: {
    backgroundColor: '#16162A',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(108,92,231,0.18)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  bioText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 22,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(108,92,231,0.12)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(108,92,231,0.25)',
  },
  tagHobbyDetail: {
    backgroundColor: 'rgba(255,107,139,0.14)',
    borderColor: 'rgba(255,107,139,0.35)',
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },

  // Conexiones
  conexionesRow: {
    flexDirection: 'row',
    gap: 20,
    flexWrap: 'wrap',
  },
  conexionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  conexionText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
  },

  // Action buttons (fixed)
  actionsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 20,
    backgroundColor: 'rgba(13,13,26,0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(108,92,231,0.15)',
  },
  actionDislike: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1C1C35',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(162,155,254,0.15)',
  },
  heartRingWrapper: {
    borderRadius: 44,
    shadowColor: '#6C5CE7',
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
    overflow: 'hidden',
  },
  heartGradient: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 38,
  },
  actionStar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1C1C35',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(162,155,254,0.15)',
  },
});
