FROM node:24-slim

# Chromium + libs para Puppeteer
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libgbm1 \
    libasound2t64 libpangocairo-1.0-0 libxss1 libgtk-3-0 \
    libxshmfence1 libglu1 openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Instalar pnpm
RUN npm install -g pnpm@9

WORKDIR /app

# Copiar manifiestos del workspace
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json              apps/api/
COPY apps/web/package.json              apps/web/
COPY packages/database/package.json    packages/database/
COPY packages/types/package.json       packages/types/

# Instalar dependencias (pnpm en node oficial crea permisos correctos)
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY . .

# Generar cliente Prisma
RUN pnpm --filter @edusync/database db:generate

# Compilar API
RUN pnpm --filter @edusync/api build

EXPOSE 4000

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

CMD ["node", "apps/api/dist/index.js"]
