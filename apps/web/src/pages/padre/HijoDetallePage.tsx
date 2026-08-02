import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Button } from '@edusync/ui'
import MisCalificacionesPage from '../estudiante/MisCalificacionesPage'
import MiAsistenciaPage from '../estudiante/MiAsistenciaPage'

type Tab = 'notas' | 'asistencia'

export default function HijoDetallePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { estadoFinanciero } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const hijo = estadoFinanciero?.hijos.find(h => h.id === id)
  const tab  = (searchParams.get('tab') as Tab) === 'asistencia' ? 'asistencia' : 'notas'
  const setTab = (t: Tab) => setSearchParams({ tab: t }, { replace: true })

  if (!id || !hijo) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
        No se encontró ese hijo en tu cuenta.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/padre/hijos')}>← Volver</Button>
        <h1 className="text-2xl font-bold text-gray-900">{hijo.apellido}, {hijo.nombre}</h1>
      </div>

      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {([
          { key: 'notas' as const,      label: 'Notas' },
          { key: 'asistencia' as const, label: 'Asistencia' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'notas'      && <MisCalificacionesPage estudianteId={id} />}
      {tab === 'asistencia' && <MiAsistenciaPage       estudianteId={id} />}
    </div>
  )
}
