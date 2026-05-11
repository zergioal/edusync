# Guía de Despliegue — EduSync

Infraestructura objetivo:

| Servicio | Plataforma | URL |
|----------|-----------|-----|
| API (Express) | Railway | `https://api.edusync.bo` |
| Web (React/Vite) | Vercel | `https://[subdominio].edusync.bo` |
| Base de datos | Supabase | `aws-1-sa-east-1.pooler.supabase.com` |
| Auth | Supabase Auth | — |

---

## 1. Prerrequisitos

- Cuenta en [Supabase](https://supabase.com) con proyecto creado
- Cuenta en [Railway](https://railway.app)
- Cuenta en [Vercel](https://vercel.com)
- Dominio `edusync.bo` con acceso al panel DNS
- `pnpm` >= 8, `Node.js` >= 20 instalados localmente

---

## 2. Supabase — Base de datos y Auth

### 2.1 Obtener credenciales

En **Project Settings → API**:
- `Project URL` → `SUPABASE_URL`
- `anon public` → `SUPABASE_ANON_KEY`
- `service_role` → `SUPABASE_SERVICE_ROLE_KEY`
- `JWT Secret` → `SUPABASE_JWT_SECRET`

En **Project Settings → Database → Connection pooling**:
- **Transaction mode** (puerto 6543) → `DATABASE_URL` (añadir `?pgbouncer=true`)
- **Session mode** (puerto 5432) → `DIRECT_URL` (para migraciones Prisma)

### 2.2 Aplicar schema

```bash
# Desde la raíz del monorepo, con .env configurado
cp .env.production.example packages/database/.env
# Editar packages/database/.env con valores reales
pnpm db:generate
pnpm db:migrate    # O pnpm db:push para aplicar directamente
```

### 2.3 Ejecutar seed inicial

```bash
pnpm db:seed
```

### 2.4 Configurar Auth

En **Authentication → Settings**:
- **Site URL**: `https://app.edusync.bo` (o el subdominio principal)
- **Redirect URLs**: añadir `https://*.edusync.bo/**`
- **JWT expiry**: 3600 (1 hora recomendado)

Para crear usuarios de producción con roles correctos, usar el script de creación de institución (ver sección 5) que llama a la Admin API de Supabase y configura `app_metadata`.

---

## 3. Railway — API

### 3.1 Crear servicio

1. En Railway, crear nuevo proyecto → **Deploy from GitHub repo**
2. Seleccionar el repositorio EduSync
3. Railway detecta automáticamente Node.js

### 3.2 Configurar build

En **Settings → Build**:
```
Build Command:   pnpm install --frozen-lockfile && pnpm --filter api build
Start Command:   node apps/api/dist/index.js
```

O usar el `railway.toml` (si existe) en la raíz.

### 3.3 Variables de entorno en Railway

Configurar en **Variables** del servicio:

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-1-sa-east-1.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=...
BASE_DOMAIN=edusync.bo
CORS_ORIGIN=https://app.edusync.bo
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

> **Nota Puppeteer:** Railway usa Debian/Ubuntu. Instalar Chromium en el Dockerfile o usar la imagen nixpacks con `chromium`. Ver sección 3.5.

### 3.4 Dominio personalizado

En **Settings → Networking → Custom Domain**:
- Añadir `api.edusync.bo`
- Crear registro DNS `CNAME api → [railway-app].up.railway.app`

### 3.5 Soporte Puppeteer (PDF)

Crear `apps/api/Dockerfile` si Railway no instala Chromium automáticamente:

```dockerfile
FROM node:20-slim
RUN apt-get update && apt-get install -y chromium --no-install-recommends && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
WORKDIR /app
COPY . .
RUN npm install -g pnpm && pnpm install --frozen-lockfile && pnpm --filter api build
CMD ["node", "apps/api/dist/index.js"]
```

---

## 4. Vercel — Frontend (Web)

### 4.1 Importar proyecto

1. En Vercel → **New Project** → Import desde GitHub
2. Seleccionar el repo EduSync
3. **Framework**: Vite (Vercel lo detecta automáticamente)

### 4.2 Configurar build

En **Settings → Build & Development**:
```
Build Command:    pnpm --filter web build
Output Directory: apps/web/dist
Install Command:  pnpm install --frozen-lockfile
```

### 4.3 Variables de entorno en Vercel

En **Settings → Environment Variables** (Environment: Production):

```env
VITE_API_URL=https://api.edusync.bo/api/v1
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_BASE_DOMAIN=edusync.bo
```

> `VITE_DEV_TENANT` solo se usa en desarrollo local. **No configurar en Vercel.**

### 4.4 Dominio wildcard (multi-tenant)

En **Settings → Domains**:
- Añadir `*.edusync.bo` (wildcard)
- Crear registro DNS `CNAME * → cname.vercel-dns.com`

Vercel servirá la misma SPA para todos los subdominios. El frontend detecta el subdominio del `window.location.hostname` y lo envía como `X-Tenant-Subdomain`.

### 4.5 Rewrites SPA

Crear `apps/web/vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## 5. Alta de nueva institución

Usar el script `scripts/nueva-institucion.ts`:

```bash
# Configurar variables necesarias en .env
pnpm ts-node scripts/nueva-institucion.ts \
  --nombre "U.E. San Ignacio" \
  --subdominio "sanignacio" \
  --admin-email "admin@sanignacio.edu.bo" \
  --admin-password "SecurePass2025#"
```

El script:
1. Crea el registro `Institucion` en la BD
2. Crea el usuario Admin en Supabase Auth con `app_metadata: { rol: "ADMIN_SISTEMA", institucion_id }`
3. Imprime la URL del subdominio: `https://sanignacio.edusync.bo`

---

## 6. DNS — Resumen de registros

| Tipo | Nombre | Valor |
|------|--------|-------|
| `A` o `CNAME` | `@` | → Vercel (landing pública) |
| `CNAME` | `*` | `cname.vercel-dns.com` |
| `CNAME` | `api` | `[app].up.railway.app` |

---

## 7. Checklist pre-lanzamiento

- [ ] Migraciones aplicadas (`pnpm db:migrate`)
- [ ] Seed ejecutado (al menos institución base + admin)
- [ ] Variables de entorno configuradas en Railway y Vercel
- [ ] Chromium instalado en el contenedor Railway (PDF funcional)
- [ ] DNS propagado (`dig api.edusync.bo`, `dig pioxii.edusync.bo`)
- [ ] SSL activo en todos los subdominios (Railway y Vercel lo gestionan automáticamente)
- [ ] CORS verificado: `curl -H "Origin: https://pioxii.edusync.bo" https://api.edusync.bo/health`
- [ ] Login con usuario admin de producción
- [ ] Generación de boletin PDF probada en producción
- [ ] Backup automático de Supabase activado (Settings → Backups)

---

## 8. Monitoreo y mantenimiento

### Logs Railway

```bash
railway logs --service api --tail
```

### Reiniciar API tras migración

Railway reinicia automáticamente al hacer deploy. Para forzar:
```bash
railway service restart
```

### Actualizar schema en producción

```bash
# 1. Aplicar migración apuntando a DIRECT_URL (puerto 5432)
pnpm db:migrate

# 2. Hacer deploy de la nueva versión de la API
git push origin main   # si Railway está conectado al repo
```

> **Importante:** Usar siempre `DIRECT_URL` (puerto 5432, sin pgBouncer) para `prisma migrate`. El `DATABASE_URL` de pgBouncer (puerto 6543) no soporta DDL transaccional.

### Rotación de credenciales Supabase

1. Generar nuevo JWT secret en Supabase Settings → API
2. Actualizar `SUPABASE_JWT_SECRET` en Railway
3. Forzar re-deploy (todos los tokens emitidos anteriormente se invalidarán)
