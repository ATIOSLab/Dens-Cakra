FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY . .
RUN mkdir -p storage

RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npm run prisma:generate
RUN npm run build

FROM node:22-bookworm-slim AS runner

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl clamav \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV FILE_SCAN_REQUIRED=true
ENV PORT=3001
ENV LOCAL_STORAGE_ROOT=/app/storage
ENV WHATSAPP_AUTH_ROOT=/app/wa_auth
ENV WHATSAPP_ALLOW_SESSION_RESET=false

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/dist ./dist
COPY --from=build /app/docker ./docker
COPY --from=build /app/storage ./seed-storage
COPY --from=build /app/.env.example ./.env.example

RUN mkdir -p /app/storage /app/wa_auth \
  && chmod +x /app/docker/entrypoint.sh

EXPOSE 3001

CMD ["./docker/entrypoint.sh"]
