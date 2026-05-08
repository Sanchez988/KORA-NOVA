import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows, typography } from '../theme/colors';
import { displayPhotosForImage } from '../utils/profilePhotos';

interface MatchCardProps {
  match: any;
  onPress: () => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, onPress }) => {
  const otherUser = match.user1?.profile || match.user2?.profile;
  const photo =
    displayPhotosForImage(otherUser?.photos ?? [])[0] || 'https://via.placeholder.com/150';
  const lastMessage = match.messages?.[0];

  const formatTime = (date: string) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Ahora';
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInHours < 48) return 'Ayer';
    return `${Math.floor(diffInHours / 24)}d`;
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <LinearGradient
        colors={['rgba(255, 107, 157, 0.1)', 'rgba(107, 102, 255, 0.1)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: photo }} style={styles.image} />
          {match.user1?.verified || match.user2?.verified ? (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            </View>
          ) : null}
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.name} numberOfLines={1}>
              {otherUser?.name || 'Usuario'}
            </Text>
            {lastMessage && (
              <Text style={styles.time}>{formatTime(lastMessage.sentAt)}</Text>
            )}
          </View>

          {lastMessage ? (
            <Text style={styles.message} numberOfLines={2}>
              {lastMessage.content}
            </Text>
          ) : (
            <Text style={styles.newMatch}>¡Nuevo match! 💕 Di hola</Text>
          )}
        </View>

        {!lastMessage?.isRead && (
          <View style={styles.unreadIndicator} />
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
    padding: 2,
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  name: {
    ...typography.h4,
    flex: 1,
    marginRight: spacing.sm,
  },
  time: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  message: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  newMatch: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  unreadIndicator: {
    width: 12,
    height: 12,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    marginLeft: spacing.sm,
  },
});
