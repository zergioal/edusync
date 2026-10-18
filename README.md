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
2. El middleware `tenantMiddleware` resuelve el subdominio a un `institucion_id` y lo adjunta a `req.tenantId` — usado solo para decidir la institución de un login o de una pantalla pública (ver sección "Aislamiento multi-tenant" más abajo).
3. Una vez logueado, todos los servicios filtran datos por `req.auth.institucion_id` (resuelto server-side desde el token verificado), no por `req.tenantId`.

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

- Todos los endpoints (excepto `/api/v1/auth/*`, `/api/v1/setup/*` y `/api/v1/public/*`) requieren un token de Supabase Auth válido, verificado contra el propio Supabase (`apps/api/src/middlewares/auth.ts`)
- `req.auth.institucion_id` y `req.auth.rol` **no** salen de ningún claim del token ni de ningún header — se resuelven con una consulta a la base de datos (`prisma.usuario.findUnique`) a partir del id de usuario ya verificado por Supabase. El cliente no puede falsificarlos
- El middleware `requireRol` protege rutas por rol
- Rate-limiting en `/api/v1/auth/login` (6 intentos/15min) y en el resto de la API
- CORS dinámico: permite `devOrigin` configurado + cualquier subdominio de `BASE_DOMAIN`
- Helmet activo en todos los entornos

### Aislamiento multi-tenant

El header `X-Tenant-Subdomain` (o el subdominio del `Host`) **solo sirve para enrutar** — decide a qué institución corresponde un login o una pantalla pública, antes de que exista sesión. Una vez autenticado, ninguna consulta de datos usa ese header: todas filtran por `req.auth.institucion_id`, que sale de la base de datos como se explica arriba. Cambiar el header no permite ver datos de otra institución.

El riesgo real de este tipo de arquitectura no es el header, sino un patrón distinto: un servicio que resuelve un recurso por id (`findOne`, `update`, `pagar`, etc.) y se olvida de comparar su `institucion_id` contra el de quien hace el pedido — ahí sí se puede leer o modificar un registro de otra institución con solo conocer su UUID (IDOR). El patrón correcto, usado en todo el código, es resolver el recurso **y** verificar pertenencia en la misma consulta o inmediatamente después (ver `checkAccesoAsignacion.ts` para el caso de planilla/notas, o el helper `verificarParalelo`/`verificarAsignacion` en `asistencia.service.ts`). Antes de corregirlo, `estudiantes.service.ts`, `usuarios.service.ts`, `pensiones.service.ts` y `asistencia.service.ts` tenían varios métodos con este hueco — ver `CHANGELOG.md` (sección "Seguridad", Unreleased) para el detalle.

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
