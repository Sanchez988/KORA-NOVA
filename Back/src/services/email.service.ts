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

/** true si el mensaje se envió por SMTP; false si no hay credenciales o falló el envío. */
export const sendEmail = async ({ to, subject, html }: EmailOptions): Promise<boolean> => {
  try {
    if (!config.email.user || !config.email.password) {
      logger.warn(`Email no configurado. Email que se enviaría a ${to}: ${subject}`);
      return false;
    }

    await transporter.sendMail({
      from: config.email.from,
      to,
      subject,
      html,
    });

    logger.info(`✅ Email enviado a: ${to}`);
    return true;
  } catch (error) {
    logger.error(`❌ Error enviando email: ${error}`);
    logger.warn(`⚠️ No se pudo enviar el correo (el flujo en servidor continúa sin lanzar error al cliente).`);
    return false;
  }
};
