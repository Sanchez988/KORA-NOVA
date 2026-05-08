import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import multer from 'multer';
import { uploadToCloudinary } from '../services/upload.service';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';

// Configurar multer para almacenar en memoria
const storage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Aceptar imágenes, audio y documentos comunes para chat
  const mime = (file.mimetype || '').toLowerCase();
  if (
    mime.startsWith('image/') ||
    mime.startsWith('audio/') ||
    mime === 'application/pdf' ||
    mime === 'text/plain' ||
    mime.includes('officedocument') ||
    mime === 'application/msword' ||
    mime === 'application/vnd.ms-excel' ||
    mime === 'application/vnd.ms-powerpoint'
  ) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.uploads.maxFileSize,
  },
});

// Subir una sola imagen
export const uploadSingleImage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('No se proporcionó ninguna imagen', 400);
    }

    const imageUrl = await uploadToCloudinary(req.file, {
      folder: 'kora/uploads',
    });

    res.json({
      message: 'Imagen subida exitosamente',
      imageUrl,
    });
  } catch (error) {
    next(error);
  }
};

// Subir múltiples imágenes
export const uploadMultipleImages = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      throw new AppError('No se proporcionaron imágenes', 400);
    }

    const imageUrls: string[] = [];

    for (const file of files) {
      const imageUrl = await uploadToCloudinary(file, {
        folder: 'kora/uploads',
      });
      imageUrls.push(imageUrl);
    }

    res.json({
      message: `${imageUrls.length} imágenes subidas exitosamente`,
      imageUrls,
    });
  } catch (error) {
    next(error);
  }
};
