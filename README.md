# Kora Nova

Red social móvil para conocer gente, chatear con matches, publicar historias y organizar **planes** (quedadas) con fecha y lugar. El repositorio incluye el cliente **Expo / React Native**, la **API REST** en Node y el **DDL** de PostgreSQL, listo para entrega académica o despliegue local.

---

## Contenido del repositorio

| Ruta | Descripción |
|------|-------------|
| `Front/` | App Expo (React Native + TypeScript). Expo Go, emuladores o web. |
| `Back/` | API REST (Express + TypeScript + Prisma). Incluye **Swagger UI** (`/api/docs`) y `openapi.yaml`. |
| `BD/` | Script DDL PostgreSQL (`kora_database.sql`), alineado con `Back/prisma/schema.prisma`. |
| `docker-compose.yml` | PostgreSQL 16 opcional para desarrollo (puerto `5432`). |

---

## Stack técnico

| Capa | Tecnologías |
|------|-------------|
| **Móvil** | [Expo](https://expo.dev) ~54, React Native, TypeScript, React Navigation |
| **API** | Node.js, Express, TypeScript, Prisma ORM |
| **Datos** | PostgreSQL |
| **Tiempo real** | Socket.IO (mensajes / presencia según configuración) |
| **Archivos** | Multer local y/o Cloudinary (perfil, chat, adjuntos) |
| **Documentación API** | [Swagger UI](https://swagger.io/tools/swagger-ui/) en `/api/docs`; contrato OpenAPI en `Back/openapi.yaml` |

La API sigue convenciones REST: **GET** para consultas y **POST**, **PATCH**, **DELETE** (y rutas equivalentes) para escritura, con controladores y routers separados en `Back/src`.

---

## Funcionalidades principales

- Registro, inicio de sesión y verificación por correo; JWT y refresh tokens.
- Perfil editable (fotos, bio, intereses, privacidad, incógnito).
- Descubrimiento, likes y **matches**; chat con mensajes, imágenes y adjuntos.
- **Historias** (stories) con caducidad.
- **Planes**: crear y editar eventos con categoría, fecha/hora y cupos; unirse, salir; el creador puede **añadir participantes** entre sus matches.
- Ubicación, reportes de usuarios y subida de archivos.
- Tema claro/oscuro en la app.

---

## Requisitos previos

- [Node.js](https://nodejs.org/) LTS (recomendado 20+).
- [Docker](https://docs.docker.com/get-docker/) (opcional, solo si usas `docker-compose` para Postgres).
- Cuenta en [Expo](https://expo.dev) si pruebas en dispositivo físico con Expo Go.

---

## Puesta en marcha rápida

### 1. Base de datos PostgreSQL

**Opción A — Docker (recomendado en este repo)**

En la raíz del proyecto:

```powershell
docker compose up -d
```

En `Back/.env`, usa por ejemplo:

`DATABASE_URL="postgresql://kora:kora@localhost:5432/kora_db?schema=public"`

**Opción B — Postgres ya instalado o de otro proyecto**

Define `DATABASE_URL` apuntando a tu instancia. No ejecutes dos servidores PostgreSQL en el mismo puerto `5432`.

A continuación, desde `Back/`:

```powershell
cd Back
npm install
copy .env.example .env
# Edita .env: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET (mínimo ~32 caracteres)
npx prisma generate
npm run prisma:migrate:deploy
```

Para desarrollo con nuevos cambios de esquema: `npm run prisma:migrate`.

**DDL sin Prisma (entrega académica)**

Puedes crear la base y cargar `BD/kora_database.sql` con `psql`, o confiar en las migraciones Prisma (resultado equivalente al modelo).

---

### 2. Backend

```powershell
cd Back
npm install
npm run dev
```

Por defecto la API escucha en el puerto **5000** y el prefijo de rutas es **`/api`**. Comprueba salud:

`http://localhost:5000/health`

### Swagger (OpenAPI 3)

Con el backend arrancado:

- **Interfaz interactiva**: [http://localhost:5000/api/docs](http://localhost:5000/api/docs) (sustituye el host/puerto si usas otra configuración).
- **Especificación JSON**: `http://localhost:5000/api/openapi.json`
- **Especificación YAML** (editable): `Back/openapi.yaml`

Para probar rutas protegidas, en Swagger pulsa **Authorize** y escribe `Bearer <tu_access_token>` (el mismo que envía la app en `Authorization`).

En LAN (Expo Go en el teléfono), conviene `HOST=0.0.0.0` y `API_URL` con la IP de tu PC (ver `Back/.env.example`) para que URLs de `/uploads` e imágenes funcionen fuera de `localhost`.

---

### 3. Frontend

```powershell
cd Front
npm install
copy .env.example .env
npm start
```

- Escanea el QR con **Expo Go** o usa **web** (tecla `w` en Metro).
- Si el móvil no alcanza `localhost`, define `EXPO_PUBLIC_API_URL` con la IP de tu máquina y el puerto del API, por ejemplo `http://192.168.1.10:5000/api` (detalle en `Front/.env.example`).

---

## Despliegue en internet (sin depender de tu PC)

Este repo quedó preparado para **Render** con `render.yaml` en la raíz y `Back/Dockerfile`.

Pasos:

1. En [Render](https://render.com), crea un **Blueprint** apuntando a este repositorio.
2. Render creará:
   - servicio web `kora-backend`
   - PostgreSQL `kora-db`
3. En el servicio web, completa variables marcadas como `sync: false` (Google, email, Cloudinary, etc.).
4. Define `API_URL` con la URL pública final del backend, por ejemplo:
   - `https://kora-backend.onrender.com`
5. Espera el primer deploy y valida:
   - `https://TU_BACKEND/health`
   - `https://TU_BACKEND/api/docs` (Swagger)
6. Genera una APK apuntando a producción:
   - `EXPO_PUBLIC_API_URL=https://TU_BACKEND/api`
   - luego `eas build -p android --profile preview`

Con esto, los testers pueden usar la app desde cualquier red sin que tú tengas encendido tu backend local.

---

## Rutas del API (resumen)

| Prefijo | Ámbito |
|---------|--------|
| `/api/auth` | Registro, login, tokens, verificación |
| `/api/profile` | Perfil y datos del usuario |
| `/api/match` | Descubrimiento, likes, matches |
| `/api/messages` | Mensajes del chat |
| `/api/reports` | Reportes |
| `/api/upload` | Subida de archivos |
| `/api/location` | Ubicación |
| `/api/stories` | Historias |
| `/api/plans` | Planes y participantes |

El detalle de métodos, cuerpos y códigos de respuesta está en **Swagger** (`/api/docs`) y en `Back/openapi.yaml`. El código fuente de las rutas sigue en `Back/src/routes/` y `Back/src/controllers/`.

---

## Variables de entorno importantes

**Backend (`Back/.env`)** — ver `Back/.env.example`:

- `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET` (obligatorios para producción seria).
- `API_URL` — base pública del servidor (crítica para medios en móvil).
- `CLOUDINARY_*` o almacenamiento local según `Back/src/config`.

**Frontend (`Front/.env`)** — ver `Front/.env.example`:

- `EXPO_PUBLIC_API_URL` — URL base del API terminada en `/api` cuando pruebas fuera de `localhost`.

Nunca subas `.env` con secretos reales al repositorio; este proyecto los ignora mediante `.gitignore`.

---

## Scripts útiles

| Ubicación | Comando | Uso |
|-----------|---------|-----|
| `Back/` | `npm run dev` | Servidor con nodemon |
| `Back/` | `npm run build` / `npm start` | Compilar y ejecutar `dist/` |
| `Back/` | `npm run prisma:migrate` | Migraciones en desarrollo |
| `Back/` | `npm run prisma:migrate:deploy` | Migraciones en CI o entorno fijo |
| `Front/` | `npm start` | Metro / Expo |
| `Front/` | `npm run web` | Solo cliente web |

---

## Solución de problemas

- **«Sin conexión con la base de datos»** en el API: revisa que PostgreSQL esté arriba y que `DATABASE_URL` sea correcta; en Windows, una variable `DATABASE_URL` global puede pisar el `.env` — usa los scripts `npm run prisma:*` desde `Back/`.
- **Imágenes o audio rotos en el móvil**: alinea `API_URL` (Back) y `EXPO_PUBLIC_API_URL` (Front) con la IP de tu red, no solo `localhost`.
- **Puerto 5432 ocupado**: no levantes el `docker-compose` de este repo si ya tienes otro Postgres en el mismo puerto.

---

## Licencia y uso académico

Proyecto de ejemplo / entrega formativa. Ajusta licencia y despliegue según las normas de tu institución o producto.
