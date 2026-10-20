import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { CentralizadorSubareasTabla } from '../../components/planilla/CentralizadorSubareasTabla'

/** Misma vista que CentralizadorSubareasPage (docente), pero para Admin/Director/
 *  Coordinador/Secretaría — se llega desde el Centralizador general (columna de un
 *  área con subáreas) o desde Registros (planilla de solo lectura de una subárea). */
export default function CentralizadorSubareasStaffPage() {
  const { asignacion_id } = useParams<{ asignacion_id: string }>()
  const [searchParams] = useSearchParams()
  const trimestre_id = searchParams.get('trimestre_id') ?? ''
  const navigate = useNavigate()

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-sm text-brand hover:underline">← Volver</button>
        <h1 className="text-xl font-bold text-fg">Centralizador de subáreas</h1>
      </div>

      <CentralizadorSubareasTabla asignacionId={asignacion_id!} trimestreId={trimestre_id} />
    </div>
  )
}
