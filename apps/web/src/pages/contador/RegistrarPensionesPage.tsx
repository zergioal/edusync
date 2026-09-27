import { useState, useEffect, useCallback, useRef } from 'react'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { useGestionActiva } from '../../hooks/useGestionActiva'
import { SelectParalelo } from '../../components/select/SelectParalelo'
import { hoyLocalStr } from '../../lib/date'
import { BackButton } from '../../components/ui/BackButton'
import { Spinner } from '@edusync/ui'

interface EstFila {
  estudiante_id: string; nombre: string; apellido: string; becado: boolean; media_beca: boolean; pagado: boolean
}

const PENSIONES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11] // Febrero..Noviembre
const MES_NOMBRE: Record<number, string> = {
  2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio', 7: 'Julio',
  8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre',
}

export default function RegistrarPensionesPage() {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast
  const { id: gestionId } = useGestionActiva()

  const [paraleloId,  setParaleloId]  = useState('')
  const [mes,         setMes]         = useState<number | ''>('')
  const [fechaPago,   setFechaPago]   = useState(hoyLocalStr())
  const [lista,       setLista]       = useState<EstFila[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [saving,      setSaving]      = useState(false)

  // Cambios sin guardar por curso+pensión (clave `paraleloId:mes`) — si el usuario cambia de curso
  // por error antes de guardar, al volver encuentra su registro intacto en vez de tener que rehacerlo.
  // `dirtyRef` marca cuáles de esos cursos tienen cambios reales, para que "Guardar" los incluya a
  // todos aunque en ese momento no sea el curso que se está viendo.
  const cacheRef = useRef<Map<string, EstFila[]>>(new Map())
  const dirtyRef = useRef<Set<string>>(new Set())
  const cacheKey = (p: string, m: number | '') => `${p}:${m}`

  const cargar = useCallback(async () => {
    if (!paraleloId || !mes || !gestionId) { setLista([]); return }
    const k = cacheKey(paraleloId, mes)
    const cached = cacheRef.current.get(k)
    if (cached) { setLista(cached); return }
    setLoadingList(true)
    try {
      const data = await api.get<EstFila[]>(`/pensiones/grid?paralelo_id=${paraleloId}&gestion_id=${gestionId}&mes=${mes}`)
      cacheRef.current.set(k, data)
      setLista(data)
    } catch {
      toastRef.current.error('Error al cargar el curso')
    } finally {
      setLoadingList(false)
    }
  }, [paraleloId, mes, gestionId])

  useEffect(() => { cargar() }, [cargar])

  function toggle(estudianteId: string) {
    setLista(prev => {
      const next = prev.map(e => e.estudiante_id === estudianteId ? { ...e, pagado: !e.pagado } : e)
      const k = cacheKey(paraleloId, mes)
      cacheRef.current.set(k, next)
      dirtyRef.current.add(k)
      return next
    })
  }

  function marcarTodos(pagado: boolean) {
    setLista(prev => {
      const next = prev.map(e => e.becado ? e : { ...e, pagado })
      const k = cacheKey(paraleloId, mes)
      cacheRef.current.set(k, next)
      dirtyRef.current.add(k)
      return next
    })
  }

  /** Guarda todos los cursos con cambios pendientes, no solo el que se está viendo ahora mismo. */
  async function guardar() {
    if (!gestionId || dirtyRef.current.size === 0) return
    setSaving(true)
    const pendientes = [...dirtyRef.current]
    let totalPagadas = 0
    let totalAnuladas = 0
    let cursosConError = 0
    let ultimoError = ''
    try {
      for (const k of pendientes) {
        const [pId, mesStr] = k.split(':')
        const filaLista = cacheRef.current.get(k)
        if (!pId || !mesStr || !filaLista) { dirtyRef.current.delete(k); continue }
        try {
          const data = await api.post<{ pagadas: number; anuladas: number; sin_cambio: number }>('/pensiones/grid', {
            paralelo_id: pId, gestion_id: gestionId, mes: Number(mesStr),
            fecha_pago: fechaPago,
            pagos: filaLista.filter(e => !e.becado).map(e => ({ estudiante_id: e.estudiante_id, pagado: e.pagado })),
          })
          totalPagadas  += data.pagadas
          totalAnuladas += data.anuladas
          dirtyRef.current.delete(k)
          cacheRef.current.delete(k)
        } catch (err) {
          cursosConError++
          ultimoError = err instanceof ApiError ? err.message : 'Error al guardar'
        }
      }
      if (cursosConError === 0) {
        toast.success(
          `Guardado: ${totalPagadas} pago(s), ${totalAnuladas} anulación(es)` +
          (pendientes.length > 1 ? ` en ${pendientes.length} cursos` : '')
        )
      } else if (cursosConError === pendientes.length && pendientes.length === 1) {
        toast.error(ultimoError)
      } else {
        toast.error(`Se guardaron ${pendientes.length - cursosConError} de ${pendientes.length} curso(s) — reintenta los que fallaron`)
      }
      cargar()
    } finally {
      setSaving(false)
    }
  }

  const cursosPendientes = dirtyRef.current.size

  const pagadosCount = lista.filter(e => e.pagado).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <BackButton to="/dashboard/admin/finanzas" label="Pensiones" className="mb-2" />
        <h1 className="text-2xl font-bold text-fg">Registro rápido de pensiones</h1>
        <p className="text-sm text-fg-muted mt-0.5">
          Marca quién pagó, por curso — igual que la lista de asistencia. Sin comprobante; para eso usa el registro manual desde el estado de cuenta.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div className="min-w-[220px]">
          <SelectParalelo value={paraleloId} onChange={setParaleloId} label="Curso" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-fg">Pensión</label>
          <select
            value={mes}
            onChange={e => setMes(e.target.value ? Number(e.target.value) : '')}
            className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="">— Seleccionar —</option>
            {PENSIONES.map((m, i) => (
              <option key={m} value={m}>Pensión {i + 1} — {MES_NOMBRE[m]}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-fg">Fecha de pago</label>
          <input type="date" value={fechaPago} max={hoyLocalStr()} onChange={e => setFechaPago(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand" />
        </div>
        {lista.length > 0 && (
          <div className="flex items-end gap-2">
            <button onClick={() => marcarTodos(true)}
              className="rounded-lg border border-green-600 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-50 transition-colors">
              Marcar todos pagados
            </button>
            <button onClick={() => marcarTodos(false)}
              className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-fg-muted hover:bg-surface-2 transition-colors">
              Marcar todos pendientes
            </button>
          </div>
        )}
      </div>

      {/* Barra superior de la tabla: resumen + acción de guardar, justo encima de la columna Estado */}
      {lista.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="text-sm text-fg-muted">{pagadosCount} de {lista.length} pagado(s)</p>
            {cursosPendientes > 0 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                {cursosPendientes} curso{cursosPendientes !== 1 ? 's' : ''} con cambios sin guardar
              </span>
            )}
          </div>
          <button
            onClick={guardar}
            disabled={saving || cursosPendientes === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : cursosPendientes > 1 ? `Guardar todo (${cursosPendientes})` : 'Guardar'}
          </button>
        </div>
      )}

      {/* Lista */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        {!paraleloId || !mes ? (
          <div className="py-12 text-center text-sm text-fg-muted">Selecciona un curso y una pensión para comenzar</div>
        ) : loadingList ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : lista.length === 0 ? (
          <div className="py-12 text-center text-sm text-fg-muted">No hay estudiantes activos en este curso</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg text-left text-xs font-semibold uppercase tracking-wide text-fg-muted">
                <th className="px-5 py-3 w-10">#</th>
                <th className="px-5 py-3">Estudiante</th>
                <th className="px-5 py-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.map((est, idx) => (
                <tr key={est.estudiante_id} className="hover:bg-surface-2 transition-colors">
                  <td className="px-5 py-3 text-fg-muted text-xs">{idx + 1}</td>
                  <td className="px-5 py-3 font-medium text-fg">
                    {est.apellido}, {est.nombre}
                    {est.media_beca && !est.becado && (
                      <span className="ml-2 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-600 align-middle">
                        MEDIA BECA
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {est.becado ? (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Becado</span>
                    ) : (
                      <button
                        onClick={() => toggle(est.estudiante_id)}
                        className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                          est.pagado ? 'bg-green-500 text-white' : 'border border-border text-fg-muted hover:border-gray-400'
                        }`}
                      >
                        {est.pagado ? 'Pagado' : 'Pendiente'}
                      </button>
                    )}
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
