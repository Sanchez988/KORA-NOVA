# Kora Nova

**Autoras:** [Valentina María Roldán Sánchez](#autoras) · [Katherine Cano Bolívar](#autoras)

Red social móvil para conocer gente, chatear con matches, publicar historias y organizar **planes** (quedadas) con fecha y lugar. Este repositorio incluye el cliente **Expo / React Native** (`Front/`), la **API REST** en Node.js (`Back/`) y el **DDL** de PostgreSQL (`BD/`), listo para entrega académica o despliegue local y en la nube.

**Stack:** Expo · React Native · TypeScript · Node.js · Express · Prisma · PostgreSQL · Docker · Socket.IO · EAS Build / Update

---

## Índice

1. [Autoras](#autoras)
2. [Contenido del repositorio](#contenido-del-repositorio)
3. [Arquitectura general](#arquitectura-general)
4. [Stack técnico](#stack-técnico)
5. [Funcionalidades principales](#funcionalidades-principales)
6. [Requisitos previos](#requisitos-previos)
7. [Instalación del backend](#instalación-del-backend)
8. [Instalación de la app (Expo / React Native)](#instalación-de-la-app-expo--react-native)
9. [Dependencias principales (Front)](#dependencias-principales-front)
10. [Variables de entorno](#variables-de-entorno)
11. [API — Referencia de endpoints](#api--referencia-de-endpoints)
12. [Socket.IO (tiempo real)](#socketio-tiempo-real)
13. [Despliegue (Render y app móvil)](#despliegue-en-internet-sin-depender-de-tu-pc)
14. [Actualizaciones OTA (EAS Update)](#actualizaciones-ota-eas-update)
15. [Modo desarrollo (`__DEV__`)](#modo-desarrollo-__dev__)
16. [Flujo de autenticación](#flujo-de-autenticación)
17. [Seguridad y producción](#seguridad-y-producción)
18. [Scripts útiles](#scripts-útiles)
19. [Pruebas y calidad](#pruebas-y-calidad)
20. [Solución de problemas](#solución-de-problemas)
21. [Cumplimiento de requisitos (rúbrica)](#cumplimiento-de-requisitos-rúbrica-típica)
22. [Licencia y uso académico](#licencia-y-uso-académico)

---

## Autoras

| Nombre | Rol |
|--------|-----|
| **Valentina María Roldán Sánchez** | Desarrollo full stack (móvil, API, integración, despliegue) |
| **Katherine Cano Bolívar** | Desarrollo full stack (móvil, API, integración, despliegue) |

*Institución: trabajo académico — aplicación móvil con backend REST y base de datos relacional.*

---

## Contenido del repositorio

| Ruta | Descripción |
|------|-------------|
| `Front/` | App **Expo** (React Native + **TypeScript**). Expo Go, emuladores Android/iOS o **web** (`expo start --web`). |
| `Back/` | **API REST** (**Express** + **TypeScript** + **Prisma**). **Swagger UI** en `/api/docs` y contrato `openapi.yaml`. |
| `BD/` | Script **DDL** PostgreSQL (`kora_database.sql`), alineado con el esquema Prisma. |
| `docker-compose.yml` | PostgreSQL 16 opcional para desarrollo (puerto `5432`). |
| `render.yaml` | Blueprint opcional para desplegar backend + base en [Render](https://render.com). |

### Estructura sugerida para entrega (zip o GitHub)

```
/
├── Front/          # Cliente móvil (Expo)
├── Back/           # API REST
├── BD/             # Scripts SQL (DDL)
├── docker-compose.yml
├── render.yaml
└── README.md
```

---

## Arquitectura general

```mermaid
flowchart LR
  subgraph cliente["Cliente móvil / web"]
    App["Expo React Native"]
  end
  subgraph servidor["Servidor Node"]
    API["Express /api"]
    IO["Socket.IO"]
    DB[(PostgreSQL)]
    Files["Archivos Cloudinary o /uploads"]
  end
  App -->|"HTTPS JSON REST"| API
  App -->|"WebSocket"| IO
  API --> DB
  API --> Files
```

- El **front** habla con el API por **HTTPS** (axios), salvo ajustes en LAN.
- El **back** centraliza autenticación (**JWT**), reglas de negocio y datos (**Prisma**).
- **Medios:** en producción se recomienda **Cloudinary**; en desarrollo puede usarse disco bajo `/uploads`.

---

## Stack técnico

| Capa | Tecnologías |
|------|-------------|
| **Móvil** | [Expo](https://expo.dev) ~54, React Native, **TypeScript**, React Navigation, expo-image, EAS Build / EAS Update |
| **API** | Node.js, **Express**, **TypeScript**, **Prisma ORM** |
| **Datos** | **PostgreSQL** |
| **Tiempo real** | Socket.IO (chat / indicador de escritura) |
| **Archivos** | Multer + **Cloudinary** (recomendado en producción) y/o disco local |
| **Documentación API** | [Swagger UI](https://swagger.io/tools/swagger-ui/) en `/api/docs`; OpenAPI en `Back/openapi.yaml` |

La API sigue convenciones **REST**: **GET** para consultas; **POST**, **PUT/PATCH**, **DELETE** para escritura; respuestas en **JSON**. Routers y controladores en `Back/src/routes` y `Back/src/controllers`.

---

## Funcionalidades principales

- **Cuenta:** registro, login (correo/contraseña y Google donde aplique), verificación por correo, recuperación de contraseña, JWT + refresh tokens, cuenta eliminada con periodo de recuperación.
- **Perfil:** fotos, bio, intereses, privacidad, modo incógnito, consentimiento legal.
- **Social:** descubrimiento, likes, **matches**, chat con texto, imágenes y adjuntos.
- **Historias (stories):** publicación con imagen, caducidad, visualización en hub.
- **Planes:** crear y editar eventos (categoría, fecha/hora, cupos), unirse/salir, invitar matches, mapa de planes.
- **Otros:** ubicación, reportes de usuarios, tema claro/oscuro.

---

## Requisitos previos

**Backend y datos**

- [Node.js](https://nodejs.org/) LTS (recomendado **20+**).
- [Docker](https://docs.docker.com/get-docker/) (opcional, para `docker compose` con Postgres en la raíz).
- PostgreSQL accesible con la cadena que pongas en `DATABASE_URL`.

**App móvil**

- [Node.js](https://nodejs.org/) LTS (Metro y Expo CLI).
- Cuenta en [Expo](https://expo.dev) si pruebas en **dispositivo físico** con Expo Go o generas builds con **EAS**.
- **Android Studio** (emulador), **Xcode** (macOS / iOS) o **Chrome** para `expo start --web`.
- Editor con soporte TypeScript (VS Code, Cursor, etc.).

---

## Instalación del backend

### 1. Base de datos PostgreSQL

**Opción A — Docker (recomendado en este repo)**

En la raíz del proyecto:

```powershell
docker compose up -d
```

En `Back/.env`, por ejemplo:

`DATABASE_URL="postgresql://kora:kora@localhost:5432/kora_db?schema=public"`

**Opción B — Postgres ya instalado u otro servicio**

Define `DATABASE_URL` apuntando a tu instancia. Evita dos servidores en el mismo puerto **5432**.

Luego, desde `Back/`:

```powershell
cd Back
npm install
copy .env.example .env
# Edita .env: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET (mínimo ~32 caracteres)
npx prisma generate
npm run prisma:migrate:deploy
```

Para desarrollo con cambios nuevos de esquema: `npm run prisma:migrate`.

**DDL sin Prisma (entrega académica)**

Puedes crear la base y cargar `BD/kora_database.sql` con `psql`, o usar migraciones Prisma (modelo equivalente en `schema.prisma`).

### 2. Arrancar la API

```powershell
cd Back
npm install
npm run dev
```

Por defecto la API escucha en el puerto **5000** y el prefijo de rutas es **`/api`**.

- Salud: `http://localhost:5000/health`
- **Swagger:** [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
- OpenAPI JSON: `http://localhost:5000/api/openapi.json`
- YAML editable: `Back/openapi.yaml`

Para rutas protegidas en Swagger: **Authorize** → `Bearer <access_token>`.

En LAN (Expo Go en el teléfono), conviene `HOST=0.0.0.0` en el back y `API_URL` (Back) alineado con la **IPv4 Wi‑Fi** de tu PC (ver `Back/.env.example`) para que enlaces a `/uploads` e imágenes no queden en `localhost`.

---

## Instalación de la app (Expo / React Native)

### 1. Variables de entorno de la app

```powershell
cd Front
copy .env.example .env
```

El archivo `Front/.env` controla la **URL base del API** y las claves públicas (Google, Maps, etc.). La variable principal es:

| Variable | Uso típico |
|----------|------------|
| `EXPO_PUBLIC_API_URL` | Base del API **terminada en `/api`**. |

**Ejemplos (ajusta host y puerto a tu máquina):**

```env
# Web o Metro en el mismo PC que el backend
EXPO_PUBLIC_API_URL=http://localhost:5000/api

# Emulador Android: 10.0.2.2 es el “localhost” del PC visto desde el emulador
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api

# Expo Go o dispositivo físico en la misma Wi‑Fi (sustituye por la IPv4 de tu PC)
EXPO_PUBLIC_API_URL=http://192.168.1.10:5000/api
```

`10.0.2.2` es la IP especial del **emulador Android** para referirse al **localhost del equipo host** (equivalente conceptual al ejemplo del README de referencia con Flutter).

Tras editar `.env`, **reinicia Metro** (`Ctrl+C` y `npm start` de nuevo).

### 2. Google Sign-In y Maps (opcional según pantallas)

Esta app **no** usa el flujo `google-services.json` de Android nativo tipo plantilla Flutter/Firebase Admin del otro README; aquí el login Google se integra vía **Google Cloud OAuth** (cliente tipo “Aplicación web”) y variables documentadas en `Front/.env.example` (`EXPO_PUBLIC_GOOGLE_CLIENT_ID`, URIs de redirect para web y Expo Go, etc.). Debe coincidir con `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` en `Back/.env` si usas el canje PKCE en servidor.

Para el mapa de planes, si aplica, define `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` según los comentarios del mismo `.env.example`.

### 3. Instalar dependencias y ejecutar

```powershell
cd Front
npm install
npm start
```

- Escanea el QR con **Expo Go** o abre **web** (tecla `w` en Metro).
- Solo web en Chrome: `npm run web` o `npx expo start --web`.

Si el móvil no alcanza el PC por `localhost`, revisa `EXPO_PUBLIC_API_URL` como en el paso 1.

---

## Dependencias principales (Front)

| Paquete | Uso |
|---------|-----|
| `expo` | Toolchain y runtime Expo |
| `react` / `react-native` | UI multiplataforma |
| `@react-navigation/*` | Navegación (tabs, stack) |
| `axios` | Llamadas HTTP al backend |
| `socket.io-client` | Chat y eventos en tiempo real |
| `@react-native-async-storage/async-storage` | Persistencia local de JWT y datos de sesión |
| `expo-auth-session` / `expo-web-browser` | OAuth / Google en móvil y web |
| `expo-image` / `expo-image-picker` | Fotos de perfil e historias |
| `expo-notifications` | Notificaciones locales / push (según configuración) |
| `expo-location` / `react-native-maps` | Ubicación y mapas de planes |
| `expo-updates` | Actualizaciones OTA (EAS Update) |

---

## Variables de entorno

No subas `.env` con secretos; están ignorados en `.gitignore` (raíz, `Front/`, `Back/`).

### Backend — `Back/.env` (plantilla: `Back/.env.example`)

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `DATABASE_URL` | Sí | Cadena PostgreSQL para Prisma. |
| `JWT_SECRET` | Sí | Firma de access token (mín. ~32 caracteres en serio). |
| `JWT_REFRESH_SECRET` | Sí | Firma de refresh token. |
| `PORT` | No | Puerto HTTP (por defecto `5000`). |
| `HOST` | No | `0.0.0.0` recomendado en LAN para Expo Go. |
| `API_URL` | Muy recomendada | URL pública del servidor (enlaces en correos, `/uploads`, respuestas con URLs absolutas). |
| `NODE_ENV` | No | `development` / `production`. |
| `EMAIL_*` | Según flujo | SMTP (Nodemailer) para verificación y recuperación. |
| `EMAIL_VERIFICATION_REQUIRED` | No | Control de registro con o sin verificación por correo. |
| `CLOUDINARY_*` o `CLOUDINARY_URL` | Producción recomendada | Almacenamiento de imágenes estable. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Si usas Google OAuth con PKCE en servidor | Deben alinearse con el cliente web del front. |
| `SOCKET_CORS_ORIGIN` | No | Origen permitido para Socket.IO (ajusta en producción). |
| `RATE_LIMIT_*`, `BCRYPT_SALT_ROUNDS`, etc. | No | Seguridad y límites (valores por defecto en `.env.example`). |

### App — `Front/.env` (plantilla: `Front/.env.example`)

| Variable | Descripción |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Base del API (`…/api`). Crítica en dispositivo/emulador: no uses `localhost` salvo en web en el mismo PC. |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Client ID OAuth (mismo proyecto que el backend si aplica). |
| `EXPO_PUBLIC_GOOGLE_*` | URIs de redirect opcionales (web / Expo proxy). |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Mapa de planes en web y builds nativos cuando corresponda. |

---

## API — Referencia de endpoints

**Base URL (local):** `http://localhost:5000/api`

Todas las rutas protegidas usan el header:

```http
Authorization: Bearer <access_token>
```

La tabla siguiente es un **resumen**; el detalle de cuerpos y códigos está en **Swagger** (`/api/docs`) y en `Back/openapi.yaml`.

### Autenticación — `/api/auth/`

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/register` | No | Registro (dominio de correo validado en middleware). |
| POST | `/login` | No | Login email + contraseña. |
| POST | `/verify-email` | No | Verificar correo con token. |
| POST | `/resend-verification` | No | Reenviar verificación. |
| POST | `/request-password-reset` | No | Solicitar recuperación. |
| POST | `/reset-password` | No | Restablecer contraseña con código. |
| POST | `/google` | No | Login con Google (`idToken`). |
| POST | `/google/oauth-code` | No | Canje PKCE (code, redirectUri, codeVerifier). |
| POST | `/google/reactivate-deleted` | No | Reactivar cuenta eliminada (Google). |
| POST | `/google/restart-fresh-deleted` | No | Reinicio limpio con Google en periodo de gracia. |
| POST | `/legal-consent` | Sí | Aceptar versión de documentos legales. |
| GET | `/me` | Sí | Usuario autenticado. |
| POST | `/refresh-token` | No | Nuevo access token con `refreshToken`. |
| DELETE | `/account` | Sí | Baja (soft delete con periodo de gracia). |
| POST | `/account/restart-fresh` | No | Purga definitiva y posibilidad de nuevo registro (email/contraseña). |
| POST | `/reactivate` | No | Reactivar cuenta en periodo de gracia (email/contraseña). |

### Perfil — `/api/profile/`

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/` | Sí | Crear perfil. |
| GET | `/me` | Sí | Mi perfil. |
| GET | `/stats` | Sí | Estadísticas. |
| PUT | `/` | Sí | Actualizar perfil. |
| DELETE | `/photo` | Sí | Quitar foto. |
| PATCH | `/incognito` | Sí | Modo incógnito. |
| GET | `/:userId` | Sí | Perfil público por id. |

### Matching — `/api/match/`

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/discovery` | Sí | Usuarios para descubrir. |
| POST | `/like` | Sí | Like. |
| POST | `/dislike` | Sí | Dislike. |
| GET | `/my-matches` | Sí | Matches. |
| DELETE | `/:matchId` | Sí | Unmatch. |

### Mensajes — `/api/messages/`

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/:matchId` | Sí | Historial del match. |
| POST | `/:matchId` | Sí | Enviar mensaje. |
| PATCH | `/:messageId/read` | Sí | Marcar leído. |
| DELETE | `/:messageId` | Sí | Eliminar mensaje. |

### Reportes — `/api/reports/`

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/my-targets` | Sí | Objetivos de reportes propios. |
| GET | `/status/:reportedUserId` | Sí | Estado de reporte. |
| DELETE | `/to/:reportedUserId` | Sí | Revocar reportes a un usuario. |
| POST | `/` | Sí | Crear reporte. |

### Upload — `/api/upload/`

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/image` | Sí | Subir una imagen. |
| POST | `/images` | Sí | Subir varias imágenes. |

### Ubicación — `/api/location/`

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/toggle` | Sí | Activar/desactivar ubicación. |
| GET | `/status` | Sí | Estado. |
| POST | `/` | Sí | Actualizar ubicación. |
| GET | `/me` | Sí | Mi ubicación. |

### Historias — `/api/stories/`

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/` | Sí | Crear historia (multipart). |
| GET | `/me` | Sí | Mis historias. |
| GET | `/matches` | Sí | Historias de matches. |
| POST | `/:storyId/view` | Sí | Registrar vista. |
| DELETE | `/:storyId` | Sí | Eliminar historia. |

### Planes — `/api/plans/`

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/` | Sí | Listado / feed de planes. |
| GET | `/mine` | Sí | Mis planes. |
| GET | `/map` | Sí | Datos para mapa. |
| POST | `/` | Sí | Crear plan. |
| PATCH | `/:id` | Sí | Actualizar plan. |
| POST | `/:id/join` | Sí | Unirse. |
| POST | `/:id/add-participant` | Sí | Añadir participante. |
| DELETE | `/:id/leave` | Sí | Salir del plan. |
| DELETE | `/:id` | Sí | Cancelar plan. |

---

## Socket.IO (tiempo real)

El servidor HTTP y Socket.IO comparten el mismo **origen** que el API (mismo host y puerto, por defecto `http://localhost:5000`). El cliente usa `socket.io-client` desde la app.

**Autenticación en la conexión:** envía el JWT en el handshake, por ejemplo `auth: { token: '<access_token>' }`. El servidor verifica el token y une el socket a la sala `user:<userId>`.

**Eventos útiles (resumen):**

| Evento (cliente → servidor) | Descripción |
|------------------------------|-------------|
| `join_room` | Payload: `matchId` (string). Entra en la sala del match. |
| `send_message` | Envía mensaje; el servidor emite `receive_message` a la sala. |
| `typing` | Indicador de escritura; otros reciben `user_typing`. |

Para el detalle de payloads, revisa `Back/src/server.ts` y el uso en `Front/src`.

---

## Despliegue en internet (sin depender de tu PC)

El repo incluye **`render.yaml`** y `Back/Dockerfile` para [Render](https://render.com).

1. Crea un **Blueprint** en Render apuntando al repositorio.
2. Se provisionan el servicio web del backend y PostgreSQL (según el blueprint).
3. Completa variables `sync: false` (Google, SMTP, Cloudinary, etc.).
4. Define `EXPO_PUBLIC_API_URL` en EAS con la URL pública del backend (p. ej. `https://tu-servicio.onrender.com/api`).
5. Verifica `https://TU_BACKEND/health` y `https://TU_BACKEND/api/docs`.
6. **APK / AAB:** en `Front/`, variables de entorno del perfil `production` o `preview` en EAS y `eas build`.

---

## Actualizaciones OTA (EAS Update)

Si la app se construyó con **EAS Update** habilitado (`expo-updates`, canal alineado con `eas.json`):

```powershell
cd Front
npx eas-cli update --channel production --message "Descripción del cambio"
```

o `npm run update:production`. Los usuarios reciben el nuevo **bundle JavaScript** al abrir la app (sin nueva tienda), siempre que el **runtimeVersion** coincida con la build instalada. Cambios **nativos** siguen requiriendo `eas build`.

---

## Modo desarrollo (`__DEV__`)

En desarrollo, Metro define `__DEV__ === true`. Algunas pantallas (por ejemplo login) muestran atajos o mensajes solo en ese modo; **no** deben confundirse con lo que verá un usuario en build de release. No hay endpoints “debug” paralelos al estilo Django en este repo: las rutas son las mismas; la diferencia está en configuración (`EMAIL_VERIFICATION_REQUIRED`, códigos en respuesta de verificación/reset, etc.).

---

## Flujo de autenticación

Resumen del flujo típico (email/contraseña o Google según UI):

1. El usuario se registra o inicia sesión desde `Front/`.
2. El cliente llama a `POST /api/auth/register` o `POST /api/auth/login`, o completa Google y envía `idToken` a `POST /api/auth/google` (o canje PKCE → `google/oauth-code` → `google` según implementación).
3. El backend valida credenciales / token y responde con **access token**, **refresh token** y **usuario**.
4. La app guarda tokens y usuario en **AsyncStorage** (`token`, `refreshToken`, `user`).
5. Las peticiones HTTP añaden `Authorization: Bearer <token>` (axios en `Front/src/services/api.ts`).
6. Tras registro, si aplica verificación de correo, el usuario debe completar el flujo de verificación antes de usar la app con normalidad.
7. Si el servidor responde **401**, el interceptor actual limpia la sesión almacenada; puedes usar `POST /api/auth/refresh-token` desde la app si implementas renovación proactiva (el endpoint ya existe en el backend).

---

## Seguridad y producción

Antes de llevar Kora Nova a producción, conviene revisar:

- `NODE_ENV=production` y secretos fuertes (`JWT_SECRET`, `JWT_REFRESH_SECRET`, mínimo 32 caracteres aleatorios).
- `API_URL` y `EXPO_PUBLIC_API_URL` apuntando a HTTPS público coherente (misma “origen” lógica para medios y API).
- SMTP y remitentes reales; no depender de códigos en JSON salvo entornos controlados.
- **Cloudinary** (o almacenamiento persistente) para medios; no confiar en el disco efímero del PaaS.
- `SOCKET_CORS_ORIGIN` y CORS acotados a tus dominios, no `*` en producción si usas credenciales.
- Variables `GOOGLE_CLIENT_SECRET`, claves de Maps y demás **solo** en servidor o en EAS secrets, nunca en repositorio público.
- Backups de PostgreSQL según tu proveedor.

---

## Scripts útiles

| Ubicación | Comando | Uso |
|-----------|---------|-----|
| `Back/` | `npm run dev` | API con nodemon |
| `Back/` | `npm run build` / `npm start` | Compilar y ejecutar `dist/` |
| `Back/` | `npm run prisma:migrate` | Migraciones en desarrollo |
| `Back/` | `npm run prisma:migrate:deploy` | Migraciones en CI o servidor |
| `Front/` | `npm start` | Metro / Expo |
| `Front/` | `npm run web` | Solo cliente web |
| `Front/` | `npm run update:production` | Publicar EAS Update al canal `production` |

---

## Pruebas y calidad

- **API:** prueba flujos en **Swagger** (`/api/docs`) y con la app en Expo.
- **Móvil:** Expo Go (misma red que el PC) o build **preview/production** con EAS.
- **Tipado:** en `Front/` y `Back/`, `npx tsc --noEmit` valida TypeScript sin emitir JS.
- **Lint:** si el curso exige ESLint/Prettier, puedes añadirlos como `devDependencies` sin cambiar la lógica de negocio.

---

## Solución de problemas

- **«Sin conexión con la base de datos»** en el API: Postgres caído o `DATABASE_URL` incorrecta; en Windows, una variable global `DATABASE_URL` puede pisar el `.env`.
- **Imágenes rotas en el móvil:** alinea `API_URL` (Back) y `EXPO_PUBLIC_API_URL` (Front); en producción usa **Cloudinary** (el disco del dyno en Render es efímero).
- **Expo Go no llega al API:** usa la **IPv4 Wi‑Fi** del PC en `EXPO_PUBLIC_API_URL`, no `localhost`; en emulador Android prueba `10.0.2.2`.
- **Puerto 5432 ocupado:** no levantes dos Postgres en el mismo puerto.
- **EAS Update no aplica:** la build instalada debe tener el mismo **runtimeVersion** y **canal** que el `eas update` publicado.

---

## Cumplimiento de requisitos (rúbrica típica)

| Requisito | Estado en este repo |
|-----------|---------------------|
| **Front** multiplataforma con **Expo**, **React Native** y **TypeScript** | `Front/`: `tsconfig.json`, `package.json` (Expo ~54), pantallas `.tsx`. |
| **Back** API **REST**, **JSON**, lectura/escritura separada | `Back/src`: Express, `routes/`, `controllers/`. |
| **Base de datos** + **DDL** | PostgreSQL + Prisma (`Back/prisma/schema.prisma`) y **`BD/kora_database.sql`**. |
| **Estructura** (`Front/`, `Back/`, `BD/`, instrucciones) | Carpetas y **README.md** con instrucciones de ejecución. |
| Buenas prácticas | Código modular, configuración por entorno, documentación API. |

---

## Licencia y uso académico

Proyecto académico / formativo elaborado por **Valentina María Roldán Sánchez** y **Katherine Cano Bolívar**. Ajusta licencia, créditos y despliegue según las normas de tu institución o producto.

Hecho con cuidado para comunidades universitarias.
