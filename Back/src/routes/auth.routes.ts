import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { authRateLimiter } from '../middleware/rateLimiter';
import { validateUniversityEmail } from '../middleware/emailValidator';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Registro
router.post(
  '/register',
  authRateLimiter,
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
    body('dateOfBirth').isISO8601().withMessage('Fecha de nacimiento inválida'),
  ],
  validate([
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    body('dateOfBirth').isISO8601(),
  ]),
  validateUniversityEmail, // Validar dominio @pascualbravo.edu.co
  authController.register
);

// Login
router.post(
  '/login',
  authRateLimiter,
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('La contraseña es requerida'),
  ],
  validate([
    body('email').isEmail(),
    body('password').notEmpty(),
  ]),
  authController.login
);

// Verificar email
router.post('/verify-email', authController.verifyEmail);

// Reenviar email de verificación
router.post('/resend-verification', authController.resendVerification);

// Solicitar recuperación de contraseña
router.post('/request-password-reset', authController.requestPasswordReset);

// Resetear contraseña
router.post('/reset-password', authController.resetPassword);

// Google Sign-In
router.post('/google', authRateLimiter, authController.googleLogin);

router.post(
  '/google/reactivate-deleted',
  authRateLimiter,
  [body('idToken').isString().notEmpty().withMessage('Token requerido')],
  validate([body('idToken').notEmpty()]),
  authController.reactivateGoogleDeletedAccount
);

router.post(
  '/google/restart-fresh-deleted',
  authRateLimiter,
  [body('idToken').isString().notEmpty().withMessage('Token requerido')],
  validate([body('idToken').notEmpty()]),
  authController.restartFreshGoogleDeletedAccount
);

// Canje código OAuth (PKCE) en servidor — requiere GOOGLE_CLIENT_SECRET (cliente Web)
router.post(
  '/google/oauth-code',
  authRateLimiter,
  [
    body('code').isString().notEmpty().withMessage('code requerido'),
    body('redirectUri').isString().notEmpty().withMessage('redirectUri requerido'),
    body('codeVerifier').isString().notEmpty().withMessage('codeVerifier requerido'),
  ],
  validate([
    body('code').notEmpty(),
    body('redirectUri').notEmpty(),
    body('codeVerifier').notEmpty(),
  ]),
  authController.googleOAuthCodeExchange
);

// Aceptación de términos / política en servidor (por usuario)
router.post('/legal-consent', authenticate, authController.acceptLegalConsent);

// Obtener usuario actual (requiere autenticación)
router.get('/me', authenticate, authController.getMe);

// Refresh token
router.post('/refresh-token', authController.refreshToken);

// Eliminar cuenta
router.delete('/account', authenticate, authController.deleteAccount);

// Tras eliminar cuenta: borrado definitivo en periodo de gracia (mismo correo + contraseña)
router.post(
  '/account/restart-fresh',
  authRateLimiter,
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('La contraseña es requerida'),
  ],
  validate([
    body('email').isEmail(),
    body('password').notEmpty(),
  ]),
  authController.restartFreshDeletedAccount
);

// Reactivar cuenta eliminada
router.post(
  '/reactivate',
  authRateLimiter,
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('La contraseña es requerida'),
  ],
  validate([
    body('email').isEmail(),
    body('password').notEmpty(),
  ]),
  authController.reactivateAccount
);

export default router;
