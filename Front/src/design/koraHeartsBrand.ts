/**
 * Trayectoria de contorno tipo corazón (basada en formas de delineado clásicas).
 * Coordenadas en vista 24×24; centro aproximado (12.1, 13.65).
 *
 * SYNC: también actualiza números en `scripts/generate-app-icons.mjs` al cambiar MARCA/layout.
 */
export const KORA_HEART_OUTLINE_PATH_24 =
  'M4.318 6.318a4.5 4.5 0 016.364 0L12 7.736l1.318-1.418a4.5 4.5 0 116.364 6.364L12 20.954l-7.682-7.682a4.5 4.5 0 010-6.364z';

/** Punto neutro antes de aplicar escalado (centro informal del dibujo hero). */
export const KORA_HEART_PIVOT = { cx: 12.1, cy: 13.65 };

/** Marca dentro del viewBox del logo horizontal (solo corazones). */
export const KORA_MARK_LAYOUT = {
  viewW: 220,
  viewH: 116,
  left: { tx: 71, ty: 54, rotate: -15, scale: 4.12 },
  right: { tx: 152, ty: 51, rotate: 20, scale: 4.62 },
};

/**
 * Neon / gradient Kora Nova (referencia ICONO APP: violeta → magenta centro → melocotón derecha).
 */
export const KORA_HEART_GRADIENT_STOPS = {
  violet: '#7646EC',
  magenta: '#E91EAE',
  peach: '#FFBEA8',
};
