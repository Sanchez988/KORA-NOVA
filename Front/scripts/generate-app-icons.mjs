/**
 * icon.png / adaptive-icon.png / favicon.png — mantén en sync Front/src/design/koraHeartsBrand.ts
 *
 * npm run icons
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_ICON = path.join(ROOT, 'assets', 'icon.png');
const OUT_ADAPTIVE = path.join(ROOT, 'assets', 'adaptive-icon.png');
const OUT_FAVICON = path.join(ROOT, 'assets', 'favicon.png');
const OUT_SPLASH = path.join(ROOT, 'assets', 'splash.png');

/* ── SYNC: koraHeartsBrand.ts ───────────────────────────────────────── */
const VW = 220;
const VH = 116;
const HEART = {
  path: `M4.318 6.318a4.5 4.5 0 016.364 0L12 7.736l1.318-1.418a4.5 4.5 0 116.364 6.364L12 20.954l-7.682-7.682a4.5 4.5 0 010-6.364z`,
  cx: 12.1,
  cy: 13.65,
};
const MARK = {
  left: { tx: 71, ty: 54, rotate: -15, scale: 4.12 },
  right: { tx: 152, ty: 51, rotate: 20, scale: 4.62 },
};
const STOPS = { violet: '#7646EC', magenta: '#E91EAE', peach: '#FFBEA8' };
const BG_DEEP = '#0B0E14';
const RX = Math.round((1024 * 19.5) / 100);
const SCALE_FIT = 3.93;
const TY_ALIGN = -58;

const mainStroke = 0.95;

function tf({ tx, ty, rotate, scale }) {
  return `translate(${tx},${ty}) rotate(${rotate}) scale(${scale}) translate(${-HEART.cx},${-HEART.cy})`;
}

function layeredHeartGroup(transform, gid) {
  const wExtra = [13, 7, 3, 0];
  const op = [0.12, 0.22, 0.38, 1];
  const paths = wExtra
    .map(
      (e, i) =>
        `<path d="${HEART.path}" fill="none" stroke="url(#${gid})" stroke-width="${
          mainStroke + e
        }" stroke-linecap="round" stroke-linejoin="round" opacity="${op[i]}"/>`
    )
    .join('\n');
  return `<g transform="${transform}">${paths}</g>`;
}

function buildSvg({ mode }) {
  const gid = 'kGrad';
  const inner = `
  <defs>
    <linearGradient id="${gid}" x1="0" y1="${VH * 0.5}" x2="${VW}" y2="${VH * 0.5}" gradientUnits="userSpaceOnUse">
      <stop offset="2%" stop-color="${STOPS.violet}"/>
      <stop offset="45%" stop-color="${STOPS.magenta}"/>
      <stop offset="100%" stop-color="${STOPS.peach}"/>
    </linearGradient>
  </defs>
  ${layeredHeartGroup(tf(MARK.left), gid)}
  ${layeredHeartGroup(tf(MARK.right), gid)}
  `;

  if (mode === 'app') {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="${RX}" ry="${RX}" fill="${BG_DEEP}"/>
  <g transform="translate(512, 502) scale(${SCALE_FIT}) translate(${-VW * 0.5}, ${TY_ALIGN})">${inner}</g>
</svg>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="transparent"/>
  <g transform="translate(512, 502) scale(${SCALE_FIT * 1.02}) translate(${-VW * 0.5}, ${TY_ALIGN})">${inner}</g>
</svg>`;
}

async function main() {
  fs.mkdirSync(path.dirname(OUT_ICON), { recursive: true });

  const appSvg = Buffer.from(buildSvg({ mode: 'app' }), 'utf8');
  await sharp(appSvg).resize(1024, 1024).png().toFile(OUT_ICON);
  console.log('Wrote', OUT_ICON);

  fs.copyFileSync(OUT_ICON, OUT_SPLASH);
  console.log('Wrote', OUT_SPLASH);

  const adSvg = Buffer.from(buildSvg({ mode: 'adaptive' }), 'utf8');
  await sharp(adSvg).resize(1024, 1024).png().toFile(OUT_ADAPTIVE);
  console.log('Wrote', OUT_ADAPTIVE);

  await sharp(OUT_ICON).resize(192, 192).png().toFile(OUT_FAVICON);
  console.log('Wrote', OUT_FAVICON);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
