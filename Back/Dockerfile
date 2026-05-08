FROM node:20-bookworm-slim AS deps
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --include=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts

RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY --from=deps /app/dist ./dist
COPY openapi.yaml ./openapi.yaml

EXPOSE 5000

CMD ["sh", "-c", "npx prisma migrate deploy || true; npx prisma db push; node dist/server.js"]
