import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme } from '../theme/darkTheme';

interface Like {
  id: string;
  user: {
    id: string;
    name: string;
    age: number;
    photos: string[];
    program?: string;
    distance?: number;
    isOnline?: boolean;
  };
  likedAt: string;
}

export default function LikesScreen({ navigation }: any) {
  const [likes, setLikes] = useState<Like[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLikes();
  }, []);

  const loadLikes = async () => {
    try {
      // TODO: Cargar likes del backend
      // const response = await api.get('/match/likes');
      // setLikes(response.data);
      
      // Datos de ejemplo
      setLikes([
        {
          id: '1',
          user: {
            id: '1',
            name: 'María',
            age: 21,
            photos: ['https://via.placeholder.com/400'],
            program: 'Ingeniería de Sistemas',
            distance: 2.5,
            isOnline: true,
          },
          likedAt: '2024-04-25T10:30:00Z',
        },
        {
          id: '2',
          user: {
            id: '2',
            name: 'Carlos',
            age: 23,
            photos: ['https://via.placeholder.com/400'],
            program: 'Diseño Gráfico',
            distance: 1.2,
            isOnline: false,
          },
          likedAt: '2024-04-24T15:20:00Z',
        },
      ]);
    } catch (error) {
      console.error('Error loading likes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadLikes();
  };

  const handleLikeBack = (like: Like) => {
    // TODO: Dar like de vuelta
    navigation.navigate('Match', {
      matchedUser: like.user,
      currentUser: { name: 'Tú', photos: [] },
    });
  };

  const handleViewProfile = (like: Like) => {
    navigation.navigate('UserProfile', { userId: like.user.id });
  };

  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) return 'Hace un momento';
    if (diffInHours < 24) return `Hace ${diffInHours}h`;
    if (diffInDays === 1) return 'Ayer';
    return `Hace ${diffInDays} días`;
  };

  const renderLikeCard = ({ item }: { item: Like }) => {
    const userPhoto =
      typeof item.user.photos === 'string'
        ? JSON.parse(item.user.photos)[0]
        : item.user.photos[0];

    return (
      <TouchableOpacity
        style={styles.likeCard}
        onPress={() => handleViewProfile(item)}
        activeOpacity={0.9}
      >
        <View style={styles.cardContent}>
          {/* Imagen */}
          <View style={styles.imageContainer}>
            <Image source={{ uri: userPhoto }} style={styles.image} />
            
            {/* Badge online */}
            {item.user.isOnline && (
              <View style={styles.onlineBadge}>
                <View style={styles.onlineDot} />
              </View>
            )}

            {/* Gradiente overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(10, 10, 15, 0.8)']}
              style={styles.imageGradient}
            />
          </View>

          {/* Información */}
          <View style={styles.infoContainer}>
            <View style={styles.headerRow}>
              <View style={styles.nameContainer}>
                <Text style={styles.name}>
                  {item.user.name}, {item.user.age}
                </Text>
                <Ionicons
                  name="heart"
                  size={16}
                  color={darkTheme.colors.brand.primary}
                />
              </View>
              <Text style={styles.timeAgo}>{getTimeAgo(item.likedAt)}</Text>
            </View>

            {item.user.program && (
              <View style={styles.detailRow}>
                <Ionicons
                  name="school"
                  size={14}
                  color={darkTheme.colors.text.tertiary}
                />
                <Text style={styles.detailText}>{item.user.program}</Text>
              </View>
            )}

            {item.user.distance !== undefined && (
              <View style={styles.detailRow}>
                <Ionicons
                  name="location"
                  size={14}
                  color={darkTheme.colors.brand.accent}
                />
                <Text style={styles.distanceText}>A {item.user.distance} km</Text>
              </View>
            )}

            {/* Botones de acción */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.likeButton}
                onPress={() => handleLikeBack(item)}
              >
                <LinearGradient
                  colors={darkTheme.colors.gradient.primary}
                  style={styles.likeButtonGradient}
                >
                  <Ionicons name="heart" size={20} color="#FFF" />
                  <Text style={styles.likeButtonText}>Me gusta</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => handleViewProfile(item)}
              >
                <Text style={styles.viewButtonText}>Ver perfil</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <LinearGradient
          colors={darkTheme.colors.gradient.card}
          style={styles.emptyIconGradient}
        >
          <Ionicons
            name="heart-outline"
            size={80}
            color={darkTheme.colors.text.tertiary}
          />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>Sin likes aún</Text>
      <Text style={styles.emptyText}>
        Cuando alguien te dé like, aparecerá aquí.{'\n'}
        ¡Sigue descubriendo personas increíbles!
      </Text>
      <TouchableOpacity
        style={styles.discoverButton}
        onPress={() => navigation.navigate('Discovery')}
      >
        <LinearGradient
          colors={darkTheme.colors.gradient.primary}
          style={styles.discoverButtonGradient}
        >
          <Ionicons name="search" size={20} color="#FFF" />
          <Text style={styles.discoverButtonText}>Explorar</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <LinearGradient
        colors={darkTheme.colors.gradient.dark}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={darkTheme.colors.brand.primary}
          />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={darkTheme.colors.gradient.dark}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="chevron-back"
            size={28}
            color={darkTheme.colors.text.primary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Likes Recibidos</Text>
        <View style={styles.headerBadge}>
          <LinearGradient
            colors={darkTheme.colors.gradient.primary}
            style={styles.badgeGradient}
          >
            <Text style={styles.badgeText}>{likes.length}</Text>
          </LinearGradient>
        </View>
      </View>

      {/* Lista de likes */}
      <FlatList
        data={likes}
        renderItem={renderLikeCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          likes.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={darkTheme.colors.brand.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: darkTheme.spacing.lg,
    paddingTop: darkTheme.spacing.xl,
    paddingBottom: darkTheme.spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...darkTheme.typography.h3,
    color: darkTheme.colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  headerBadge: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text.primary,
    fontWeight: '700',
  },
  listContent: {
    padding: darkTheme.spacing.lg,
    gap: darkTheme.spacing.md,
  },
  listContentEmpty: {
    flex: 1,
  },
  likeCard: {
    borderRadius: darkTheme.borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: darkTheme.colors.background.card,
    ...darkTheme.shadows.md,
  },
  cardContent: {
    flexDirection: 'row',
  },
  imageContainer: {
    width: 120,
    height: 160,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  onlineBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: darkTheme.colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00E676',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  infoContainer: {
    flex: 1,
    padding: darkTheme.spacing.md,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: darkTheme.spacing.xs,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: darkTheme.spacing.xs,
    flex: 1,
  },
  name: {
    ...darkTheme.typography.h4,
    color: darkTheme.colors.text.primary,
  },
  timeAgo: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.text.tertiary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  detailText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.text.secondary,
  },
  distanceText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.brand.accent,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: darkTheme.spacing.sm,
    marginTop: darkTheme.spacing.sm,
  },
  likeButton: {
    flex: 1,
    borderRadius: darkTheme.borderRadius.full,
    overflow: 'hidden',
  },
  likeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: darkTheme.spacing.sm,
    gap: 4,
  },
  likeButtonText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  viewButton: {
    paddingVertical: darkTheme.spacing.sm,
    paddingHorizontal: darkTheme.spacing.md,
    borderRadius: darkTheme.borderRadius.full,
    borderWidth: 1,
    borderColor: darkTheme.colors.border.medium,
    justifyContent: 'center',
  },
  viewButtonText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text.secondary,
    fontWeight: '600',
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: darkTheme.spacing.xl,
  },
  emptyIconContainer: {
    marginBottom: darkTheme.spacing.lg,
  },
  emptyIconGradient: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    ...darkTheme.typography.h2,
    color: darkTheme.colors.text.primary,
    marginBottom: darkTheme.spacing.sm,
  },
  emptyText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: darkTheme.spacing.xl,
  },
  discoverButton: {
    borderRadius: darkTheme.borderRadius.full,
    overflow: 'hidden',
    ...darkTheme.shadows.lg,
  },
  discoverButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: darkTheme.spacing.md,
    paddingHorizontal: darkTheme.spacing.xl,
    gap: darkTheme.spacing.sm,
  },
  discoverButtonText: {
    ...darkTheme.typography.h4,
    color: darkTheme.colors.text.primary,
    fontWeight: '700',
  },
});
