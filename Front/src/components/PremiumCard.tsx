import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme } from '../theme/darkTheme';
import { displayPhotosForImage } from '../utils/profilePhotos';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.9;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

interface PremiumCardProps {
  profile: {
    id: string;
    name: string;
    age: number;
    photos: string[];
    bio?: string;
    program?: string;
    semester?: number;
    interests?: string[];
    distance?: number;
    isOnline?: boolean;
    verified?: boolean;
  };
  onLike?: () => void;
  onPass?: () => void;
  onSuperLike?: () => void;
  onShowMore?: () => void;
}

export const PremiumCard: React.FC<PremiumCardProps> = ({
  profile,
  onLike,
  onPass,
  onSuperLike,
  onShowMore,
}) => {
  const photos = displayPhotosForImage(profile.photos as unknown);
  const mainPhoto = photos[0] ?? null;
  const interests = typeof profile.interests === 'string'
    ? JSON.parse(profile.interests)
    : profile.interests || [];

  return (
    <View style={[styles.card, darkTheme.shadows.xl]}>
      {/* Imagen principal con gradiente */}
      <View style={styles.imageContainer}>
        {mainPhoto ? (
          <Image source={{ uri: mainPhoto }} style={styles.image} />
        ) : (
          <LinearGradient
            colors={darkTheme.colors.gradient.dark}
            style={styles.imagePlaceholder}
          >
            <Ionicons name="person" size={100} color={darkTheme.colors.text.tertiary} />
          </LinearGradient>
        )}
        
        {/* Gradiente overlay inferior */}
        <LinearGradient
          colors={['transparent', 'rgba(10, 10, 15, 0.95)']}
          style={styles.gradient}
        />

        {/* Badge de verificado */}
        {profile.verified && (
          <View style={styles.verifiedBadge}>
            <LinearGradient
              colors={['#00E676', '#00C853']}
              style={styles.badgeGradient}
            >
              <Ionicons name="checkmark-circle" size={16} color="#FFF" />
            </LinearGradient>
          </View>
        )}

        {/* Estado online */}
        {profile.isOnline && (
          <View style={styles.onlineIndicator}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>En línea</Text>
          </View>
        )}

        {/* Galería de fotos miniatura */}
        {photos && photos.length > 1 && (
          <View style={styles.photoIndicators}>
            {photos.slice(0, 4).map((photo: string, index: number) => (
              <View key={index} style={styles.photoIndicator} />
            ))}
          </View>
        )}
      </View>

      {/* Información superpuesta */}
      <View style={styles.infoContainer}>
        {/* Nombre y edad */}
        <View style={styles.nameRow}>
          <Text style={styles.name}>
            {profile.name}, {profile.age}
          </Text>
          {profile.verified && (
            <Ionicons name="shield-checkmark" size={20} color="#00F5D4" />
          )}
        </View>

        {/* Programa y semestre */}
        {profile.program && (
          <View style={styles.programRow}>
            <Ionicons name="school" size={14} color={darkTheme.colors.text.secondary} />
            <Text style={styles.program}>
              {profile.program}
              {profile.semester && ` • ${profile.semester}° semestre`}
            </Text>
          </View>
        )}

        {/* Distancia */}
        {profile.distance !== undefined && (
          <View style={styles.distanceRow}>
            <Ionicons name="location" size={14} color={darkTheme.colors.brand.accent} />
            <Text style={styles.distance}>A {profile.distance} km</Text>
          </View>
        )}

        {/* Bio */}
        {profile.bio && (
          <TouchableOpacity onPress={onShowMore} style={styles.bioContainer}>
            <Text style={styles.bioLabel}>Sobre mí</Text>
            <Text style={styles.bio} numberOfLines={2}>
              {profile.bio}
            </Text>
            <Text style={styles.readMore}>Ver más...</Text>
          </TouchableOpacity>
        )}

        {/* Intereses/Tags */}
        {interests.length > 0 && (
          <View style={styles.tagsContainer}>
            <Text style={styles.tagsLabel}>Intereses</Text>
            <View style={styles.tags}>
              {interests.slice(0, 3).map((interest: string, index: number) => (
                <LinearGradient
                  key={index}
                  colors={darkTheme.colors.gradient.card}
                  style={styles.tag}
                >
                  <Text style={styles.tagText}>{getInterestEmoji(interest)} {interest}</Text>
                </LinearGradient>
              ))}
              {interests.length > 3 && (
                <TouchableOpacity style={styles.moreTag} onPress={onShowMore}>
                  <Text style={styles.moreTagText}>+{interests.length - 3}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Botones de acción */}
      <View style={styles.actionsContainer}>
        {/* Botón de pasar */}
        <TouchableOpacity onPress={onPass} style={[styles.actionButton, styles.passButton]}>
          <Ionicons name="close" size={32} color="#FF1744" />
        </TouchableOpacity>

        {/* Botón de super like */}
        <TouchableOpacity onPress={onSuperLike} style={[styles.actionButton, styles.superLikeButton]}>
          <LinearGradient
            colors={darkTheme.colors.gradient.secondary}
            style={styles.superLikeGradient}
          >
            <Ionicons name="star" size={24} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Botón de me gusta */}
        <TouchableOpacity onPress={onLike} style={[styles.actionButton, styles.likeButton]}>
          <LinearGradient
            colors={darkTheme.colors.gradient.primary}
            style={styles.likeGradient}
          >
            <Ionicons name="heart" size={32} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Botón de ver más */}
        <TouchableOpacity onPress={onShowMore} style={[styles.actionButton, styles.moreButton]}>
          <Ionicons name="information-circle" size={24} color={darkTheme.colors.text.secondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Helper para obtener emoji según el interés
const getInterestEmoji = (interest: string): string => {
  const emojiMap: { [key: string]: string } = {
    'Música': '🎵',
    'Deportes': '⚽',
    'Arte': '🎨',
    'Cine': '🎬',
    'Tecnología': '💻',
    'Viajes': '✈️',
    'Lectura': '📚',
    'Cocina': '🍳',
    'Fotografía': '📷',
    'Gym': '💪',
    'Videojuegos': '🎮',
    'Naturaleza': '🌿',
  };
  return emojiMap[interest] || '✨';
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: darkTheme.colors.background.card,
    borderRadius: darkTheme.borderRadius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: darkTheme.colors.border.light,
  },
  imageContainer: {
    height: '70%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  badgeGradient: {
    padding: 6,
    borderRadius: darkTheme.borderRadius.full,
  },
  onlineIndicator: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: darkTheme.borderRadius.full,
    borderWidth: 1,
    borderColor: '#00E676',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00E676',
    marginRight: 6,
  },
  onlineText: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: '600',
  },
  photoIndicators: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  photoIndicator: {
    width: 40,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  infoContainer: {
    flex: 1,
    padding: darkTheme.spacing.lg,
    paddingTop: darkTheme.spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: darkTheme.spacing.xs,
  },
  name: {
    fontSize: 26,
    fontWeight: '700',
    color: darkTheme.colors.text.primary,
    marginRight: darkTheme.spacing.sm,
  },
  programRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  program: {
    fontSize: 13,
    color: darkTheme.colors.text.secondary,
    marginLeft: 6,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: darkTheme.spacing.md,
  },
  distance: {
    fontSize: 13,
    color: darkTheme.colors.brand.accent,
    marginLeft: 4,
    fontWeight: '600',
  },
  bioContainer: {
    marginBottom: darkTheme.spacing.md,
  },
  bioLabel: {
    fontSize: 12,
    color: darkTheme.colors.text.tertiary,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bio: {
    fontSize: 14,
    color: darkTheme.colors.text.secondary,
    lineHeight: 20,
  },
  readMore: {
    fontSize: 13,
    color: darkTheme.colors.brand.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  tagsContainer: {
    marginTop: darkTheme.spacing.sm,
  },
  tagsLabel: {
    fontSize: 12,
    color: darkTheme.colors.text.tertiary,
    fontWeight: '600',
    marginBottom: darkTheme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: darkTheme.spacing.xs,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: darkTheme.borderRadius.full,
  },
  tagText: {
    fontSize: 12,
    color: darkTheme.colors.text.primary,
    fontWeight: '500',
  },
  moreTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: darkTheme.borderRadius.full,
    backgroundColor: darkTheme.colors.background.elevated,
    borderWidth: 1,
    borderColor: darkTheme.colors.border.medium,
  },
  moreTagText: {
    fontSize: 12,
    color: darkTheme.colors.text.secondary,
    fontWeight: '600',
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: darkTheme.colors.background.elevated,
    ...darkTheme.shadows.md,
  },
  passButton: {
    borderWidth: 2,
    borderColor: '#FF1744',
  },
  superLikeButton: {
    width: 48,
    height: 48,
  },
  superLikeGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  likeGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButton: {
    width: 48,
    height: 48,
  },
});
