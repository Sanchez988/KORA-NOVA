import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: false,
  auth: {
    user: config.email.user,
    pass: config.email.password,
  },
  tls: {
    rejectUnauthorized: config.env === 'production', // Ignorar certificados auto-firmados en desarrollo
  },
});

export const sendEmail = async ({ to, subject, html }: EmailOptions): Promise<void> => {
  try {
    // Si no hay configuración de email, solo logear
    if (!config.email.user || !config.email.password) {
      logger.warn(`Email no configurado. Email que se enviaría a ${to}: ${subject}`);
      return;
    }

    await transporter.sendMail({
      from: config.email.from,
      to,
      subject,
      html,
    });

    logger.info(`✅ Email enviado a: ${to}`);
  } catch (error) {
    logger.error(`❌ Error enviando email: ${error}`);
    // No lanzar error para que el registro continúe aunque falle el email
    logger.warn(`⚠️ El registro continuará sin enviar email de verificación`);
  }
};
