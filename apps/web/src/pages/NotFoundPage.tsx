import { useNavigate } from 'react-router-dom'
import { Button } from '@edusync/ui'
import { useAuth } from '../context/AuthContext'
import { getRolDashboardPath } from '../lib/roleRoutes'

export default function NotFoundPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleBack = () => {
    if (user) navigate(getRolDashboardPath(user.rol), { replace: true })
    else navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg">
      <p className="text-8xl font-black text-gray-200">404</p>
      <h1 className="text-xl font-semibold text-fg">Página no encontrada</h1>
      <p className="text-sm text-fg-muted">La ruta que buscas no existe en EduSync</p>
      <Button variant="secondary" onClick={handleBack}>
        Volver al inicio
      </Button>
    </div>
  )
}
