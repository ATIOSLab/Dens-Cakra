# ============================================
# Stage 1: Build the Next.js application
# ============================================
FROM node:22-bookworm-slim AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package*.json ./
RUN npm ci --include=dev --ignore-scripts

COPY . .

ENV NODE_ENV=production
RUN npm run build

# ============================================
# Stage 2: Production runner
# ============================================
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN if [ -d "./apps/fe" ]; then \
      mkdir -p ./apps/fe/.next && \
      cp -r ./.next/static ./apps/fe/.next/ && \
      cp -r ./public ./apps/fe/; \
    fi

USER nextjs

EXPOSE 3000

CMD ["node", "-e", "const fs=require('fs'); const s=fs.existsSync('./server.js') ? './server.js' : './apps/fe/server.js'; require(s);"]
