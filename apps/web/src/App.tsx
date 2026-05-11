import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { RoleRoute } from './components/layout/RoleRoute'
import { RoleRedirect } from './components/layout/RoleRedirect'
import { Rol } from '@edusync/types'
import { Spinner } from '@edusync/ui'

// Lazy-loaded dashboards — cada uno tiene sus propias sub-rutas
const LoginPage            = lazy(() => import('./pages/LoginPage'))
const AdminDashboard       = lazy(() => import('./pages/dashboard/AdminDashboard'))
const CoordinadorDashboard = lazy(() => import('./pages/dashboard/CoordinadorDashboard'))
const DocenteDashboard     = lazy(() => import('./pages/dashboard/DocenteDashboard'))
const EstudianteDashboard  = lazy(() => import('./pages/dashboard/EstudianteDashboard'))
const PadreDashboard       = lazy(() => import('./pages/dashboard/PadreDashboard'))
const RegenteDashboard     = lazy(() => import('./pages/dashboard/RegenteDashboard'))
const DirectorDashboard    = lazy(() => import('./pages/dashboard/DirectorDashboard'))
const NotFoundPage         = lazy(() => import('./pages/NotFoundPage'))

const PublicHomePage = lazy(() => import('./pages/public/HomePage'))
const GaleriaPage    = lazy(() => import('./pages/public/GaleriaPage'))
const AnunciosPage   = lazy(() => import('./pages/public/AnunciosPage'))

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Spinner />
    </div>
  )
}

const STAFF = [Rol.ADMIN_SISTEMA, Rol.SECRETARIA, Rol.CONTADOR]

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ── Portal público ─────────────────────────────────────── */}
          <Route path="/"         element={<PublicHomePage />} />
          <Route path="/galeria"  element={<GaleriaPage />} />
          <Route path="/anuncios" element={<AnunciosPage />} />
          <Route path="/login"    element={<LoginPage />} />

          {/* ── Rutas protegidas ───────────────────────────────────── */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<RoleRedirect />} />

            <Route element={<RoleRoute allowedRoles={STAFF} />}>
              <Route path="/dashboard/admin/*" element={<AdminDashboard />} />
            </Route>

            <Route element={<RoleRoute allowedRoles={[Rol.COORDINADOR]} />}>
              <Route path="/dashboard/coordinador/*" element={<CoordinadorDashboard />} />
            </Route>

            <Route element={<RoleRoute allowedRoles={[Rol.DOCENTE]} />}>
              <Route path="/dashboard/docente/*" element={<DocenteDashboard />} />
            </Route>

            <Route element={<RoleRoute allowedRoles={[Rol.ESTUDIANTE]} />}>
              <Route path="/dashboard/estudiante/*" element={<EstudianteDashboard />} />
            </Route>

            <Route element={<RoleRoute allowedRoles={[Rol.PADRE_TUTOR]} />}>
              <Route path="/dashboard/padre/*" element={<PadreDashboard />} />
            </Route>

            <Route element={<RoleRoute allowedRoles={[Rol.REGENTE]} />}>
              <Route path="/dashboard/regente/*" element={<RegenteDashboard />} />
            </Route>

            <Route element={<RoleRoute allowedRoles={[Rol.DIRECTOR]} />}>
              <Route path="/dashboard/director/*" element={<DirectorDashboard />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}
