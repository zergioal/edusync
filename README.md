# EduSync — Sistema de Gestión de Unidades Educativas

Sistema web multi-tenant para la gestión de unidades educativas bolivianas bajo el marco de la **Ley 070 Avelino Siñani - Elizardo Pérez**.

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Monorepo | pnpm workspaces |
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + React Router v6 |
| Backend | Node.js 20 + Express + TypeScript |
| Base de datos | PostgreSQL vía Supabase + Prisma ORM |
| Autenticación | Supabase Auth (JWT) |
| Tests | Vitest |
| Deploy API | Railway |
| Deploy Web | Vercel |

## Estructura del proyecto

```
edusync/
├── apps/
│   ├── api/                    # Express API REST (puerto 4000)
│   │   └── src/
│   │       ├── controllers/    # Request/Response → delega a services
│   │       ├── services/       # Lógica de negocio
│   │       ├── routes/         # Definición y agrupación de rutas
│   │       ├── middlewares/    # auth, requireRol, tenant, errorHandler
│   │       ├── tests/          # Tests unitarios (Vitest)
│   │       └── app.ts          # Configuración Express + CORS
│   └── web/                    # React SPA (puerto 5173)
│       └── src/
│           ├── pages/          # Dashboards por rol + páginas públicas
│           ├── components/     # UI components (layout, forms, select)
│           ├── context/        # AuthContext
│           ├── hooks/          # usePlanilla, useAsistencia, etc.
│           └── lib/            # api.ts, cache.ts, roleRoutes.ts
├── packages/
│   ├── database/               # Prisma schema + client + seed
│   ├── types/                  # Tipos TypeScript compartidos (Rol, etc.)
│   └── ui/                     # Componentes base (Spinner, Badge, etc.)
├── scripts/                    # Utilidades de mantenimiento
├── .env.production.example     # Plantilla de variables de producción
└── pnpm-workspace.yaml
```

## Módulos implementados

| Módulo | Roles | Estado |
|--------|-------|--------|
| Autenticación + roles | Todos | ✅ |
| Planilla de calificaciones | Docente | ✅ |
| Asistencia de clase | Docente | ✅ |
| Asistencia diaria | Regente | ✅ |
| Gestiones / Trimestres | Admin, Coordinador | ✅ |
| Matrículas | Admin, Secretaria | ✅ |
| Boletines PDF | Admin, Coordinador | ✅ |
| Tareas | Docente, Estudiante | ✅ |
| Mensajes privados | Todos | ✅ |
| Anuncios | Admin, Docente | ✅ |
| Finanzas / Pensiones | Admin, Contador | ✅ |
| Configuración institucional | Admin | ✅ |
| Auditoría | Admin | ✅ |
| Instituciones (multi-tenant) | Admin Sistema | ✅ |
| Panel Director | Director | ✅ |
| Panel Regente | Regente | ✅ |
| Panel Estudiante | Estudiante | ✅ |
| Panel Padre/Tutor | Padre | ✅ |

## Requisitos previos

- **Node.js** >= 20.0.0
- **pnpm** >= 8.0.0 (`npm install -g pnpm`)
- Cuenta en **Supabase** (plan gratuito válido para desarrollo)

## Configuración inicial

### 1. Instalar dependencias

```bash
git clone <repo-url> edusync
cd edusync
pnpm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tus credenciales de Supabase
```

Variables críticas:

| Variable | Dónde obtenerla |
|----------|----------------|
| `DATABASE_URL` | Supabase → Settings → Database → Connection pooling (Transaction, puerto 6543) |
| `DIRECT_URL` | Supabase → Settings → Database → Connection pooling (Session, puerto 5432) |
| `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API → anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key |
| `SUPABASE_JWT_SECRET` | Supabase → Settings → API → JWT Secret |

```bash
# Copiar .env a los paquetes que lo requieren
cp .env apps/api/.env
cp .env packages/database/.env
```

### 3. Generar cliente Prisma y sincronizar schema

```bash
pnpm db:generate
pnpm db:push       # desarrollo (sin historial de migraciones)
# pnpm db:migrate  # producción (con historial)
```

### 4. Ejecutar seed inicial

```bash
pnpm db:seed
```

Carga la institución **U.E. Privada Pío XII** con:
- Niveles INICIAL, PRIMARIA, SECUNDARIA y todos sus grados
- Campos y materias del currículo boliviano (Ley 070)
- Dimensiones: SER/DECIDIR (10 pts), SABER (45 pts), HACER (40 pts), AUTOEVALUACIÓN (5 pts)
- Gestión 2026 con 3 trimestres
- Usuarios de prueba con contraseña `EduSync2026#`

## Desarrollo

```bash
pnpm dev          # API + Web en paralelo
pnpm dev:api      # Solo API → http://localhost:4000
pnpm dev:web      # Solo Web → http://localhost:5173
pnpm db:studio    # Prisma Studio → http://localhost:5555
```

### Multi-tenant en desarrollo

El sistema detecta la institución por subdominio HTTP (`X-Tenant-Subdomain` header).
En desarrollo, configura el tenant en `apps/web/.env`:

```env
VITE_DEV_TENANT=pioxii
```

## Comandos útiles

```bash
pnpm build           # Build de producción (todos los paquetes)
pnpm type-check      # Verificación TypeScript en todos los paquetes
pnpm lint            # ESLint en todos los paquetes
pnpm test            # Tests unitarios (Vitest)
pnpm db:generate     # Regenerar cliente Prisma tras cambios en schema
pnpm db:push         # Sync schema → BD (desarrollo)
pnpm db:migrate      # Crear y aplicar migración (producción)
pnpm db:seed         # Seed inicial
pnpm db:reset        # Resetear BD y re-seedear (¡DESTRUCTIVO!)
```

## Arquitectura multi-tenant

Cada institución tiene un subdominio único (`pioxii.edusync.bo`). El flujo es:

1. El frontend lee el subdominio del hostname (o `VITE_DEV_TENANT` en dev) y lo envía como header `X-Tenant-Subdomain`.
2. El middleware `tenantMiddleware` resuelve el subdominio a un `institucion_id` y lo adjunta a `req.tenant`.
3. Todos los servicios filtran datos por `institucion_id`, garantizando aislamiento total entre tenants.

## Arquitectura de calificaciones (Ley 070)

```
Dimension (SER_DECIDIR, SABER, HACER, AUTOEVALUACION)
  └── Indicador (con trimestre_id opcional)
        └── NotaIndicador (estudiante_id + puntaje)
```

- Promedio por dimensión = media aritmética de sus indicadores con nota
- Total = suma de promedios de dimensiones
- Escala: ED (≤50) | DA (51-68) | DO (69-84) | DP (85-100)

## Seguridad

- Todos los endpoints (excepto `/api/v1/auth/*`) requieren JWT válido de Supabase Auth
- El token se verifica con `SUPABASE_JWT_SECRET`
- `institucion_id` y `rol` se extraen del `app_metadata` del JWT
- El middleware `requireRol` protege rutas por rol
- CORS dinámico: permite `devOrigin` configurado + cualquier subdominio de `BASE_DOMAIN`
- Helmet activo en todos los entornos

## Tests

```bash
pnpm test                       # Todos los tests
pnpm --filter api test          # Solo tests de la API
pnpm --filter api test:watch    # Modo watch
```

Tests cubiertos: cálculo de escalas, promedios por dimensión, lógica de promoción.

## Guía de despliegue

Ver [DEPLOYMENT.md](./DEPLOYMENT.md) para instrucciones detalladas de despliegue en Railway (API) y Vercel (Web).

## Licencia

Privado — U.E. Privada Pío XII
