import admin from 'firebase-admin';
import { config } from './index';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

let firebaseInitialized = false;

/**
 * Inicializa Firebase Admin SDK
 * Soporta dos métodos de configuración:
 * 1. Archivo JSON de credenciales (recomendado para desarrollo)
 * 2. Variables de entorno individuales (recomendado para producción)
 */
export const initializeFirebase = () => {
  try {
    // Si ya está inicializado, no hacer nada
    if (firebaseInitialized) {
      return admin;
    }

    // Método 1: Usar archivo JSON de credenciales
    if (config.firebase.credentialsPath) {
      const credentialsPath = path.resolve(config.firebase.credentialsPath);
      
      if (fs.existsSync(credentialsPath)) {
        const serviceAccount = require(credentialsPath);
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });

        firebaseInitialized = true;
        logger.info('✅ Firebase Admin inicializado con archivo de credenciales');
        return admin;
      } else {
        logger.warn('⚠️ Archivo de credenciales de Firebase no encontrado en:', credentialsPath);
      }
    }

    // Método 2: Usar variables de entorno individuales
    if (config.firebase.projectId && config.firebase.privateKey && config.firebase.clientEmail) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.firebase.projectId,
          privateKey: config.firebase.privateKey.replace(/\\n/g, '\n'),
          clientEmail: config.firebase.clientEmail,
        }),
      });

      firebaseInitialized = true;
      logger.info('✅ Firebase Admin inicializado con variables de entorno');
      return admin;
    }

    // Si llegamos aquí, no hay credenciales configuradas
    logger.warn('⚠️ Firebase no configurado. La app funcionará sin Firebase Authentication.');
    logger.warn('   Para configurar Firebase, consulta: FIREBASE_INTEGRATION_GUIDE.md');
    
    return null;
  } catch (error) {
    logger.error('❌ Error al inicializar Firebase Admin:', error);
    logger.warn('   La app continuará sin Firebase Authentication');
    return null;
  }
};

/**
 * Obtiene la instancia de Firebase Auth
 * @returns Firebase Auth o null si no está configurado
 */
export const getFirebaseAuth = () => {
  if (!firebaseInitialized) {
    initializeFirebase();
  }
  
  return firebaseInitialized ? admin.auth() : null;
};

/**
 * Verifica si Firebase está configurado y funcionando
 */
export const isFirebaseConfigured = (): boolean => {
  return firebaseInitialized;
};

/**
 * Crea un usuario en Firebase Authentication
 */
export const createFirebaseUser = async (email: string, password: string) => {
  const auth = getFirebaseAuth();
  
  if (!auth) {
    throw new Error('Firebase no está configurado');
  }

  try {
    const userRecord = await auth.createUser({
      email,
      password,
      emailVerified: false,
    });

    logger.info(`Usuario creado en Firebase: ${userRecord.uid}`);
    return userRecord;
  } catch (error: any) {
    logger.error('Error al crear usuario en Firebase:', error);
    throw error;
  }
};

/**
 * Verifica un token de Firebase
 */
export const verifyFirebaseToken = async (token: string) => {
  const auth = getFirebaseAuth();
  
  if (!auth) {
    throw new Error('Firebase no está configurado');
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    logger.error('Error al verificar token de Firebase:', error);
    throw error;
  }
};

/**
 * Elimina un usuario de Firebase Authentication
 */
export const deleteFirebaseUser = async (uid: string) => {
  const auth = getFirebaseAuth();
  
  if (!auth) {
    return;
  }

  try {
    await auth.deleteUser(uid);
    logger.info(`Usuario eliminado de Firebase: ${uid}`);
  } catch (error) {
    logger.error('Error al eliminar usuario de Firebase:', error);
  }
};

/**
 * Genera un link de verificación de email
 */
export const generateEmailVerificationLink = async (email: string) => {
  const auth = getFirebaseAuth();
  
  if (!auth) {
    throw new Error('Firebase no está configurado');
  }

  try {
    const actionCodeSettings = {
      url: `${config.frontendUrl}/verify-email`,
      handleCodeInApp: true,
    };

    const link = await auth.generateEmailVerificationLink(email, actionCodeSettings);
    return link;
  } catch (error) {
    logger.error('Error al generar link de verificación:', error);
    throw error;
  }
};

export default admin;
