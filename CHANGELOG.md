# Changelog — EduSync

Todos los cambios notables del proyecto. Formato: [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

---

## [Unreleased]

### Pendiente
- Integración de pagos en línea (QR boliviano)
- App móvil (React Native / Expo)
- Notificaciones push (Firebase FCM)
- Módulo de biblioteca

---

## [0.8.0] — 2026-05

### Añadido
- **Tests unitarios (Vitest):** cobertura de cálculo de escalas (ED/DA/DO/DP), promedios por dimensión y lógica de promoción en `apps/api/src/tests/calculo.academico.test.ts`
- **Vista responsiva móvil:** sidebar como drawer en pantallas pequeñas, `PlanillaPage` con scroll horizontal, `TableResponsive` wrapper, modales 100 % ancho en mobile
- **Middleware multi-tenant:** `tenantMiddleware` resuelve subdominio → `institucion_id`; header `X-Tenant-Subdomain` enviado automáticamente desde el frontend; `getTenantHeaders()` en `api.ts`
- **ErrorBoundary React:** captura errores de render no manejados y muestra pantalla de error amigable con botón de recarga
- **EmptyState component:** componente reutilizable para estados vacíos en tablas y listados
- **Cache localStorage:** `lib/cache.ts` con `getCached / setCached / invalidateCache / invalidateCacheByPrefix`, TTL configurable, manejo silencioso de cuota excedida
- **Lazy loading:** todos los dashboards y páginas cargados con `React.lazy` + `Suspense` para reducir bundle inicial
- **Optimización planilla:** `PlanillaService.get()` ejecuta queries independientes en `Promise.all`, reduciendo latencia total
- **Producción env + CORS:** `.env.production.example` completo; CORS dinámico acepta cualquier subdominio de `BASE_DOMAIN` (regex) + `devOrigin` explícito

---

## [0.7.0] — 2026-04

### Añadido
- **Panel Director:** dashboard con KPIs, cierre de gestión académica, reportes de asistencia global, carga horaria docente, log de auditoría
- **Panel Regente:** dashboard, registro de asistencia diaria (por paralelo/fecha), reporte de inasistencias, envío de comunicados automáticos a padres
- **Módulo finanzas:** gestión de tarifas por nivel, registro de pensiones, estado de cuenta por estudiante, reporte de morosidad, notificación automática al padre/tutor al registrar pago
- **Módulo auditoría:** middleware `auditoriaMiddleware` que loguea POST/PUT/PATCH/DELETE exitosos con usuario, IP, recurso y payload; `AuditoriaPage` con filtros por acción, usuario y rango de fechas
- **Configuración institucional:** `ConfiguracionPage` para tipo de UE, turnos, horarios por nivel y carga horaria máxima docente
- **Comunicados de inasistencia:** generación y envío masivo desde panel Regente

---

## [0.6.0] — 2026-04

### Añadido
- **Comunicación interna completa:**
  - Anuncios con adjuntos (Admin/Docente → todos los roles del paralelo)
  - Tareas con fecha de entrega y estado de entrega por estudiante
  - Mensajes privados entre usuarios de la misma institución
  - Notificaciones en tiempo real (polling 30 s) con badge de campana
- **Panel Estudiante:** acceso a notas, boletines, tareas pendientes, mensajes y anuncios
- **Panel Padre/Tutor:** seguimiento de notas, asistencia y estado de cuenta de sus hijos vinculados
- **Gestión de documentos:** carga y descarga de archivos adjuntos en mensajes y tareas

---

## [0.5.0] — 2026-04

### Añadido
- **Módulo asistencia:**
  - `AsistenciaClase`: docente registra asistencia por materia/hora, con estado PRESENTE/FALTA/LICENCIA/TARDANZA
  - `AsistenciaDiaria`: regente registra asistencia general del establecimiento
  - Reportes de asistencia consolidada por trimestre, exportables a PDF
- **Boletines PDF:** generación con Puppeteer usando plantilla oficial boliviana; firma digital del director; descarga individual y masiva
- **ResultadoFinal y Promoción:** cálculo automático al cerrar trimestre; lógica de promoción por nivel (PROMOVIDO/REPROBADO/REPROBADO_CON_CARGO)

---

## [0.4.0] — 2026-04

### Añadido
- **Módulo secretaría:**
  - `EstudiantesPage` con búsqueda y filtros
  - `NuevoEstudianteModal` (stepper 3 pasos: datos personales → matrícula → documentos)
  - `PerfilEstudiantePage` con historial académico y estado de cuenta
- **Gestiones y trimestres:** CRUD completo; cierre de trimestre con validación de notas; apertura de siguiente período
- **Matrículas:** asignación estudiante ↔ paralelo ↔ gestión con control de duplicados
- **Panel Coordinador:** supervisión de planillas de todos los docentes de su nivel; aprobación de calificaciones

---

## [0.3.0] — 2026-04

### Añadido
- **Planilla de calificaciones (Docente):**
  - Tabla interactiva dimensiones × estudiantes con edición inline
  - Selector de trimestre para filtrar indicadores
  - Edición optimista con sincronización al servidor
  - Cálculo automático de promedios y escala (ED/DA/DO/DP) en tiempo real
  - Exportación a PDF del boletín por estudiante
- **Gestión de indicadores:** CRUD de dimensiones e indicadores por asignación y trimestre
- **`usePlanilla` hook:** abstracción de la lógica de estado y mutaciones de la planilla

---

## [0.2.0] — 2026-04

### Añadido
- **Dashboards por rol:** Admin, Docente, Estudiante, Padre, Coordinador, Director, Regente
- **Sidebar dinámico:** items de navegación configurados en `roleRoutes.ts` según rol activo
- **`DashboardLayout`:** layout compartido con header, sidebar y área de contenido
- **Módulo instituciones (Admin Sistema):** listar, crear, editar y activar/desactivar instituciones; asignación de subdominio
- **Seed completo:** todos los roles, niveles, materias, gestión 2026, contraseña `EduSync2026#`

---

## [0.1.0] — 2026-03

### Añadido
- Monorepo pnpm con workspaces: `apps/api`, `apps/web`, `packages/database`, `packages/types`, `packages/ui`
- Schema Prisma con ~40 entidades (Institucion, Usuario, Docente, Estudiante, Asignacion, Matricula, Nota, Asistencia, Pension, Mensaje, Notificacion, AuditoriaLog, etc.)
- Autenticación con Supabase Auth: login, logout, refresh, `AuthContext`, `ProtectedRoute`, `RoleRoute`
- Middleware `auth` verificando JWT con `SUPABASE_JWT_SECRET`; extracción de `institucion_id` y `rol` desde `app_metadata`
- CORS configurable, Helmet, Morgan
- Health check `GET /health`
