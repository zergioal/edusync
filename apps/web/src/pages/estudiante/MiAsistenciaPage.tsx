import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { PensionBlockModal } from '../../components/ui/PensionBlockModal'

type Estado = 'PRESENTE' | 'AUSENTE' | 'TARDANZA' | 'LICENCIA'

interface DiaAsistencia {
  fecha:  string
  estado: Estado
}

interface DiariaSummary {
  total_asistencias: number
  total_faltas:      number
  total_tardanzas:   number
  total_licencias:   number
  dias:              DiaAsistencia[]
}

interface AsistenciaData {
  diaria:      DiariaSummary
  por_materia: unknown[]
}

interface Trimestre { id: string; numero: number; cerrado: boolean; gestion_id: string }

const DIA_ABREV = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const MESES_NOMBRES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const ESTADO_CFG = {
  PRESENTE:  { bg: 'bg-emerald-500', text: 'text-white', label: 'P', title: 'Presente'  },
  TARDANZA:  { bg: 'bg-amber-400',   text: 'text-white', label: 'T', title: 'Atraso'    },
  AUSENTE:   { bg: 'bg-red-500',     text: 'text-white', label: 'F', title: 'Falta'     },
  LICENCIA:  { bg: 'bg-blue-400',    text: 'text-white', label: 'L', title: 'Licencia'  },
} as const

// ─── Tabla de un mes ──────────────────────────────────────────────────────────

function TablaMes({ year, month, diasMap }: {
  year:    number
  month:   number
  diasMap: Map<string, Estado>
}) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Only Mon–Sat (dayOfWeek 1–6)
  const schoolDays: number[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month, d).getDay()
    if (dow !== 0) schoolDays.push(d)
  }

  let present = 0, tardanza = 0, falta = 0, licencia = 0
  for (const d of schoolDays) {
    const key    = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const estado = diasMap.get(key)
    if (estado === 'PRESENTE')  present++
    else if (estado === 'TARDANZA')  tardanza++
    else if (estado === 'AUSENTE')   falta++
    else if (estado === 'LICENCIA')  licencia++
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="text-sm border-collapse" style={{ minWidth: `${schoolDays.length * 36 + 180}px` }}>
        <thead>
          <tr className="bg-slate-50 border-b border-gray-200">
            {/* Nombre columna */}
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-36 border-r border-gray-200">
              Día
            </th>
            {/* Columnas de fechas */}
            {schoolDays.map(d => {
              const dow = new Date(year, month, d).getDay()
              const isSat = dow === 6
              return (
                <th
                  key={d}
                  className={`w-9 border-r border-gray-100 ${isSat ? 'bg-slate-100' : ''}`}
                >
                  <div
                    style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
                    className="py-1.5 px-1 text-[11px] font-medium text-gray-500 flex flex-col items-center gap-0 mx-auto w-fit"
                  >
                    <span className="font-bold text-gray-700">{d}</span>
                    <span className="text-gray-400">{DIA_ABREV[dow]}</span>
                  </div>
                </th>
              )
            })}
            {/* Totales */}
            {([
              { key: 'P', label: 'Pres.',  cls: 'text-emerald-700 bg-emerald-50', val: present  },
              { key: 'T', label: 'Atraso', cls: 'text-amber-700   bg-amber-50',   val: tardanza  },
              { key: 'F', label: 'Faltas', cls: 'text-red-700     bg-red-50',     val: falta     },
              { key: 'L', label: 'Licen.', cls: 'text-blue-700    bg-blue-50',    val: licencia  },
            ] as const).map(col => (
              <th key={col.key} className={`text-center px-2 py-2 text-xs font-bold border-l border-gray-200 ${col.cls}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="hover:bg-slate-50/50">
            <td className="px-4 py-2 font-medium text-gray-700 border-r border-gray-200 text-sm whitespace-nowrap">
              {MESES_NOMBRES[month]}
            </td>
            {schoolDays.map(d => {
              const key    = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
              const estado = diasMap.get(key)
              const cfg    = estado ? ESTADO_CFG[estado] : null
              const isSat  = new Date(year, month, d).getDay() === 6
              const isToday = key === new Date().toISOString().slice(0, 10)
              return (
                <td
                  key={d}
                  className={`w-9 h-9 text-center border-r border-gray-100 relative
                    ${isSat ? 'bg-slate-50' : ''}
                    ${isToday ? 'ring-1 ring-inset ring-indigo-400' : ''}
                  `}
                  title={cfg ? `${key}: ${cfg.title}` : key}
                >
                  {cfg ? (
                    <span className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>
                      {cfg.label}
                    </span>
                  ) : (
                    <span className="text-gray-200 text-xs">·</span>
                  )}
                </td>
              )
            })}
            {/* Totales */}
            <td className="text-center px-2 font-bold text-emerald-700 bg-emerald-50 border-l border-gray-200">{present}</td>
            <td className="text-center px-2 font-bold text-amber-700   bg-amber-50  border-l border-gray-100">{tardanza}</td>
            <td className="text-center px-2 font-bold text-red-700     bg-red-50    border-l border-gray-100">{falta}</td>
            <td className="text-center px-2 font-bold text-blue-700    bg-blue-50   border-l border-gray-100">{licencia}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

interface Props { estudianteId?: string }

export default function MiAsistenciaPage({ estudianteId }: Props) {
  const { estadoFinanciero } = useAuth()
  const esSelfView = !estudianteId

  const [trimestres,    setTrimestres]    = useState<Trimestre[]>([])
  const [trimestreId,   setTrimestreId]   = useState('')
  const [data,          setData]          = useState<AsistenciaData | null>(null)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>('')

  useEffect(() => {
    api.get<{ id: string; trimestres: Trimestre[] }>('/gestiones/activa')
      .then(g => {
        setTrimestres(g.trimestres)
        const activo = g.trimestres.find(t => !t.cerrado) ?? g.trimestres[g.trimestres.length - 1]
        if (activo) setTrimestreId(activo.id)
      }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!trimestreId) return
    setLoading(true); setError(null); setData(null); setSelectedMonth('')
    const path = estudianteId
      ? `/asistencia/hijo/${estudianteId}?trimestre_id=${trimestreId}`
      : `/asistencia/mia?trimestre_id=${trimestreId}`
    api.get<AsistenciaData>(path)
      .then(d => {
        setData(d)
        const meses = [...new Set(d.diaria.dias.map(x => x.fecha.slice(0, 7)))].sort()
        if (meses.length > 0) setSelectedMonth(meses[meses.length - 1]!)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error al cargar'))
      .finally(() => setLoading(false))
  }, [trimestreId, estudianteId])

  if (esSelfView && estadoFinanciero?.bloqueado) {
    return (
      <PensionBlockModal
        deuda={estadoFinanciero.deuda_pendiente}
        qrUrl={estadoFinanciero.qr_pago_url ?? null}
        whatsapp={estadoFinanciero.whatsapp ?? null}
      />
    )
  }

  const meses = data
    ? [...new Set(data.diaria.dias.map(d => d.fecha.slice(0, 7)))].sort()
    : []

  const diasMap = new Map(data?.diaria.dias.map(d => [d.fecha, d.estado]) ?? [])

  const totalPresente  = data?.diaria.total_asistencias ?? 0
  const totalTardanza  = data?.diaria.total_tardanzas   ?? 0
  const totalFalta     = data?.diaria.total_faltas      ?? 0
  const totalLicencia  = data?.diaria.total_licencias   ?? 0

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {estudianteId ? 'Asistencia' : 'Mi Asistencia'}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Registro mensual de lunes a sábado</p>
        </div>

        {/* Selector de trimestre */}
        {trimestres.length > 0 && (
          <div className="flex rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            {trimestres.map(t => (
              <button
                key={t.id}
                onClick={() => setTrimestreId(t.id)}
                className={`px-4 py-1.5 text-sm font-medium transition ${
                  trimestreId === t.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                T{t.numero}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && <div className="py-10 text-center text-sm text-gray-400">Cargando…</div>}
      {error   && <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-sm text-orange-700">{error}</div>}

      {data && (
        <div className="space-y-4">

          {/* Resumen totales */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Presentes', val: totalPresente, bg: 'bg-emerald-50 border-emerald-200', num: 'text-emerald-700', txt: 'text-emerald-600' },
              { label: 'Atrasos',   val: totalTardanza, bg: 'bg-amber-50   border-amber-200',   num: 'text-amber-700',   txt: 'text-amber-600'   },
              { label: 'Faltas',    val: totalFalta,    bg: 'bg-red-50     border-red-200',     num: 'text-red-700',     txt: 'text-red-600'     },
              { label: 'Licencias', val: totalLicencia,  bg: 'bg-blue-50    border-blue-200',    num: 'text-blue-700',    txt: 'text-blue-600'    },
            ].map(item => (
              <div key={item.label} className={`rounded-xl border p-4 text-center ${item.bg}`}>
                <div className={`text-2xl font-bold ${item.num}`}>{item.val}</div>
                <div className={`text-sm ${item.txt}`}>{item.label}</div>
              </div>
            ))}
          </div>

          {/* Leyenda */}
          <div className="flex items-center flex-wrap gap-3 text-xs text-gray-500">
            <span className="font-medium text-gray-600">Leyenda:</span>
            {Object.entries(ESTADO_CFG).map(([, cfg]) => (
              <div key={cfg.label} className="flex items-center gap-1.5">
                <span className={`inline-flex w-5 h-5 items-center justify-center rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
                  {cfg.label}
                </span>
                <span>{cfg.title}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="inline-flex w-5 h-5 items-center justify-center rounded-full text-[10px] text-gray-300 border border-gray-200">·</span>
              <span>Sin registro</span>
            </div>
          </div>

          {/* Selector de mes */}
          {meses.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {meses.map(mesKey => {
                const [y, m] = mesKey.split('-')
                const label  = `${MESES_NOMBRES[parseInt(m!) - 1]} ${y}`
                return (
                  <button
                    key={mesKey}
                    onClick={() => setSelectedMonth(mesKey)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      selectedMonth === mesKey
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          )}

          {/* Tabla del mes seleccionado */}
          {selectedMonth ? (() => {
            const [yearStr, monthStr] = selectedMonth.split('-')
            const year  = parseInt(yearStr!)
            const month = parseInt(monthStr!) - 1
            return (
              <TablaMes key={selectedMonth} year={year} month={month} diasMap={diasMap} />
            )
          })() : meses.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
              No hay registros de asistencia para este trimestre.
            </div>
          ) : null}

        </div>
      )}
    </div>
  )
}
