FROM node:20-slim AS builder

RUN npm install -g pnpm@9

WORKDIR /app
COPY . .

RUN pnpm install --frozen-lockfile
# Generar cliente Prisma (necesario antes del bundle)
RUN pnpm --filter @edusync/database db:generate
RUN pnpm --filter @edusync/api build

# ──────────────────────────────────────────────────────────────
FROM node:20-slim

# Chromium para Puppeteer (generación de PDFs)
RUN apt-get update && apt-get install -y \
      chromium \
      fonts-liberation \
      fonts-noto \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

WORKDIR /app

# Dependencias de producción (incluye @prisma/client con binario nativo)
COPY --from=builder /app/node_modules              ./node_modules
COPY --from=builder /app/apps/api/node_modules     ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist             ./apps/api/dist
# Schema Prisma (el cliente lo referencia en runtime)
COPY --from=builder /app/packages/database/prisma  ./packages/database/prisma

EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
