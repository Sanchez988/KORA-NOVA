# Kora Nova

**Autoras:** [Valentina María Roldán Sánchez](#autoras) · [Katherine Cano Bolívar](#autoras)

Red social móvil para conocer gente, chatear con matches, publicar historias y organizar **planes** (quedadas) con fecha y lugar. El repositorio incluye el cliente **Expo / React Native**, la **API REST** en Node.js y el **DDL** de PostgreSQL, listo para entrega académica o despliegue local y en la nube.

---

## Índice

1. [Autoras](#autoras)
2. [Contenido del repositorio](#contenido-del-repositorio)
3. [Arquitectura general](#arquitectura-general)
4. [Stack técnico](#stack-técnico)
5. [Funcionalidades principales](#funcionalidades-principales)
6. [Requisitos previos](#requisitos-previos)
7. [Puesta en marcha rápida](#puesta-en-marcha-rápida)
8. [Despliegue (Render y app móvil)](#despliegue-en-internet-sin-depender-de-tu-pc)
9. [Actualizaciones OTA (EAS Update)](#actualizaciones-ota-eas-update)
10. [Rutas del API (resumen)](#rutas-del-api-resumen)
11. [Variables de entorno](#variables-de-entorno-importantes)
12. [Scripts útiles](#scripts-útiles)
13. [Pruebas y calidad](#pruebas-y-calidad)
14. [Solución de problemas](#solución-de-problemas)
15. [Cumplimiento de requisitos (rúbrica)](#cumplimiento-de-requisitos-rúbrica-típica)
16. [Licencia y uso académico](#licencia-y-uso-académico)

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
| `Back/` | **API REST** (**Express** + **TypeScript** + **Prisma**). Incluye **Swagger UI** en `/api/docs` y contrato `openapi.yaml`. |
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
└── README.md       # Este archivo (instrucciones; en GitHub es el estándar; equivale a Readme.md de muchas rúbricas)
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

- El **front** solo habla con el API por **HTTPS** (axios), salvo desarrollo en LAN.
- El **back** centraliza autenticación (**JWT**), reglas de negocio y acceso a datos (**Prisma**).
- **Medios**: en producción se recomienda **Cloudinary** (URLs estables); en desarrollo puede usarse almacenamiento local bajo `/uploads`.

---

## Stack técnico

| Capa | Tecnologías |
|------|-------------|
| **Móvil** | [Expo](https://expo.dev) ~54, React Native, **TypeScript**, React Navigation, expo-image, EAS Build / EAS Update |
| **API** | Node.js, **Express**, **TypeScript**, **Prisma ORM** |
| **Datos** | **PostgreSQL** |
| **Tiempo real** | Socket.IO (chat / presencia según configuración) |
| **Archivos** | Multer + **Cloudinary** (recomendado en producción) y/o disco local |
| **Documentación API** | [Swagger UI](https://swagger.io/tools/swagger-ui/) en `/api/docs`; OpenAPI en `Back/openapi.yaml` |

La API sigue convenciones **REST**: **GET** para consultas; **POST**, **PUT/PATCH**, **DELETE** para escritura; respuestas en **JSON**. Routers y controladores están separados en `Back/src/routes` y `Back/src/controllers`.

---

## Funcionalidades principales

- **Cuenta:** registro, login (correo/contraseña y Google donde aplique), verificación por correo, recuperación de contraseña, JWT + refresh tokens, cuenta eliminada con periodo de recuperación.
- **Perfil:** fotos, bio, intereses, privacidad, modo incógnito, consentimiento legal.
- **Social:** descubrimiento, likes, **matches**, chat con texto, imágenes y adjuntos.
- **Historias (stories):** publicación con imagen, caducidad, visualización en hub.
- **Planes:** crear y editar eventos (categoría, fecha/hora, cupos), unirse/salir, invitar matches.
- **Otros:** ubicación, reportes de usuarios, mapa de planes (Carto / mapas según plataforma), tema claro/oscuro.

---

## Requisitos previos

- [Node.js](https://nodejs.org/) LTS (recomendado **20+**).
- [Docker](https://docs.docker.com/get-docker/) (opcional, para `docker-compose` con Postgres).
- Cuenta en [Expo](https://expo.dev) si pruebas en **dispositivo físico** con Expo Go o generas builds con **EAS**.
- Editor con soporte TypeScript (VS Code, Cursor, etc.).

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

Puedes crear la base y cargar `BD/kora_database.sql` con `psql`, o usar migraciones Prisma (modelo equivalente documentado en `schema.prisma`).

---

### 2. Backend

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

En LAN (Expo Go en el teléfono), conviene `HOST=0.0.0.0` en el back y `API_URL` con la **IP pública de tu PC** (ver `Back/.env.example`) para que enlaces a `/uploads` e imágenes no queden en `localhost`.

---

### 3. Frontend

```powershell
cd Front
npm install
copy .env.example .env
npm start
```

- Escanea el QR con **Expo Go** o abre **web** (tecla `w` en Metro).
- Si el móvil no alcanza el PC por `localhost`, define `EXPO_PUBLIC_API_URL` con la IP del equipo y el API, p. ej. `http://192.168.1.10:5000/api` (detalle en `Front/.env.example`).

---

## Despliegue en internet (sin depender de tu PC)

El repo incluye **`render.yaml`** y `Back/Dockerfile` para [Render](https://render.com).

1. Crea un **Blueprint** en Render apuntando al repositorio.
2. Se provisionan el servicio web del backend y PostgreSQL (según el blueprint).
3. Completa variables `sync: false` (Google, SMTP, Cloudinary, etc.).
4. Define `API_URL` con la URL pública del backend (p. ej. `https://tu-servicio.onrender.com`).
5. Verifica `https://TU_BACKEND/health` y `https://TU_BACKEND/api/docs`.
6. **APK / AAB:** en `Front/`, configura `EXPO_PUBLIC_API_URL=https://TU_BACKEND/api` en EAS (variables de entorno del perfil `production` o `preview`) y ejecuta `eas build`.

---

## Actualizaciones OTA (EAS Update)

Si la app se construyó con **EAS Update** habilitado (`expo-updates`, canal alineado con `eas.json`):

```powershell
cd Front
npx eas-cli update --channel production --message "Descripción del cambio"
```

o `npm run update:production`. Los usuarios reciben el nuevo **bundle JavaScript** al abrir la app (sin nueva tienda), siempre que el **runtimeVersion** coincida con la build instalada. Cambios **nativos** siguen requiriendo `eas build`.

---

## Rutas del API (resumen)

| Prefijo | Ámbito |
|---------|--------|
| `/api/auth` | Registro, login, tokens, verificación, recuperación |
| `/api/profile` | Perfil |
| `/api/match` | Descubrimiento, likes, matches |
| `/api/messages` | Chat |
| `/api/reports` | Reportes |
| `/api/upload` | Subida de archivos |
| `/api/location` | Ubicación |
| `/api/stories` | Historias |
| `/api/plans` | Planes y participantes |

Detalle de métodos, cuerpos y códigos: **Swagger** y `Back/openapi.yaml`. Implementación: `Back/src/routes/` y `Back/src/controllers/`.

---

## Variables de entorno importantes

**Backend (`Back/.env`)** — plantilla en `Back/.env.example`:

- `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET` (obligatorios en serio).
- `API_URL` — base pública del servidor (crítica para URLs de medios en móvil).
- `EMAIL_*` si usas verificación o recuperación por correo.
- `CLOUDINARY_*` (recomendado en producción para fotos e historias persistentes).

**Frontend (`Front/.env`)** — plantilla en `Front/.env.example`:

- `EXPO_PUBLIC_API_URL` — base del API terminada en `/api` fuera de localhost.
- Claves públicas de Google / Maps según pantallas que uses.

**Seguridad:** no subas `.env` con secretos al repositorio; están listados en `.gitignore` (raíz, `Front/`, `Back/`).

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
- **Expo Go no llega al API:** usa la **IPv4 Wi‑Fi** del PC en `EXPO_PUBLIC_API_URL`, no `localhost`.
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
