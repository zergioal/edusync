# Guía de Despliegue — EduSync

Infraestructura objetivo:

| Servicio | Plataforma | URL |
|----------|-----------|-----|
| API (Express) | Google Cloud Run | `https://[servicio]-[hash].a.run.app` (dominio propio `api.edusync.bo` — paso posterior, ver §3.6) |
| Web (React/Vite) | Vercel | `https://[subdominio].edusync.bo` |
| Base de datos | Supabase | `aws-1-sa-east-1.pooler.supabase.com` |
| Auth | Supabase Auth | — |

> **Nota histórica:** el API pasó antes por Railway y Render. Ambos se abandonaron: Railway ya no ofrece free tier real, y Render free duerme el servicio tras 15 min de inactividad (cold starts de 30-60s). Cloud Run tiene free tier permanente y corre el mismo `Dockerfile` sin cambios.

---

## 1. Prerrequisitos

- Cuenta en [Supabase](https://supabase.com) con proyecto creado
- Cuenta en [Google Cloud](https://console.cloud.google.com) con facturación habilitada (requerida incluso dentro del free tier de Cloud Run)
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

## 3. Google Cloud Run — API

El `Dockerfile` en la raíz del repo ya instala Chromium y compila el API — Cloud Run lo usa tal cual, sin `gcloud` CLI ni Docker local: todo se hace desde Cloud Console conectado a GitHub.

### 3.1 Crear servicio

1. En [Cloud Console](https://console.cloud.google.com/run) → **Create Service → Continuously deploy from a repository**.
2. Conectar la cuenta de GitHub → seleccionar el repo `edusync`, rama `main`.
3. **Build type**: Dockerfile — Cloud Build detecta el `Dockerfile` de la raíz automáticamente (no hace falta configurar `apps/api` como root, el Dockerfile ya construye el monorepo completo).

### 3.2 Configuración del servicio

- **Región**: `southamerica-east1` (São Paulo) o `us-central1`.
- **CPU/Memoria**: mínimo 1 vCPU / 1 GiB — Chromium necesita más que el default de 512 MiB.
- **Autenticación**: "Allow unauthenticated invocations" (es un API público).
- **Min instances**: `0` (mantiene el uso dentro del free tier; implica cold start de contenedor de pocos segundos tras inactividad).
- **Max instances**: 3-5 para acotar conexiones concurrentes a Prisma/Supabase.
- **Request timeout**: ~120s (la generación de boletines en PDF con Puppeteer puede tardar más que el default de 5 min... default ya alcanza, pero verificar que no esté reducido).

### 3.3 Variables de entorno y secrets

En **Variables & Secrets** del servicio (usar Secret Manager para las marcadas con *):

```env
NODE_ENV=production
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true   # *
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # *
SUPABASE_JWT_SECRET=...   # *
BASE_DOMAIN=edusync.bo
CORS_ORIGIN=https://app.edusync.bo,https://[proyecto-web].vercel.app   # *
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

> No hace falta configurar `PORT`: Cloud Run lo inyecta automáticamente (8080) y `apps/api/src/index.ts` ya lee `process.env.PORT`.
> `DIRECT_URL` **no** se configura aquí — solo se usa localmente para `prisma migrate` (ver sección 2.2), nunca en runtime del servicio.

### 3.4 Deploy y verificación

Cada push a `main` dispara build + deploy automático. Verificar en la URL `*.run.app` que entrega Cloud Run:
- `GET /health` → `200 {"status":"ok"}`
- Login real contra Supabase Auth
- Un endpoint CRUD cualquiera (ej. listar estudiantes)
- **Generación de un boletín en PDF** — es el paso que más puede fallar, valida que Chromium corre bien dentro del contenedor de Cloud Run

### 3.5 Probar con el frontend antes del cutover

Apuntar temporalmente `VITE_API_URL` (env var del proyecto web en Vercel) a la URL `*.run.app` y probar la app completa en el navegador. Solo después de validar esto, actualizar `VITE_API_URL` a la URL definitiva y redeploy del frontend.

### 3.6 Dominio personalizado (paso posterior, no inmediato)

Cuando la URL `*.run.app` lleve un tiempo funcionando establemente:
- En Cloud Run → **Manage Custom Domains** → mapear `api.edusync.bo`.
- Actualizar el registro DNS `CNAME api` (hoy apunta a Railway) al target que indique Cloud Run.
- Esperar propagación y verificar SSL antes de dar de baja la URL anterior.

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
| `CNAME` | `api` | *(pendiente — se crea al mapear el dominio en Cloud Run, ver §3.6; hasta entonces la API se consume por su URL `*.run.app`)* |

---

## 7. Checklist pre-lanzamiento

- [ ] Migraciones aplicadas (`pnpm db:migrate`)
- [ ] Seed ejecutado (al menos institución base + admin)
- [ ] Variables de entorno configuradas en Cloud Run y Vercel
- [ ] Chromium funcionando en el contenedor de Cloud Run (PDF funcional)
- [ ] DNS propagado (`dig pioxii.edusync.bo`; `dig api.edusync.bo` solo tras §3.6)
- [ ] SSL activo (Cloud Run y Vercel lo gestionan automáticamente)
- [ ] CORS verificado: `curl -H "Origin: https://pioxii.edusync.bo" https://[servicio]-[hash].a.run.app/health`
- [ ] Login con usuario admin de producción
- [ ] Generación de boletin PDF probada en producción
- [ ] Backup automático de Supabase activado (Settings → Backups)

---

## 8. Monitoreo y mantenimiento

### Logs Cloud Run

```bash
gcloud run services logs read [nombre-servicio] --region [región] --limit 100
```

O desde Cloud Console → Cloud Run → servicio → pestaña **Logs**.

### Reiniciar API tras migración

Cloud Run redeploya automáticamente al hacer push a `main` (continuous deployment desde GitHub). No hace falta reiniciar manualmente — cada deploy reemplaza la revisión activa.

### Actualizar schema en producción

```bash
# 1. Aplicar migración apuntando a DIRECT_URL (puerto 5432)
pnpm db:migrate

# 2. Hacer deploy de la nueva versión de la API
git push origin main   # dispara build + deploy automático en Cloud Run
```

> **Importante:** Usar siempre `DIRECT_URL` (puerto 5432, sin pgBouncer) para `prisma migrate`. El `DATABASE_URL` de pgBouncer (puerto 6543) no soporta DDL transaccional.

### Rotación de credenciales Supabase

1. Generar nuevo JWT secret en Supabase Settings → API
2. Actualizar el secret `SUPABASE_JWT_SECRET` en Cloud Run (Secret Manager)
3. Forzar nueva revisión en Cloud Run (todos los tokens emitidos anteriormente se invalidarán)
