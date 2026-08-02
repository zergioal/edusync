import type { DimensionPlanilla, EstudiantePlanilla } from '../../hooks/usePlanilla'

const DIM_HEADER_BG = ['bg-blue-600',   'bg-emerald-600',  'bg-amber-600',   'bg-purple-600' ]
const DIM_PROM_BG   = ['bg-blue-100',   'bg-emerald-100',  'bg-amber-100',   'bg-purple-100' ]
const DIM_PROM_TEXT = ['text-blue-800', 'text-emerald-800','text-amber-800', 'text-purple-800']

const INSTRUMENTO_LABELS: Record<string, string> = {
  OBSERVACION:        'Obs.',
  CUADERNO:           'Cuad.',
  EVALUACION_ESCRITA: 'Eval. Esc.',
  EVALUACION_ORAL:    'Eval. Oral',
  DEFENSA:            'Defensa',
  PIZARRA:            'Pizarra',
}

const ESCALA_COLORS: Record<string, string> = {
  ED: 'bg-red-100 text-red-700',
  DA: 'bg-yellow-100 text-yellow-700',
  DO: 'bg-blue-100 text-blue-700',
  DP: 'bg-green-100 text-green-700',
}

/** Planilla de una sola materia, filtrada a un único estudiante — de solo lectura. */
export function PlanillaMateriaDetalle({
  dimensiones, estudiante,
}: {
  dimensiones: DimensionPlanilla[]
  estudiante:  EstudiantePlanilla | null
}) {
  if (!estudiante) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
        Sin datos de calificación para esta materia todavía.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {dimensiones.map((dim, idx) => (
        <div key={dim.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className={`${DIM_HEADER_BG[idx] ?? 'bg-gray-600'} px-4 py-2 flex items-center justify-between`}>
            <span className="text-white text-sm font-bold">{dim.nombre}</span>
            <span className="text-white/70 text-xs">máx {dim.puntaje_max} pts</span>
          </div>

          <div className="divide-y divide-gray-50">
            {dim.indicadores.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400 italic">Sin indicadores</p>
            ) : dim.indicadores.map(ind => (
              <div key={ind.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{ind.nombre}</p>
                  <p className="text-xs text-gray-400">
                    {INSTRUMENTO_LABELS[ind.instrumento] ?? ind.instrumento}
                    {ind.fecha_aplicacion ? ` · ${ind.fecha_aplicacion.slice(0, 10)}` : ''}
                  </p>
                </div>
                <span className="flex h-9 w-14 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-800">
                  {estudiante.notas[ind.id] ?? '—'}
                </span>
              </div>
            ))}
          </div>

          {dim.indicadores.length > 0 && (
            <div className={`${DIM_PROM_BG[idx] ?? 'bg-gray-100'} px-4 py-2 flex items-center justify-between`}>
              <span className={`text-xs font-semibold ${DIM_PROM_TEXT[idx] ?? 'text-gray-700'}`}>
                Promedio {dim.nombre}
              </span>
              <span className={`text-sm font-bold ${DIM_PROM_TEXT[idx] ?? 'text-gray-700'}`}>
                {estudiante.promedios[dim.id] ?? '—'}
              </span>
            </div>
          )}
        </div>
      ))}

      <div className="rounded-xl border-2 border-gray-800 bg-gray-800 text-white p-4 flex items-center justify-between">
        <span className="font-semibold">Total</span>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold">{estudiante.total ?? '—'}</span>
          {estudiante.escala && (
            <span className={`rounded px-3 py-1 text-sm font-bold ${ESCALA_COLORS[estudiante.escala] ?? ''}`}>
              {estudiante.escala}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
