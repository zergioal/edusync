import { Navigate, Outlet } from 'react-router-dom'
import type { Rol } from '@edusync/types'
import { useAuth } from '../../context/AuthContext'
import { getRolDashboardPath } from '../../lib/roleRoutes'

interface RoleRouteProps {
  allowedRoles: Rol[]
}

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  if (!allowedRoles.includes(user.rol)) {
    return <Navigate to={getRolDashboardPath(user.rol)} replace />
  }

  return <Outlet />
}
