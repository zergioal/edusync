import { useParams, useNavigate } from 'react-router-dom'
import { CentralizadorAsignacionTabla } from '../../components/planilla/CentralizadorAsignacionTabla'

export default function CentralizadorAsignacionPage() {
  const { asignacion_id } = useParams<{ asignacion_id: string }>()
  const navigate = useNavigate()

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-sm text-brand hover:underline">← Volver al registro</button>
        <h1 className="text-xl font-bold text-fg">Centralizador anual de la materia</h1>
      </div>
      <CentralizadorAsignacionTabla asignacionId={asignacion_id!} />
    </div>
  )
}
