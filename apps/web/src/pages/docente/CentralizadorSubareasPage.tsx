import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { CentralizadorSubareasTabla } from '../../components/planilla/CentralizadorSubareasTabla'

export default function CentralizadorSubareasPage() {
  const { asignacion_id } = useParams<{ asignacion_id: string }>()
  const [searchParams] = useSearchParams()
  const trimestre_id = searchParams.get('trimestre_id') ?? ''
  const navigate = useNavigate()

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-sm text-brand hover:underline">← Volver al registro</button>
        <h1 className="text-xl font-bold text-fg">Subáreas del área</h1>
      </div>

      <CentralizadorSubareasTabla asignacionId={asignacion_id!} trimestreId={trimestre_id} />
    </div>
  )
}
