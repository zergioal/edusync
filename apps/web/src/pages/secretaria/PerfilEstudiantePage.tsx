import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { Button, Badge, Spinner } from '@edusync/ui'
import { SelectGestion } from '../../components/select/SelectGestion'
import { SelectTrimestre } from '../../components/select/SelectTrimestre'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Estudiante {
  id:      string
  codigo:  string
  nivel:   { nombre: string }
  usuario: { nombre: string; apellido: string; email: string; activo: boolean }
  matriculas: {
    id:       string
    gestion:  { id: string; anno: number; activa: boolean }
    paralelo: { letra: string; grado: { nombre: string; nivel: { nombre: string } } }
  }[]
  relaciones_padre: { padre: { nombre: string; apellido: string; email: string } }[]
}

type Tab = 'datos' | 'calificaciones' | 'asistencia' | 'pensiones'

// ─── Shared: Selector Gestion + Trimestre ─────────────────────────────────────

function GestionTrimestreSelector({
  gestionId, trimestreId,
  onGestion, onTrimestre,
}: {
  gestionId: string; trimestreId: string
  onGestion: (v: string) => void; onTrimestre: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-4 items-end rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <SelectGestion value={gestionId} onChange={v => { onGestion(v); onTrimestre('') }} label="Gestión" />
      <SelectTrimestre value={trimestreId} onChange={onTrimestre} gestionId={gestionId} label="Trimestre" />
    </div>
  )
}

// ─── Tab: Datos ───────────────────────────────────────────────────────────────

function DatosTab({ est }: { est: Estudiante }) {
  const matriculaActiva = est.matriculas.find(m => m.gestion.activa) ?? est.matriculas[0]
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xl font-bold text-gray-900">{est.usuario.apellido}, {est.usuario.nombre}</p>
            <p className="text-sm text-gray-500 mt-1">{est.usuario.email}</p>
          </div>
          <div className="text-right space-y-1">
            <span className="font-mono text-sm bg-gray-100 px-3 py-1 rounded text-gray-700 block">{est.codigo}</span>
            {est.usuario.activo
              ? <Badge variant="success">Activo</Badge>
              : <Badge variant="danger">Inactivo</Badge>}
          </div>
        </div>
        {matriculaActiva && (
          <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Nivel:</span>{' '}
              <span className="font-medium">{matriculaActiva.paralelo.grado.nivel.nombre}</span>
            </div>
            <div><span className="text-gray-500">Grado y Paralelo:</span>{' '}
              <span className="font-medium">{matriculaActiva.paralelo.grado.nombre} "{matriculaActiva.paralelo.letra}"</span>
            </div>
            <div><span className="text-gray-500">Gestión:</span>{' '}
              <span className="font-medium">{matriculaActiva.gestion.anno}</span>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">Tutores / Padres</h2>
        {est.relaciones_padre.length === 0
          ? <p className="text-sm text-gray-400 italic">Sin tutores registrados</p>
          : <div className="space-y-3">
              {est.relaciones_padre.map((rel, i) => (
                <div key={i} className="flex items-center gap-4 text-sm">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">
                    {rel.padre.nombre[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{rel.padre.apellido}, {rel.padre.nombre}</p>
                    <p className="text-gray-400">{rel.padre.email}</p>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">Historial de matrículas</h2>
        {est.matriculas.length === 0
          ? <p className="text-sm text-gray-400 italic">Sin matrículas</p>
          : <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="pb-2">Gestión</th><th className="pb-2">Grado</th>
                  <th className="pb-2">Paralelo</th><th className="pb-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {est.matriculas.map(m => (
                  <tr key={m.id}>
                    <td className="py-2 font-medium">{m.gestion.anno}</td>
                    <td className="py-2 text-gray-600">{m.paralelo.grado.nombre}</td>
                    <td className="py-2">{m.paralelo.letra}</td>
                    <td className="py-2">{m.gestion.activa
                      ? <Badge variant="success">Activa</Badge>
                      : <Badge variant="default">Finalizada</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>
    </div>
  )
}

// ─── Tab: Calificaciones ──────────────────────────────────────────────────────

interface MateriaBoletin {
  nombre: string; campo: string
  ser: number; saber: number; hacer: number; autoevaluacion: number
  total: number; escala: string
}
interface Boletin {
  tipo: 'REGULAR' | 'INICIAL'
  dimensiones?: { nombre: string; puntaje_max: number }[]
  materias?: MateriaBoletin[]
  materias_inicial?: { nombre: string; docente: string; observacion: string | null }[]
  promedio_general?: number
  escala_general?: string
}

function escalaColor(e: string) {
  if (e === 'ED') return 'bg-red-100 text-red-700'
  if (e === 'DA') return 'bg-orange-100 text-orange-700'
  if (e === 'DO') return 'bg-green-100 text-green-700'
  return 'bg-emerald-100 text-emerald-700'
}

function CalificacionesTab({ estudianteId }: { estudianteId: string }) {
  const [gestionId,    setGestionId]    = useState('')
  const [trimestreId,  setTrimestreId]  = useState('')
  const [boletin,      setBoletin]      = useState<Boletin | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')

  useEffect(() => {
    if (!trimestreId) { setBoletin(null); return }
    setLoading(true); setError('')
    api.get<Boletin>(`/boletines/${estudianteId}?trimestre_id=${trimestreId}`)
      .then(setBoletin)
      .catch(e => setError(e?.message ?? 'Error al cargar calificaciones'))
      .finally(() => setLoading(false))
  }, [estudianteId, trimestreId])

  return (
    <div className="space-y-4">
      <GestionTrimestreSelector
        gestionId={gestionId} trimestreId={trimestreId}
        onGestion={setGestionId} onTrimestre={setTrimestreId}
      />

      {!trimestreId && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400 shadow-sm">
          Selecciona una gestión y un trimestre para ver las calificaciones.
        </div>
      )}

      {loading && <div className="flex justify-center py-12"><Spinner /></div>}
      {error   && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {boletin && !loading && boletin.tipo === 'REGULAR' && boletin.materias && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Calificaciones por materia</span>
            {boletin.promedio_general !== undefined && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${escalaColor(boletin.escala_general ?? '')}`}>
                Promedio general: {boletin.promedio_general.toFixed(1)} — {boletin.escala_general}
              </span>
            )}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-100">
                <th className="px-5 py-3">Campo</th>
                <th className="px-5 py-3">Materia</th>
                {boletin.dimensiones?.map(d => (
                  <th key={d.nombre} className="px-3 py-3 text-center">{d.nombre}<br/><span className="font-normal normal-case">/{d.puntaje_max}</span></th>
                ))}
                <th className="px-3 py-3 text-center">Total</th>
                <th className="px-3 py-3 text-center">Escala</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {boletin.materias.map((m, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-5 py-2.5 text-gray-500 text-xs">{m.campo}</td>
                  <td className="px-5 py-2.5 font-medium text-gray-900">{m.nombre}</td>
                  <td className="px-3 py-2.5 text-center">{m.ser}</td>
                  <td className="px-3 py-2.5 text-center">{m.saber}</td>
                  <td className="px-3 py-2.5 text-center">{m.hacer}</td>
                  <td className="px-3 py-2.5 text-center">{m.autoevaluacion}</td>
                  <td className="px-3 py-2.5 text-center font-semibold">{m.total}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${escalaColor(m.escala)}`}>{m.escala}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {boletin && !loading && boletin.tipo === 'INICIAL' && boletin.materias_inicial && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-100">
                <th className="px-5 py-3">Área</th>
                <th className="px-5 py-3">Docente</th>
                <th className="px-5 py-3">Observación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {boletin.materias_inicial.map((m, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-5 py-2.5 font-medium">{m.nombre}</td>
                  <td className="px-5 py-2.5 text-gray-500">{m.docente}</td>
                  <td className="px-5 py-2.5 text-gray-600">{m.observacion ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Asistencia ──────────────────────────────────────────────────────────

interface AsistenciaConsolidada {
  diaria: {
    total_asistencias: number
    total_faltas:      number
    total_tardanzas:   number
    dias: Array<{ fecha: string; estado: string }>
  }
  por_materia: Array<{ materia: string; presentes: number; ausentes: number; tardanzas: number }>
}

function AsistenciaTab({ estudianteId }: { estudianteId: string }) {
  const [gestionId,   setGestionId]   = useState('')
  const [trimestreId, setTrimestreId] = useState('')
  const [data,        setData]        = useState<AsistenciaConsolidada | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  useEffect(() => {
    if (!trimestreId) { setData(null); return }
    setLoading(true); setError('')
    api.get<AsistenciaConsolidada>(`/asistencia/consolidada/${estudianteId}?trimestre_id=${trimestreId}`)
      .then(setData)
      .catch(e => setError(e?.message ?? 'Error al cargar asistencia'))
      .finally(() => setLoading(false))
  }, [estudianteId, trimestreId])

  const pct = (presentes: number, total: number) =>
    total > 0 ? `${Math.round((presentes / total) * 100)}%` : '—'

  return (
    <div className="space-y-4">
      <GestionTrimestreSelector
        gestionId={gestionId} trimestreId={trimestreId}
        onGestion={setGestionId} onTrimestre={setTrimestreId}
      />

      {!trimestreId && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400 shadow-sm">
          Selecciona una gestión y un trimestre para ver la asistencia.
        </div>
      )}

      {loading && <div className="flex justify-center py-12"><Spinner /></div>}
      {error   && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {data && !loading && (
        <div className="space-y-4">
          {/* Asistencia diaria */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">Asistencia diaria (regente)</h3>
            {(() => {
              const total = data.diaria.total_asistencias + data.diaria.total_faltas + data.diaria.total_tardanzas
              return (
                <div className="grid grid-cols-4 gap-4 text-center">
                  {[
                    { label: 'Presentes',  val: data.diaria.total_asistencias, color: 'text-green-600' },
                    { label: 'Ausentes',   val: data.diaria.total_faltas,       color: 'text-red-600'   },
                    { label: 'Tardanzas',  val: data.diaria.total_tardanzas,    color: 'text-amber-600' },
                    { label: 'Asistencia', val: pct(data.diaria.total_asistencias, total), color: 'text-blue-600' },
                  ].map(item => (
                    <div key={item.label} className="rounded-lg bg-gray-50 p-3">
                      <p className={`text-2xl font-bold ${item.color}`}>{item.val}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>

          {/* Asistencia por clase */}
          {data.por_materia.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-700">Asistencia por materia (clases)</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-100">
                    <th className="px-5 py-3">Materia</th>
                    <th className="px-3 py-3 text-center">Presentes</th>
                    <th className="px-3 py-3 text-center">Ausentes</th>
                    <th className="px-3 py-3 text-center">Tardanzas</th>
                    <th className="px-3 py-3 text-center">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.por_materia.map((c, i) => {
                    const tot = c.presentes + c.ausentes + c.tardanzas
                    const p   = pct(c.presentes, tot)
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-5 py-2.5 font-medium">{c.materia}</td>
                        <td className="px-3 py-2.5 text-center text-green-600">{c.presentes}</td>
                        <td className="px-3 py-2.5 text-center text-red-600">{c.ausentes}</td>
                        <td className="px-3 py-2.5 text-center text-amber-600">{c.tardanzas}</td>
                        <td className="px-3 py-2.5 text-center font-semibold">
                          <span className={tot > 0 && c.presentes / tot < 0.7 ? 'text-red-600' : 'text-gray-700'}>{p}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {data.por_materia.length === 0 && (
            <p className="text-sm text-gray-400 italic px-1">Sin registros de asistencia por clase en este trimestre.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Pensiones ───────────────────────────────────────────────────────────

const MES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

interface EstadoCuenta {
  becado?: boolean
  mensaje?: string
  meses: Array<{ id: string; mes: number; nombre_mes: string; monto: number; pagado: boolean; fecha_pago: string | null; dias_mora: number }>
  resumen: { total_pagado: number; total_pendiente: number; meses_pagados: number; meses_pendientes: number; al_dia: boolean }
  gestion?: { anno: number }
}

function PensionesTab({ estudianteId }: { estudianteId: string }) {
  const [data,    setData]    = useState<EstadoCuenta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    setLoading(true); setError('')
    api.get<EstadoCuenta>(`/pensiones/estado-cuenta/${estudianteId}`)
      .then(setData)
      .catch(e => setError(e?.message ?? 'Error al cargar pensiones'))
      .finally(() => setLoading(false))
  }, [estudianteId])

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>
  if (error)   return <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
  if (!data)   return null

  if (data.becado) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-sm font-semibold text-amber-700">Estudiante becado</p>
        <p className="text-sm text-amber-600 mt-1">{data.mensaje}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Meses pagados',   val: data.resumen.meses_pagados,   color: 'text-green-600' },
          { label: 'Meses pendientes', val: data.resumen.meses_pendientes, color: data.resumen.meses_pendientes > 0 ? 'text-red-600' : 'text-gray-600' },
          { label: 'Total pagado',    val: `Bs ${data.resumen.total_pagado.toFixed(2)}`,    color: 'text-green-600' },
          { label: 'Total pendiente', val: `Bs ${data.resumen.total_pendiente.toFixed(2)}`, color: data.resumen.total_pendiente > 0 ? 'text-red-600' : 'text-gray-600' },
        ].map(item => (
          <div key={item.label} className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 text-center">
            <p className={`text-xl font-bold ${item.color}`}>{item.val}</p>
            <p className="text-xs text-gray-500 mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Detalle */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            Pensiones {data.gestion ? `Gestión ${data.gestion.anno}` : ''}
          </span>
          <Badge variant={data.resumen.al_dia ? 'success' : 'danger'}>
            {data.resumen.al_dia ? 'Al día' : 'Con deuda'}
          </Badge>
        </div>
        {data.meses.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Sin pensiones generadas para esta gestión.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-100">
                <th className="px-5 py-3">Mes</th>
                <th className="px-5 py-3 text-right">Monto</th>
                <th className="px-5 py-3 text-center">Estado</th>
                <th className="px-5 py-3">Fecha pago</th>
                <th className="px-5 py-3 text-center">Mora (días)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.meses.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-5 py-2.5 font-medium">{p.nombre_mes || MES[(p.mes - 1)] || `Mes ${p.mes}`}</td>
                  <td className="px-5 py-2.5 text-right font-mono">Bs {p.monto.toFixed(2)}</td>
                  <td className="px-5 py-2.5 text-center">
                    <Badge variant={p.pagado ? 'success' : 'danger'}>{p.pagado ? 'Pagado' : 'Pendiente'}</Badge>
                  </td>
                  <td className="px-5 py-2.5 text-gray-500">
                    {p.fecha_pago ? new Date(p.fecha_pago).toLocaleDateString('es-BO') : '—'}
                  </td>
                  <td className="px-5 py-2.5 text-center">
                    {!p.pagado && p.dias_mora > 0
                      ? <span className="text-red-600 font-semibold">{p.dias_mora}</span>
                      : <span className="text-gray-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ALL_TABS: { key: Tab; label: string }[] = [
  { key: 'datos',          label: 'Datos' },
  { key: 'calificaciones', label: 'Calificaciones' },
  { key: 'asistencia',     label: 'Asistencia' },
  { key: 'pensiones',      label: 'Pensiones' },
]

export default function PerfilEstudiantePage({
  visibleTabs,
}: { visibleTabs?: Tab[] } = {}) {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const TABS = visibleTabs ? ALL_TABS.filter(t => visibleTabs.includes(t.key)) : ALL_TABS

  const rawTab   = (searchParams.get('tab') ?? TABS[0]?.key ?? 'datos') as Tab
  const tab      = TABS.some(t => t.key === rawTab) ? rawTab : (TABS[0]?.key ?? 'datos') as Tab
  const setTab   = (t: Tab) => setSearchParams({ tab: t }, { replace: true })

  const [est,     setEst]     = useState<Estudiante | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!id) return
    api.get<Estudiante>(`/estudiantes/${id}`)
      .then(setEst)
      .catch(() => setError('No se pudo cargar el perfil del estudiante'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>
  if (error || !est) return <div className="text-center py-16 text-red-500">{error || 'Estudiante no encontrado'}</div>

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>← Volver</Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {est.usuario.apellido}, {est.usuario.nombre}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5 font-mono">{est.codigo}</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as Tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'datos'          && <DatosTab         est={est} />}
      {tab === 'calificaciones' && <CalificacionesTab estudianteId={est.id} />}
      {tab === 'asistencia'     && <AsistenciaTab     estudianteId={est.id} />}
      {tab === 'pensiones'      && <PensionesTab       estudianteId={est.id} />}
    </div>
  )
}
