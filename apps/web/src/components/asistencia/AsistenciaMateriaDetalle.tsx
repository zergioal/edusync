import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Spinner } from '@edusync/ui'

type Estado = 'PRESENTE' | 'AUSENTE' | 'TARDANZA' | 'LICENCIA'

const DIA_ABREV = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const MESES_NOMBRES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const ESTADO_CFG = {
  PRESENTE: { bg: 'bg-emerald-500', text: 'text-white', label: 'P', title: 'Presente' },
  AUSENTE:  { bg: 'bg-red-500',     text: 'text-white', label: 'F', title: 'Falta'    },
  TARDANZA: { bg: 'bg-amber-400',   text: 'text-white', label: 'A', title: 'Atraso'   },
  LICENCIA: { bg: 'bg-blue-400',    text: 'text-white', label: 'L', title: 'Licencia' },
} as const

function hoyStr() { return new Date().toISOString().slice(0, 10) }
function mesStr(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
function mesLabel(m: string) {
  const [y, mo] = m.split('-')
  return `${MESES_NOMBRES[parseInt(mo!) - 1]} ${y}`
}

interface Props {
  asignacionId:  string
  materiaNombre: string
  estudianteId?: string
  onClose:       () => void
}

/** Calendario mensual de asistencia de clase — misma vista del docente, de solo lectura y para un único estudiante. */
export function AsistenciaMateriaDetalle({ asignacionId, materiaNombre, estudianteId, onClose }: Props) {
  const [mes,     setMes]     = useState(mesStr(new Date()))
  const [records, setRecords] = useState<Record<string, Estado>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const path = estudianteId
      ? `/asistencia/clase/mensual/hijo/${estudianteId}?asignacion_id=${asignacionId}&mes=${mes}`
      : `/asistencia/clase/mensual/mia?asignacion_id=${asignacionId}&mes=${mes}`
    api.get<{ records: Record<string, Estado> }>(path)
      .then(d => setRecords(d.records))
      .catch(() => setRecords({}))
      .finally(() => setLoading(false))
  }, [asignacionId, estudianteId, mes])

  const [yearN, monthN] = mes.split('-').map(Number)
  const daysInMonth = new Date(yearN!, monthN!, 0).getDate()
  const schoolDays: string[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(yearN!, monthN! - 1, d).getDay()
    if (dow !== 0) schoolDays.push(`${mes}-${String(d).padStart(2, '0')}`)
  }
  const today = hoyStr()

  function navMes(delta: number) {
    const [y, m] = mes.split('-').map(Number)
    setMes(mesStr(new Date(y!, m! - 1 + delta, 1)))
  }

  const totals = schoolDays.reduce(
    (acc, fecha) => {
      const e = records[fecha]
      if (e === 'PRESENTE') acc.p++
      else if (e === 'AUSENTE') acc.f++
      else if (e === 'TARDANZA') acc.t++
      else if (e === 'LICENCIA') acc.l++
      return acc
    },
    { p: 0, f: 0, t: 0, l: 0 },
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Asistencia detallada</h2>
            <p className="text-sm text-gray-500">{materiaNombre}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            {(Object.entries(ESTADO_CFG) as [Estado, typeof ESTADO_CFG[Estado]][]).map(([, cfg]) => (
              <div key={cfg.label} className="flex items-center gap-1">
                <span className={`inline-flex w-5 h-5 rounded items-center justify-center text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
                  {cfg.label}
                </span>
                <span>{cfg.title}</span>
              </div>
            ))}
            <span className="text-gray-400">· = Sin registro</span>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <button onClick={() => navMes(-1)} className="px-3 py-1.5 text-gray-500 hover:bg-gray-50 text-lg leading-none">‹</button>
            <span className="px-3 py-1.5 text-sm font-semibold text-gray-700 min-w-[120px] text-center">{mesLabel(mes)}</span>
            <button
              onClick={() => navMes(1)}
              disabled={mes >= mesStr(new Date())}
              className="px-3 py-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-30 text-lg leading-none"
            >›</button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="text-xs border-collapse" style={{ minWidth: `${160 + schoolDays.length * 34}px` }}>
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200">
                  <th className="sticky left-0 z-10 bg-slate-50 px-4 py-2 text-left text-xs font-semibold text-gray-500 border-r border-gray-200 w-32 min-w-[8rem]">
                    Día
                  </th>
                  {schoolDays.map(fecha => {
                    const d     = parseInt(fecha.slice(8))
                    const dow   = new Date(fecha).getDay()
                    const isSat = dow === 6
                    const isFut = fecha > today
                    return (
                      <th key={fecha} className={`w-8 border-r border-gray-100 ${isSat ? 'bg-slate-100' : ''}`}>
                        <div className="py-1 px-0.5 flex flex-col items-center gap-0 mx-auto" style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}>
                          <span className={`font-bold ${isFut ? 'text-gray-300' : 'text-gray-700'}`}>{d}</span>
                          <span className={isFut ? 'text-gray-200' : 'text-gray-400'}>{DIA_ABREV[dow]}</span>
                        </div>
                      </th>
                    )
                  })}
                  <th className="border-l border-gray-200 bg-emerald-50 text-emerald-700 px-2 py-2 text-center">P</th>
                  <th className="border-l border-gray-100 bg-red-50    text-red-700    px-2 py-2 text-center">F</th>
                  <th className="border-l border-gray-100 bg-amber-50  text-amber-700  px-2 py-2 text-center">A</th>
                  <th className="border-l border-gray-100 bg-blue-50   text-blue-700   px-2 py-2 text-center">L</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="sticky left-0 z-10 bg-white px-4 py-2 font-medium text-gray-800 border-r border-gray-200">
                    Estado
                  </td>
                  {schoolDays.map(fecha => {
                    const isFut  = fecha > today
                    const isSat  = new Date(fecha).getDay() === 6
                    const estado = records[fecha]
                    const cfg    = estado ? ESTADO_CFG[estado] : null
                    return (
                      <td key={fecha} className={`w-8 h-9 text-center border-r border-gray-100 ${isSat ? 'bg-slate-100/50' : ''}`}>
                        {isFut ? (
                          <span className="text-gray-200 text-xs">·</span>
                        ) : cfg ? (
                          <span className={`inline-flex w-7 h-7 items-center justify-center rounded font-bold ${cfg.bg} ${cfg.text}`} title={cfg.title}>
                            {cfg.label}
                          </span>
                        ) : (
                          <span className="text-gray-300">·</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="text-center px-2 font-bold text-emerald-700 bg-emerald-50/60 border-l border-gray-200">{totals.p}</td>
                  <td className="text-center px-2 font-bold text-red-700     bg-red-50/60    border-l border-gray-100">{totals.f}</td>
                  <td className="text-center px-2 font-bold text-amber-700   bg-amber-50/60  border-l border-gray-100">{totals.t}</td>
                  <td className="text-center px-2 font-bold text-blue-700    bg-blue-50/60   border-l border-gray-100">{totals.l}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
