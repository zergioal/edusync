import { useState, useEffect, type ReactNode } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { PensionBlockModal } from '../../components/ui/PensionBlockModal'

interface DiaAsistencia {
  fecha:  string
  estado: 'PRESENTE' | 'AUSENTE' | 'TARDANZA'
}

interface AsistenciaData {
  total_asistencias: number
  total_faltas:      number
  total_tardanzas:   number
  dias:              DiaAsistencia[]
}

interface Trimestre { id: string; numero: number; cerrado: boolean; gestion_id: string }

const DIAS_SEMANA = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const MESES_NOMBRES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function CalendarioMes({ year, month, diasMap }: {
  year:    number
  month:   number
  diasMap: Map<string, 'PRESENTE' | 'AUSENTE' | 'TARDANZA'>
}) {
  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: ReactNode[] = []

  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`e${i}`} />)
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr   = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const estado    = diasMap.get(dateStr)
    const dayOfWeek = new Date(year, month, day).getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    let inner = 'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium mx-auto'
    if (estado === 'PRESENTE')  inner += ' bg-green-500 text-white'
    else if (estado === 'AUSENTE')   inner += ' bg-red-500 text-white'
    else if (estado === 'TARDANZA')  inner += ' bg-orange-400 text-white'
    else if (isWeekend) inner += ' text-gray-300'
    else inner += ' text-gray-500'

    cells.push(
      <div key={day} title={estado ? `${dateStr}: ${estado}` : dateStr}>
        <div className={inner}>{day}</div>
      </div>
    )
  }

  return (
    <div>
      <div className="text-sm font-semibold text-gray-700 mb-2 text-center">{MESES_NOMBRES[month]}</div>
      <div className="grid grid-cols-7 gap-0.5">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="text-center text-xs text-gray-400 font-medium pb-1">{d}</div>
        ))}
        {cells}
      </div>
    </div>
  )
}

interface Props { estudianteId?: string }

export default function MiAsistenciaPage({ estudianteId }: Props) {
  const { estadoFinanciero } = useAuth()
  const esSelfView = !estudianteId
  const [gestionId,   setGestionId]   = useState('')
  const [trimestres,  setTrimestres]  = useState<Trimestre[]>([])
  const [trimestreId, setTrimestreId] = useState('')
  const [data,        setData]        = useState<AsistenciaData | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  useEffect(() => {
    api.get<{ id: string; trimestres: Trimestre[] }>('/gestiones/activa')
      .then(g => {
        setGestionId(g.id)
        setTrimestres(g.trimestres)
        if (g.trimestres[0]) setTrimestreId(g.trimestres[0].id)
      }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!trimestreId) return
    setLoading(true); setError(null); setData(null)
    const path = estudianteId
      ? `/asistencia/hijo/${estudianteId}?trimestre_id=${trimestreId}`
      : `/asistencia/mia?trimestre_id=${trimestreId}`
    api.get<AsistenciaData>(path)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error al cargar'))
      .finally(() => setLoading(false))
  }, [trimestreId, estudianteId])

  // Group unique months from the data
  const meses = data
    ? [...new Set(data.dias.map(d => d.fecha.slice(0, 7)))].sort()
    : []

  const diasMap = new Map(data?.dias.map(d => [d.fecha, d.estado]) ?? [])

  if (esSelfView && estadoFinanciero?.bloqueado) {
    return (
      <PensionBlockModal
        deuda={estadoFinanciero.deuda_pendiente}
        qrUrl={estadoFinanciero.qr_pago_url ?? null}
        whatsapp={estadoFinanciero.whatsapp ?? null}
      />
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">
          {estudianteId ? 'Asistencia' : 'Mi Asistencia'}
        </h1>
        {trimestres.length > 0 && (
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {trimestres.map(t => (
              <button
                key={t.id}
                onClick={() => setTrimestreId(t.id)}
                className={`px-4 py-1.5 text-sm font-medium transition ${trimestreId === t.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                T{t.numero}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && <div className="p-10 text-center text-sm text-gray-400">Cargando…</div>}
      {error   && <div className="rounded-lg bg-orange-50 p-3 text-sm text-orange-700">{error}</div>}

      {data && (
        <div className="space-y-4">
          {/* Resumen numérico */}
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="rounded-xl bg-green-50 border border-green-100 p-4">
              <div className="text-2xl font-bold text-green-700">{data.total_asistencias}</div>
              <div className="text-green-600">Presentes</div>
            </div>
            <div className="rounded-xl bg-orange-50 border border-orange-100 p-4">
              <div className="text-2xl font-bold text-orange-600">{data.total_tardanzas}</div>
              <div className="text-orange-500">Tardanzas</div>
            </div>
            <div className="rounded-xl bg-red-50 border border-red-100 p-4">
              <div className="text-2xl font-bold text-red-600">{data.total_faltas}</div>
              <div className="text-red-500">Faltas</div>
            </div>
          </div>

          {/* Leyenda */}
          <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" />Presente</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" />Ausente</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block" />Tardanza</div>
          </div>

          {/* Calendarios por mes */}
          {meses.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
              No hay registros de asistencia para este trimestre.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {meses.map(mesKey => {
                const [yearStr, monthStr] = mesKey.split('-')
                const year  = parseInt(yearStr!)
                const month = parseInt(monthStr!) - 1
                return (
                  <div key={mesKey} className="rounded-xl border border-gray-200 bg-white p-4">
                    <CalendarioMes year={year} month={month} diasMap={diasMap} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
