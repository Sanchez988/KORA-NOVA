import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import { ensureCameraAccess, ensureMediaLibraryAccess } from '../utils/permissions';

interface ImagePickerComponentProps {
  onImageSelected?: (uri: string) => void;
  maxImages?: number;
  aspectRatio?: [number, number];
  quality?: number;
}

const ImagePickerComponent: React.FC<ImagePickerComponentProps> = ({
  onImageSelected,
  maxImages = 1,
  aspectRatio = [4, 3],
  quality = 0.8,
}) => {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const pickImageFromLibrary = async () => {
    if (!(await ensureMediaLibraryAccess())) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: aspectRatio,
        quality,
        allowsMultipleSelection: maxImages > 1,
        selectionLimit: maxImages,
      });

      if (!result.canceled) {
        const uris = result.assets.map((asset) => asset.uri);
        setSelectedImages(uris);
        
        if (onImageSelected && uris.length > 0) {
          onImageSelected(uris[0]);
        }
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const takePhoto = async () => {
    if (!(await ensureCameraAccess())) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: aspectRatio,
        quality,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setSelectedImages([uri]);
        
        if (onImageSelected) {
          onImageSelected(uri);
        }
      }
    } catch (error) {
      console.error('Error al tomar foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const uploadImage = async (uri: string) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('image', {
        uri,
        name: filename,
        type,
      } as any);

      const response = await api.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('✅ Éxito', 'Imagen subida correctamente');
      return response.data.imageUrl;
    } catch (error: any) {
      console.error('Error al subir imagen:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'No se pudo subir la imagen'
      );
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Seleccionar imagen',
      'Elige una opción',
      [
        {
          text: '📷 Tomar foto',
          onPress: takePhoto,
        },
        {
          text: '🖼️ Elegir de galería',
          onPress: pickImageFromLibrary,
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  const removeImage = (uri: string) => {
    setSelectedImages(selectedImages.filter((img) => img !== uri));
  };

  return (
    <View style={styles.container}>
      {selectedImages.length > 0 && (
        <View style={styles.imagesContainer}>
          {selectedImages.map((uri, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image source={{ uri }} style={styles.image} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeImage(uri)}
              >
                <Ionicons name="close-circle" size={28} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {selectedImages.length < maxImages && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={showImageOptions}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator size="large" color="#FF6B6B" />
          ) : (
            <>
              <Ionicons name="camera" size={32} color="#FF6B6B" />
              <Text style={styles.addButtonText}>
                {selectedImages.length === 0 ? 'Agregar foto' : 'Agregar más'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {selectedImages.length > 0 && !isUploading && (
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => uploadImage(selectedImages[0])}
        >
          <Text style={styles.uploadButtonText}>Subir imagen</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 12,
    marginBottom: 12,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 14,
  },
  addButton: {
    borderWidth: 2,
    borderColor: '#FF6B6B',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
  },
  addButtonText: {
    marginTop: 8,
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  uploadButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ImagePickerComponent;
