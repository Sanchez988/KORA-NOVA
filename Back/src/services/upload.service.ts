import { v2 as cloudinary } from 'cloudinary';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config';
import { logger } from '../utils/logger';

cloudinary.config({
  cloudinary_url: config.cloudinary.url || undefined,
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

interface UploadOptions {
  folder?: string;
  transformation?: any;
  resource_type?: 'image' | 'video' | 'raw' | 'auto';
}

const LOCAL_UPLOADS_DIR = config.uploads.uploadDir;
const LOCAL_UPLOADS_PUBLIC_PATH = '/uploads';

function normalizeApiBaseUrl(): string {
  return (config.apiUrl || 'http://localhost:5000').replace(/\/+$/, '');
}

function localUploadPublicUrl(filename: string): string {
  return `${normalizeApiBaseUrl()}${LOCAL_UPLOADS_PUBLIC_PATH}/${filename}`;
}

function inferImageExtension(file: Express.Multer.File): string {
  const fromOriginal = path.extname(file.originalname || '').replace('.', '').toLowerCase();
  if (fromOriginal && /^[a-z0-9]{2,8}$/.test(fromOriginal)) return fromOriginal;
  const mime = (file.mimetype || '').toLowerCase();
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return 'jpg';
}

async function saveBufferToLocalUploads(file: Express.Multer.File): Promise<string> {
  const buf = (file as Express.Multer.File & { buffer?: Buffer }).buffer;
  if (!buf || !Buffer.isBuffer(buf) || buf.length === 0) {
    throw new Error('No hay datos en memoria para guardar localmente');
  }
  await fs.mkdir(LOCAL_UPLOADS_DIR, { recursive: true });
  const ext = inferImageExtension(file);
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
  const outPath = path.join(LOCAL_UPLOADS_DIR, filename);
  await fs.writeFile(outPath, buf);
  const publicUrl = localUploadPublicUrl(filename);
  logger.warn(`Fallback local upload activo: ${publicUrl}`);
  return publicUrl;
}

/**
 * Subir archivo a Cloudinary desde path
 */
export const uploadToCloudinary = async (file: Express.Multer.File, options: UploadOptions = {}): Promise<string> => {
  try {
    const hasCloudinaryUrl = Boolean(config.cloudinary.url?.trim());
    const hasDiscreteCreds =
      Boolean(config.cloudinary.cloudName?.trim()) &&
      Boolean(config.cloudinary.apiKey?.trim()) &&
      Boolean(config.cloudinary.apiSecret?.trim());

    if (!hasCloudinaryUrl && !hasDiscreteCreds) {
      throw new Error(
        'Cloudinary no está configurado. Define CLOUDINARY_URL o CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET en Back/.env'
      );
    }

    /** Multer en memoria: subir desde buffer (evita `/tmp` inexistente en Windows). */
    const buf = (file as Express.Multer.File & { buffer?: Buffer }).buffer;
    if (buf && Buffer.isBuffer(buf) && buf.length > 0) {
      return await uploadBufferToCloudinary(buf, options);
    }

    if (!file.path) {
      throw new Error('No hay datos de imagen para subir');
    }

    const result = await cloudinary.uploader.upload(file.path, {
      folder: options.folder || 'kora',
      resource_type: options.resource_type || 'auto',
      transformation: options.transformation,
    });

    logger.info(`Archivo subido a Cloudinary: ${result.secure_url}`);
    return result.secure_url;
  } catch (error) {
    logger.error(`Error al subir a Cloudinary: ${error}`);
    /**
     * En producción (p. ej. Render) el disco local es efímero: guardar en `/uploads` hace que
     * las URLs fallen al reiniciar el dyno. Solo Cloudinary u otro almacenamiento persistente.
     */
    if (config.env === 'production') {
      throw error instanceof Error ? error : new Error(String(error));
    }
    /**
     * Desarrollo: fallback local si Cloudinary falla (credenciales, cuota, red).
     */
    try {
      return await saveBufferToLocalUploads(file);
    } catch (fallbackError) {
      logger.error(`Error en fallback local de subida: ${fallbackError}`);
      throw error;
    }
  }
};

/**
 * Subir desde buffer (memoria)
 */
export const uploadBufferToCloudinary = async (
  buffer: Buffer,
  options: UploadOptions = {}
): Promise<string> => {
  try {
    const hasCloudinaryUrl = Boolean(config.cloudinary.url?.trim());
    const hasDiscreteCreds =
      Boolean(config.cloudinary.cloudName?.trim()) &&
      Boolean(config.cloudinary.apiKey?.trim()) &&
      Boolean(config.cloudinary.apiSecret?.trim());

    if (!hasCloudinaryUrl && !hasDiscreteCreds) {
      throw new Error(
        'Cloudinary no está configurado. Define CLOUDINARY_URL o CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET en Back/.env'
      );
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      const settle = {
        resolve: (v: string) => {
          if (settled) return;
          settled = true;
          resolve(v);
        },
        reject: (e: unknown) => {
          if (settled) return;
          settled = true;
          reject(e);
        },
      };

      let uploadStream: NodeJS.ReadWriteStream;
      try {
        uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: options.folder || 'kora',
            transformation: options.transformation,
            resource_type: options.resource_type || 'auto',
          },
          (error, result) => {
            if (error) {
              logger.error(`Error al subir a Cloudinary: ${error.message || error}`);
              return settle.reject(error);
            }
            if (result?.secure_url) {
              logger.info(`Archivo subido a Cloudinary: ${result.secure_url}`);
              return settle.resolve(result.secure_url);
            }
            settle.reject(new Error('No se recibió respuesta de Cloudinary'));
          }
        );
      } catch (syncErr) {
        return settle.reject(syncErr);
      }

      uploadStream.once('error', (streamErr: Error) => {
        logger.error(`Stream Cloudinary: ${streamErr.message || streamErr}`);
        settle.reject(streamErr);
      });

      uploadStream.end(buffer as Buffer);
    });
  } catch (error) {
    logger.error(`Error en uploadBufferToCloudinary: ${error}`);
    throw error;
  }
};

/**
 * Eliminar archivo de Cloudinary
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
    logger.info(`Archivo eliminado de Cloudinary: ${publicId}`);
  } catch (error) {
    logger.error(`Error al eliminar de Cloudinary: ${error}`);
    throw error;
  }
};

/**
 * Extraer public_id de una URL de Cloudinary
 */
export const extractPublicId = (url: string): string | null => {
  const match = url.match(/\/v\d+\/(.+)\.\w+$/);
  return match ? match[1] : null;
};
