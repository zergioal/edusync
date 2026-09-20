import { useState, useEffect, useCallback, useRef } from 'react'
import { api, apiDownload, ApiError } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { Modal } from '../../components/ui/Modal'
import { Icon } from '../../components/ui/Icon'
import { Button, Spinner } from '@edusync/ui'

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface Periodo { numero: number; hora_inicio: string; hora_fin: string }

interface AsignacionOpcion {
  id:      string
  materia: { nombre: string; campo: string }
  paralelo: { id: string; letra: string; grado: { nombre: string; nivel: { nombre: string } } }
}

interface MiConfig { gestion: { id: string; anno: number }; periodos: Periodo[]; asignaciones: AsignacionOpcion[] }

interface Entrada {
  dia_semana: number
  periodo:    number
  materia:    { nombre: string }
  paralelo:   { letra: string; grado: { nombre: string } }
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function cellKey(dia: number, periodo: number) { return `${dia}-${periodo}` }

// ─── Modal de asignación de celda ──────────────────────────────────────────

function CeldaModal({
  dia, periodo, periodoInfo, asignaciones, actual, onClose, onAsignar, onVaciar,
}: {
  dia:          number
  periodo:      number
  periodoInfo:  Periodo | undefined
  asignaciones: AsignacionOpcion[]
  actual:       Entrada | undefined
  onClose:      () => void
  onAsignar:    (asignacion_id: string) => Promise<void>
  onVaciar:     () => Promise<void>
}) {
  const [busy, setBusy] = useState<string | null>(null)

  async function elegir(id: string) {
    setBusy(id)
    try { await onAsignar(id) } finally { setBusy(null) }
  }
  async function vaciar() {
    setBusy('__vaciar__')
    try { await onVaciar() } finally { setBusy(null) }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`${DIAS[dia - 1]} · Período ${periodo}${periodoInfo?.hora_inicio ? ` (${periodoInfo.hora_inicio}-${periodoInfo.hora_fin})` : ''}`}
      footer={
        <div className="flex justify-between">
          {actual ? (
            <Button variant="danger" size="sm" onClick={vaciar} loading={busy === '__vaciar__'} disabled={!!busy}>
              Dejar vacío
            </Button>
          ) : <span />}
          <Button variant="secondary" onClick={onClose} disabled={!!busy}>Cerrar</Button>
        </div>
      }
    >
      {asignaciones.length === 0 ? (
        <p className="text-sm text-fg-muted italic">No tienes materias asignadas todavía.</p>
      ) : (
        <div className="space-y-1.5">
          {asignaciones.map(a => {
            const seleccionada = actual?.materia.nombre === a.materia.nombre
              && actual?.paralelo.letra === a.paralelo.letra
              && actual?.paralelo.grado.nombre === a.paralelo.grado.nombre
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => elegir(a.id)}
                disabled={!!busy}
                className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-lg border pl-4 pr-3 py-2.5 text-left text-sm transition-colors duration-150 disabled:opacity-60 ${
                  seleccionada
                    ? 'border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-fg'
                    : 'border-border bg-surface text-fg hover:bg-surface-2'
                }`}
              >
                <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-4 w-1 rounded-r-full bg-indigo-500 transition-opacity duration-150 ${seleccionada ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`} />
                <div className="flex-1">
                  <p className="font-medium text-fg">{a.materia.nombre}</p>
                  <p className="text-xs text-fg-muted">
                    {a.paralelo.grado.nivel.nombre} · {a.paralelo.grado.nombre} "{a.paralelo.letra}"
                  </p>
                </div>
                {busy === a.id && <Spinner />}
              </button>
            )
          })}
        </div>
      )}
    </Modal>
  )
}

// ─── Página principal ───────────────────────────────────────────────────────

export default function MiHorarioPage() {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [config,  setConfig]  = useState<MiConfig | null>(null)
  const [mapa,    setMapa]    = useState<Map<string, Entrada>>(new Map())
  const [loading, setLoading] = useState(true)
  const [celda,   setCelda]   = useState<{ dia: number; periodo: number } | null>(null)
  const [downloading, setDownloading] = useState<'pdf' | 'excel' | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [cfg, entradas] = await Promise.all([
        api.get<MiConfig>('/horarios/mi-config'),
        api.get<Entrada[]>('/horarios/mio'),
      ])
      setConfig(cfg)
      setMapa(new Map(entradas.map(e => [cellKey(e.dia_semana, e.periodo), e])))
    } catch {
      toastRef.current.error('No se pudo cargar tu horario')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function asignarCelda(dia: number, periodo: number, asignacion_id: string) {
    try {
      const entrada = await api.put<Entrada>('/horarios/celda', { dia_semana: dia, periodo, asignacion_id })
      setMapa(prev => new Map(prev).set(cellKey(dia, periodo), entrada))
      toast.success('Horario guardado')
      setCelda(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al guardar')
    }
  }

  async function vaciarCelda(dia: number, periodo: number) {
    try {
      await api.delete(`/horarios/celda?dia_semana=${dia}&periodo=${periodo}`)
      setMapa(prev => { const next = new Map(prev); next.delete(cellKey(dia, periodo)); return next })
      toast.success('Celda vaciada')
      setCelda(null)
    } catch {
      toast.error('No se pudo vaciar la celda')
    }
  }

  async function descargar(tipo: 'pdf' | 'excel') {
    setDownloading(tipo)
    try {
      await apiDownload(`/horarios/mio/${tipo}`, `mi_horario.${tipo === 'pdf' ? 'pdf' : 'xlsx'}`)
    } catch {
      toast.error('Error al generar el archivo')
    } finally {
      setDownloading(null)
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  if (!config) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border bg-surface p-10 text-center text-sm text-fg-muted">
        No se pudo cargar tu horario. Verifica que exista una gestión activa.
      </div>
    )
  }

  const celdaActual = celda ? mapa.get(cellKey(celda.dia, celda.periodo)) : undefined
  const periodoInfo = celda ? config.periodos.find(p => p.numero === celda.periodo) : undefined

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-fg">Mi Horario</h1>
          <p className="text-sm text-fg-muted mt-0.5">
            Haz clic en una celda para asignar la materia y el curso de ese período. Se guarda automáticamente.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => descargar('excel')}
            disabled={!!downloading}
            className="group inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/60 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 transition-colors duration-150 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 disabled:opacity-50"
          >
            <Icon name="file-excel" className="h-4 w-4" />
            {downloading === 'excel' ? 'Generando…' : 'Excel'}
          </button>
          <button
            type="button"
            onClick={() => descargar('pdf')}
            disabled={!!downloading}
            className="group inline-flex items-center gap-1.5 rounded-lg border border-blue-600/60 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-400 transition-colors duration-150 hover:bg-blue-50 dark:hover:bg-blue-950/30 disabled:opacity-50"
          >
            <Icon name="file-pdf" className="h-4 w-4" />
            {downloading === 'pdf' ? 'Generando…' : 'PDF'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
        <table className="min-w-max text-sm border-collapse">
          <thead>
            <tr className="bg-bg">
              <th className="sticky left-0 z-10 bg-bg px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted border-b border-r border-border min-w-[110px]">
                Período
              </th>
              {DIAS.map(d => (
                <th key={d} className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-fg-muted border-b border-border min-w-[140px]">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {config.periodos.map(p => (
              <tr key={p.numero} className="hover:bg-surface-2/40">
                <td className="sticky left-0 bg-surface px-3 py-2 border-r border-border">
                  <p className="text-sm font-semibold text-fg">Período {p.numero}</p>
                  {p.hora_inicio && <p className="text-xs text-fg-muted">{p.hora_inicio} – {p.hora_fin}</p>}
                </td>
                {[1, 2, 3, 4, 5, 6].map(dia => {
                  const entrada = mapa.get(cellKey(dia, p.numero))
                  return (
                    <td key={dia} className="border-border p-1 align-top">
                      <button
                        type="button"
                        onClick={() => setCelda({ dia, periodo: p.numero })}
                        className={`flex h-16 w-full flex-col items-center justify-center gap-0.5 rounded-lg border px-1.5 py-1 text-center transition-colors duration-150 ${
                          entrada
                            ? 'border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20'
                            : 'border-dashed border-border text-fg-muted hover:bg-surface-2 hover:border-fg-muted'
                        }`}
                      >
                        {entrada ? (
                          <>
                            <span className="text-xs font-semibold text-fg leading-tight line-clamp-2">{entrada.materia.nombre}</span>
                            <span className="text-[10px] text-fg-muted leading-tight">{entrada.paralelo.grado.nombre} "{entrada.paralelo.letra}"</span>
                          </>
                        ) : (
                          <span className="text-lg leading-none">+</span>
                        )}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {celda && (
        <CeldaModal
          dia={celda.dia}
          periodo={celda.periodo}
          periodoInfo={periodoInfo}
          asignaciones={config.asignaciones}
          actual={celdaActual}
          onClose={() => setCelda(null)}
          onAsignar={id => asignarCelda(celda.dia, celda.periodo, id)}
          onVaciar={() => vaciarCelda(celda.dia, celda.periodo)}
        />
      )}
    </div>
  )
}
