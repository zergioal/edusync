import { Icon } from '../ui/Icon'

interface Props {
  estudiantes: Array<{ total: number | null }>
  className?: string
}

/** Resumen de aprobados/reprobados del trimestre actual, con aviso si reprueba más del 30%. */
export function ResumenAprobacion({ estudiantes, className = '' }: Props) {
  const conNota = estudiantes.filter(e => e.total != null)
  if (conNota.length === 0) return null

  const aprobados  = conNota.filter(e => e.total! > 50).length
  const reprobados = conNota.length - aprobados
  const pctAprobados  = Math.round((aprobados / conNota.length) * 100)
  const pctReprobados = Math.round((reprobados / conNota.length) * 100)
  const alerta = pctReprobados > 30

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Aprobados</p>
          <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">
            {aprobados} <span className="text-sm font-medium">({pctAprobados}%)</span>
          </p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900 dark:bg-rose-950/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-400">Reprobados</p>
          <p className="text-2xl font-bold text-rose-800 dark:text-rose-300">
            {reprobados} <span className="text-sm font-medium">({pctReprobados}%)</span>
          </p>
        </div>
      </div>
      <p className="text-xs text-fg-muted">{conNota.length} de {estudiantes.length} estudiante{estudiantes.length !== 1 ? 's' : ''} con nota registrada en este trimestre.</p>
      {alerta && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          <Icon name="alert-triangle" className="h-4 w-4 flex-shrink-0" />
          Más del 30% de los estudiantes está reprobando este trimestre ({pctReprobados}%).
        </div>
      )}
    </div>
  )
}
