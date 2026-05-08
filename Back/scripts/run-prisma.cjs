'use strict';
/**
 * Ejecuta Prisma con variables de Back/.env forzadas (override),
 * para que no gane un DATABASE_URL obsoleto definido en el sistema (Windows).
 */
const path = require('path');
const { spawnSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true });
const args = process.argv.slice(2);
const result = spawnSync('npx', ['prisma', ...args], {
  stdio: 'inherit',
  shell: true,
  cwd: path.join(__dirname, '..'),
  env: process.env,
});
process.exit(result.status === 0 ? 0 : result.status ?? 1);
