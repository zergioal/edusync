import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getRolDashboardPath } from '../../lib/roleRoutes'

export function RoleRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={getRolDashboardPath(user.rol)} replace />
}
