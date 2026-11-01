import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SelectMiCurso } from '../../../components/docente/SelectMiCurso'
import { SelectGestion } from '../../../components/select/SelectGestion'
import { Icon } from '../../../components/ui/Icon'
import { NominaTabla } from '../../../components/reportes/NominaTabla'

export default function NominaPage() {
  const [paraleloId, setParaleloId] = useState('')
  const [gestionId,  setGestionId]  = useState('')

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link to=".." className="text-sm font-medium text-fg-muted hover:text-fg transition-colors flex items-center gap-1">
          <Icon name="arrow-left" className="h-4 w-4" /> Reportes
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-fg">Nómina de Estudiantes</h1>
        <p className="text-sm text-fg-muted mt-0.5">
          Elige uno de tus cursos para generar la nómina. El rendimiento académico completo (promedio, áreas aprobadas/reprobadas) solo está disponible si eres el/la asesor(a) de ese curso.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectMiCurso value={paraleloId} onChange={setParaleloId} />
          <SelectGestion value={gestionId}  onChange={setGestionId} />
        </div>
      </div>

      <NominaTabla
        endpoint="/reportes/mi-nomina"
        gestionId={gestionId}
        paraleloId={paraleloId}
        listo={!!paraleloId && !!gestionId}
      />
    </div>
  )
}
