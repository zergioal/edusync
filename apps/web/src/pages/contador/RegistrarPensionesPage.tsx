import { useState, useEffect, useCallback, useRef } from 'react'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { useGestionActiva } from '../../hooks/useGestionActiva'
import { SelectParalelo } from '../../components/select/SelectParalelo'
import { Spinner, Button } from '@edusync/ui'

interface EstFila {
  estudiante_id: string; nombre: string; apellido: string; becado: boolean; pagado: boolean
}

const PENSIONES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11] // Febrero..Noviembre
const MES_NOMBRE: Record<number, string> = {
  2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio', 7: 'Julio',
  8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre',
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function RegistrarPensionesPage() {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast
  const { id: gestionId } = useGestionActiva()

  const [paraleloId,  setParaleloId]  = useState('')
  const [mes,         setMes]         = useState<number | ''>('')
  const [fechaPago,   setFechaPago]   = useState(hoy())
  const [comprobante, setComprobante] = useState('')
  const [lista,       setLista]       = useState<EstFila[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [saving,      setSaving]      = useState(false)

  const cargar = useCallback(async () => {
    if (!paraleloId || !mes || !gestionId) { setLista([]); return }
    setLoadingList(true)
    try {
      const data = await api.get<EstFila[]>(`/pensiones/grid?paralelo_id=${paraleloId}&gestion_id=${gestionId}&mes=${mes}`)
      setLista(data)
    } catch {
      toastRef.current.error('Error al cargar el curso')
    } finally {
      setLoadingList(false)
    }
  }, [paraleloId, mes, gestionId])

  useEffect(() => { cargar() }, [cargar])

  function toggle(estudianteId: string) {
    const est = lista.find(e => e.estudiante_id === estudianteId)
    if (est?.pagado && !confirm(
      `¿Marcar como pendiente el pago de ${est.apellido}, ${est.nombre}?\n\nSi la pensión ya está vencida, el estudiante volverá a quedar bloqueado del sistema académico.`
    )) return
    setLista(prev => prev.map(e => e.estudiante_id === estudianteId ? { ...e, pagado: !e.pagado } : e))
  }

  function marcarTodos(pagado: boolean) {
    if (!pagado) {
      const pagados = lista.filter(e => !e.becado && e.pagado)
      if (pagados.length > 0 && !confirm(
        `¿Marcar como pendientes ${pagados.length} pago(s) ya registrados?\n\nLos estudiantes cuya pensión ya esté vencida volverán a quedar bloqueados del sistema académico.`
      )) return
    }
    setLista(prev => prev.map(e => e.becado ? e : { ...e, pagado }))
  }

  async function guardar() {
    if (!paraleloId || !mes || !gestionId || lista.length === 0) return
    if (!comprobante.trim()) { toast.error('Ingresa el número de comprobante'); return }
    setSaving(true)
    try {
      const data = await api.post<{ pagadas: number; anuladas: number; sin_cambio: number }>('/pensiones/grid', {
        paralelo_id: paraleloId, gestion_id: gestionId, mes,
        fecha_pago: fechaPago, comprobante: comprobante.trim(),
        pagos: lista.filter(e => !e.becado).map(e => ({ estudiante_id: e.estudiante_id, pagado: e.pagado })),
      })
      toast.success(`Guardado: ${data.pagadas} pago(s), ${data.anuladas} anulación(es)`)
      cargar()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const pagadosCount = lista.filter(e => e.pagado).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fg">Registrar Pensiones</h1>
          <p className="text-sm text-fg-muted mt-0.5">Marca quién pagó, por curso — igual que la lista de asistencia.</p>
        </div>
        <Button onClick={guardar} loading={saving} disabled={lista.length === 0 || !paraleloId || !mes}>
          Guardar
        </Button>
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
          <input type="date" value={fechaPago} max={hoy()} onChange={e => setFechaPago(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-fg">N° de comprobante</label>
          <input type="text" value={comprobante} onChange={e => setComprobante(e.target.value)}
            placeholder="Ej: 001234"
            className="rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand w-40" />
          <span className="text-xs text-fg-muted">Aplica a todos los que marques como pagados ahora.</span>
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

      {lista.length > 0 && (
        <p className="text-sm text-fg-muted">{pagadosCount} de {lista.length} pagado(s)</p>
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
                  <td className="px-5 py-3 font-medium text-fg">{est.apellido}, {est.nombre}</td>
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
