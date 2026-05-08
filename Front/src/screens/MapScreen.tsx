import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme } from '../theme/darkTheme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface UserLocation {
  id: string;
  name: string;
  age: number;
  photo: string;
  distance: number;
  latitude: number;
  longitude: number;
  isOnline?: boolean;
  program?: string;
}

export default function MapScreen({ navigation }: any) {
  const [userLocation, setUserLocation] = useState({
    latitude: 6.2476, // Medellín, Colombia
    longitude: -75.5658,
  });
  const [nearbyUsers, setNearbyUsers] = useState<UserLocation[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserLocation | null>(null);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNearbyUsers();
  }, []);

  const loadNearbyUsers = async () => {
    try {
      // TODO: Cargar usuarios cercanos del backend
      // const response = await api.get('/location/nearby');
      
      // Datos de ejemplo
      setNearbyUsers([
        {
          id: '1',
          name: 'María',
          age: 21,
          photo: 'https://via.placeholder.com/150',
          distance: 0.5,
          latitude: 6.2480,
          longitude: -75.5655,
          isOnline: true,
          program: 'Ingeniería de Sistemas',
        },
        {
          id: '2',
          name: 'Carlos',
          age: 23,
          photo: 'https://via.placeholder.com/150',
          distance: 1.2,
          latitude: 6.2470,
          longitude: -75.5665,
          isOnline: false,
          program: 'Diseño Gráfico',
        },
        {
          id: '3',
          name: 'Ana',
          age: 22,
          photo: 'https://via.placeholder.com/150',
          distance: 2.0,
          latitude: 6.2490,
          longitude: -75.5650,
          isOnline: true,
          program: 'Administración',
        },
      ]);
    } catch (error) {
      console.error('Error loading nearby users:', error);
      Alert.alert('Error', 'No se pudieron cargar usuarios cercanos');
    } finally {
      setLoading(false);
    }
  };

  const handleUserPress = (user: UserLocation) => {
    setSelectedUser(user);
  };

  const handleViewProfile = () => {
    if (selectedUser) {
      navigation.navigate('UserProfile', { userId: selectedUser.id });
    }
  };

  const handleSendLike = () => {
    if (selectedUser) {
      Alert.alert('Like Enviado', `Le diste like a ${selectedUser.name}`);
      setSelectedUser(null);
    }
  };

  const renderMapPlaceholder = () => {
    // En producción, aquí iría react-native-maps
    return (
      <View style={styles.mapPlaceholder}>
        <LinearGradient
          colors={darkTheme.colors.gradient.dark}
          style={styles.mapGradient}
        >
          {/* Grid simulado de mapa */}
          <View style={styles.mapGrid}>
            {Array.from({ length: 10 }).map((_, i) => (
              <View key={`h-${i}`} style={styles.gridLineH} />
            ))}
            {Array.from({ length: 10 }).map((_, i) => (
              <View key={`v-${i}`} style={styles.gridLineV} />
            ))}
          </View>

          {/* Marcadores de usuarios */}
          {nearbyUsers.map((user, index) => {
            const offsetX = (index - 1) * 80 + SCREEN_WIDTH / 2 - 40;
            const offsetY = (index % 2 === 0 ? 100 : 250) + SCREEN_HEIGHT / 4;

            return (
              <TouchableOpacity
                key={user.id}
                style={[
                  styles.userMarker,
                  {
                    left: offsetX,
                    top: offsetY,
                  },
                  selectedUser?.id === user.id && styles.userMarkerSelected,
                ]}
                onPress={() => handleUserPress(user)}
                activeOpacity={0.8}
              >
                <View style={styles.markerContainer}>
                  <Image
                    source={{ uri: user.photo }}
                    style={styles.markerPhoto}
                  />
                  {user.isOnline && (
                    <View style={styles.markerOnlineDot} />
                  )}
                  <LinearGradient
                    colors={
                      selectedUser?.id === user.id
                        ? darkTheme.colors.gradient.primary
                        : darkTheme.colors.gradient.card
                    }
                    style={styles.markerBorder}
                  />
                </View>
                <View style={styles.markerLabel}>
                  <Text style={styles.markerName}>{user.name}</Text>
                  <Text style={styles.markerDistance}>{user.distance}km</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Mi ubicación */}
          <View style={styles.myLocationMarker}>
            <LinearGradient
              colors={darkTheme.colors.gradient.secondary}
              style={styles.myLocationDot}
            >
              <Ionicons name="person" size={20} color="#FFF" />
            </LinearGradient>
            <View style={styles.myLocationPulse} />
          </View>
        </LinearGradient>

        {/* Overlay de "mapa no disponible" */}
        <View style={styles.mapOverlay}>
          <Ionicons
            name="map"
            size={40}
            color={darkTheme.colors.text.tertiary}
          />
          <Text style={styles.mapOverlayText}>
            Vista previa del mapa
          </Text>
          <Text style={styles.mapOverlaySubtext}>
            Requiere Google Maps API
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Mapa */}
      {renderMapPlaceholder()}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <LinearGradient
            colors={darkTheme.colors.gradient.card}
            style={styles.headerButtonGradient}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={darkTheme.colors.text.primary}
            />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Usuarios Cercanos</Text>
          <Text style={styles.headerSubtitle}>
            {nearbyUsers.length} personas en el área
          </Text>
        </View>

        <TouchableOpacity
          style={styles.mapTypeButton}
          onPress={() =>
            setMapType(mapType === 'standard' ? 'satellite' : 'standard')
          }
        >
          <LinearGradient
            colors={darkTheme.colors.gradient.card}
            style={styles.headerButtonGradient}
          >
            <Ionicons
              name="layers"
              size={24}
              color={darkTheme.colors.text.primary}
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Botón de centrar en mi ubicación */}
      <TouchableOpacity
        style={styles.centerButton}
        onPress={() => Alert.alert('Centrar', 'Centrando en tu ubicación')}
      >
        <LinearGradient
          colors={darkTheme.colors.gradient.secondary}
          style={styles.centerButtonGradient}
        >
          <Ionicons name="locate" size={24} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Lista de usuarios en la parte inferior */}
      <View style={styles.bottomSheet}>
        <View style={styles.bottomSheetHandle} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.usersList}
        >
          {nearbyUsers.map((user) => (
            <TouchableOpacity
              key={user.id}
              style={[
                styles.userCard,
                selectedUser?.id === user.id && styles.userCardSelected,
              ]}
              onPress={() => handleUserPress(user)}
              activeOpacity={0.9}
            >
              <Image source={{ uri: user.photo }} style={styles.userCardPhoto} />
              
              {/* Online indicator */}
              {user.isOnline && (
                <View style={styles.userCardOnline}>
                  <View style={styles.userCardOnlineDot} />
                </View>
              )}

              <LinearGradient
                colors={['transparent', 'rgba(10, 10, 15, 0.9)']}
                style={styles.userCardGradient}
              >
                <Text style={styles.userCardName}>
                  {user.name}, {user.age}
                </Text>
                <View style={styles.userCardInfo}>
                  <Ionicons
                    name="location"
                    size={12}
                    color={darkTheme.colors.brand.accent}
                  />
                  <Text style={styles.userCardDistance}>{user.distance} km</Text>
                </View>
              </LinearGradient>

              {/* Border para usuario seleccionado */}
              {selectedUser?.id === user.id && (
                <LinearGradient
                  colors={darkTheme.colors.gradient.primary}
                  style={styles.userCardBorder}
                />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Modal de usuario seleccionado */}
      {selectedUser && (
        <View style={styles.userModal}>
          <LinearGradient
            colors={darkTheme.colors.gradient.card}
            style={styles.modalGradient}
          >
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setSelectedUser(null)}
            >
              <Ionicons
                name="close"
                size={24}
                color={darkTheme.colors.text.secondary}
              />
            </TouchableOpacity>

            <Image
              source={{ uri: selectedUser.photo }}
              style={styles.modalPhoto}
            />

            <View style={styles.modalInfo}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalName}>
                  {selectedUser.name}, {selectedUser.age}
                </Text>
                {selectedUser.isOnline && (
                  <View style={styles.modalOnline}>
                    <View style={styles.modalOnlineDot} />
                    <Text style={styles.modalOnlineText}>En línea</Text>
                  </View>
                )}
              </View>

              {selectedUser.program && (
                <View style={styles.modalDetailRow}>
                  <Ionicons
                    name="school"
                    size={16}
                    color={darkTheme.colors.text.secondary}
                  />
                  <Text style={styles.modalDetail}>{selectedUser.program}</Text>
                </View>
              )}

              <View style={styles.modalDetailRow}>
                <Ionicons
                  name="location"
                  size={16}
                  color={darkTheme.colors.brand.accent}
                />
                <Text style={styles.modalDistance}>
                  A {selectedUser.distance} km de distancia
                </Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={handleViewProfile}
                >
                  <LinearGradient
                    colors={darkTheme.colors.gradient.card}
                    style={styles.modalButtonGradient}
                  >
                    <Ionicons
                      name="person"
                      size={20}
                      color={darkTheme.colors.text.primary}
                    />
                    <Text style={styles.modalButtonText}>Ver Perfil</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={handleSendLike}
                >
                  <LinearGradient
                    colors={darkTheme.colors.gradient.primary}
                    style={styles.modalButtonGradient}
                  >
                    <Ionicons name="heart" size={20} color="#FFF" />
                    <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                      Me Gusta
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background.primary,
  },
  mapPlaceholder: {
    ...StyleSheet.absoluteFillObject,
  },
  mapGradient: {
    flex: 1,
  },
  mapGrid: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: darkTheme.colors.border.light,
    opacity: 0.2,
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: darkTheme.colors.border.light,
    opacity: 0.2,
  },
  mapOverlay: {
    position: 'absolute',
    top: SCREEN_HEIGHT / 2 - 80,
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 15, 0.8)',
    padding: darkTheme.spacing.lg,
    borderRadius: darkTheme.borderRadius.lg,
  },
  mapOverlayText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text.secondary,
    marginTop: darkTheme.spacing.sm,
  },
  mapOverlaySubtext: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.text.tertiary,
  },
  userMarker: {
    position: 'absolute',
    alignItems: 'center',
  },
  userMarkerSelected: {
    zIndex: 100,
  },
  markerContainer: {
    position: 'relative',
    width: 56,
    height: 56,
  },
  markerPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    position: 'absolute',
    top: 4,
    left: 4,
  },
  markerOnlineDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#00E676',
    borderWidth: 2,
    borderColor: darkTheme.colors.background.primary,
    zIndex: 10,
  },
  markerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
  },
  markerLabel: {
    backgroundColor: darkTheme.colors.background.card,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: darkTheme.borderRadius.sm,
    marginTop: 4,
    alignItems: 'center',
    ...darkTheme.shadows.sm,
  },
  markerName: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.text.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  markerDistance: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.brand.accent,
    fontSize: 10,
  },
  myLocationMarker: {
    position: 'absolute',
    top: SCREEN_HEIGHT / 2 - 30,
    left: SCREEN_WIDTH / 2 - 30,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myLocationDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    zIndex: 10,
    ...darkTheme.shadows.lg,
  },
  myLocationPulse: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: darkTheme.colors.brand.accent,
    opacity: 0.3,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: darkTheme.spacing.lg,
    paddingTop: darkTheme.spacing.xl,
    paddingBottom: darkTheme.spacing.md,
    gap: darkTheme.spacing.md,
  },
  backButton: {
    borderRadius: darkTheme.borderRadius.full,
    overflow: 'hidden',
    ...darkTheme.shadows.md,
  },
  mapTypeButton: {
    borderRadius: darkTheme.borderRadius.full,
    overflow: 'hidden',
    ...darkTheme.shadows.md,
  },
  headerButtonGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    ...darkTheme.typography.h4,
    color: darkTheme.colors.text.primary,
  },
  headerSubtitle: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.text.secondary,
  },
  centerButton: {
    position: 'absolute',
    right: darkTheme.spacing.lg,
    bottom: 180,
    borderRadius: darkTheme.borderRadius.full,
    overflow: 'hidden',
    ...darkTheme.shadows.lg,
  },
  centerButtonGradient: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: darkTheme.colors.background.card,
    borderTopLeftRadius: darkTheme.borderRadius.xxl,
    borderTopRightRadius: darkTheme.borderRadius.xxl,
    paddingTop: darkTheme.spacing.md,
    paddingBottom: darkTheme.spacing.xl,
    ...darkTheme.shadows.xl,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: darkTheme.colors.border.medium,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: darkTheme.spacing.md,
  },
  usersList: {
    paddingHorizontal: darkTheme.spacing.lg,
    gap: darkTheme.spacing.md,
  },
  userCard: {
    width: 120,
    height: 160,
    borderRadius: darkTheme.borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  userCardSelected: {
    transform: [{ scale: 1.05 }],
  },
  userCardPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  userCardOnline: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  userCardOnlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00E676',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  userCardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: darkTheme.spacing.sm,
  },
  userCardName: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  userCardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  userCardDistance: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.brand.accent,
    fontSize: 11,
  },
  userCardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: darkTheme.borderRadius.lg,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  userModal: {
    position: 'absolute',
    bottom: 220,
    left: darkTheme.spacing.lg,
    right: darkTheme.spacing.lg,
    borderRadius: darkTheme.borderRadius.xl,
    overflow: 'hidden',
    ...darkTheme.shadows.xl,
  },
  modalGradient: {
    padding: darkTheme.spacing.lg,
  },
  modalClose: {
    position: 'absolute',
    top: darkTheme.spacing.md,
    right: darkTheme.spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: darkTheme.colors.background.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: 'center',
    marginBottom: darkTheme.spacing.md,
    borderWidth: 3,
    borderColor: darkTheme.colors.border.light,
  },
  modalInfo: {
    gap: darkTheme.spacing.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalName: {
    ...darkTheme.typography.h3,
    color: darkTheme.colors.text.primary,
  },
  modalOnline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalOnlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00E676',
  },
  modalOnlineText: {
    ...darkTheme.typography.caption,
    color: '#00E676',
    fontWeight: '600',
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: darkTheme.spacing.xs,
  },
  modalDetail: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text.secondary,
  },
  modalDistance: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.brand.accent,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: darkTheme.spacing.md,
    marginTop: darkTheme.spacing.md,
  },
  modalButton: {
    flex: 1,
    borderRadius: darkTheme.borderRadius.full,
    overflow: 'hidden',
  },
  modalButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: darkTheme.spacing.sm,
    gap: darkTheme.spacing.xs,
  },
  modalButtonText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text.secondary,
    fontWeight: '700',
  },
  modalButtonTextPrimary: {
    color: darkTheme.colors.text.primary,
  },
});
