# Kora — aplicación móvil multiplataforma

Proyecto completo según especificación académica: cliente móvil (Expo + React Native + TypeScript), API REST JSON y base PostgreSQL.

## Estructura de entrega

| Carpeta | Contenido |
|---------|-----------|
| `Front/` | Código fuente del cliente Expo / React Native (TypeScript) |
| `Back/` | API REST (Node.js, Express, TypeScript, Prisma) |
| `BD/` | Script DDL PostgreSQL (`kora_database.sql`) |

## Cumplimiento de requisitos

- **Frontend**: aplicación Expo con **React Native** y **TypeScript**; ejecutable en dispositivo (Expo Go) o navegador (`npm run web`).
- **Backend**: **API REST** con respuestas **JSON**. Las operaciones de **lectura** usan métodos **`GET`** (consultas sin efectos secundarios) y las de **escritura** usan **`POST`**, **`PUT`**, **`PATCH`** y **`DELETE`** en rutas y controladores separados (`src/routes`, `src/controllers`), facilitando mantenimiento y escalado.
- **Base de datos**: PostgreSQL; `BD/kora_database.sql` replica el SQL generado por Prisma a partir de `Back/prisma/schema.prisma` (misma estructura que `prisma/migrations/.../migration.sql`). El ORM queda configurado con `provider = "postgresql"`.

## Puesta en marcha

### 1. Base de datos PostgreSQL (obligatoria)

Si ves en la app *«Sin conexión con la base de datos»*, el API no alcanza PostgreSQL.

**Opción A — Postgres solo para esta entrega** (`docker-compose.yml` en la raíz; puerto **5432**):

```powershell
docker compose up -d
```

En `Back/.env`:  
`DATABASE_URL="postgresql://kora:kora@localhost:5432/kora_db?schema=public"`

**Opción B — Ya tienes corriendo** `kora-fix/infrastructure` (contenedor Postgres en **5432**): usa el mismo **`DB_USER` / `DB_PASSWORD`** que en ese proyecto (por defecto `kora_user` / `kora_password`). Crea una base **solo para Prisma** para no mezclar tablas Django con las de este API Node:

```powershell
docker exec infrastructure-db-1 psql -U kora_user -d postgres -c "CREATE DATABASE kora_mobile_entrega OWNER kora_user;"
```

En `Back/.env`:

`DATABASE_URL="postgresql://kora_user:kora_password@localhost:5432/kora_mobile_entrega?schema=public"`

*(No abras dos Postgres distintos en el mismo puerto 5432: o el compose de esta carpeta **o** el de infrastructure.)*

Luego aplicar migraciones:

```powershell
cd Back
npm run prisma:migrate:deploy
# desarrollo iterativo: npm run prisma:migrate
```

Si `npx prisma …` usa otra URL que `Back/.env`, puede que tengas **`DATABASE_URL` definida a nivel sistema** en Windows (sobrescribe el `.env`). Usa los scripts **`npm run prisma:*`** del `package.json`, o elimina esa variable de entorno de usuario/sistema.

El backend en desarrollo carga **`Back/.env`** con prioridad sobre el sistema para evitar ese conflicto.

### Backend

```powershell
cd Back
npm install
copy .env.example .env
# Ajustar DATABASE_URL si no usas Docker; JWT_SECRET obligatorio
npx prisma generate
npm run dev
```

API por defecto: `http://localhost:5000/api`.

### Frontend

```powershell
cd Front
npm install
npm start
# Opciones: Expo Go, emuladores, o "w" para web
```

En la misma red, la app web resuelve la API al mismo host en el puerto **5000**. Para móvil físico, define `EXPO_PUBLIC_API_URL` (ver `Front/src/config/index.ts`).

### Base de datos (DDL)

```powershell
# Crear la base (una vez)
psql -U postgres -c "CREATE DATABASE kora_db;"

# Opción A: aplicar DDL entregado
psql -U postgres -d kora_db -f BD/kora_database.sql

# Opción B: migraciones Prisma (equivalente al DDL de BD/)
cd Back
npx prisma migrate dev
```

## Variables de entorno relevantes (`Back/.env`)

- `DATABASE_URL` — conexión PostgreSQL  
- `JWT_SECRET` — firma de tokens  
- `CLOUDINARY_*` — subida de imágenes de perfil (opcional pero recomendado)

Documentación dispersa anterior (Firebase opcional, etc.) puede consultarse en la configuración de `Back/.env.example` y código de `Back/src`.
