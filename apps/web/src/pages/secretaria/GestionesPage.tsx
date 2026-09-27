import { useState, useEffect, useRef } from 'react'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { Modal } from '../../components/ui/Modal'
import { Button, Badge, Spinner } from '@edusync/ui'

interface Trimestre {
  id:          string
  numero:      number
  fecha_inicio: string
  fecha_fin:   string
  cerrado:     boolean
}

interface Gestion {
  id:         string
  anno:       number
  activa:     boolean
  trimestres: Trimestre[]
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function toInputDate(iso: string) {
  return iso.slice(0, 10)
}

export default function GestionesPage() {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [gestiones, setGestiones] = useState<Gestion[]>([])
  const [loading,   setLoading]   = useState(true)
  const [newModal,  setNewModal]  = useState(false)
  const [newAnno,   setNewAnno]   = useState(String(new Date().getFullYear() + 1))
  const [saving,    setSaving]    = useState(false)

  // Edit trimestre
  const [editTrimestre, setEditTrimestre] = useState<Trimestre | null>(null)
  const [editDates,     setEditDates]     = useState({ fecha_inicio: '', fecha_fin: '' })
  const [editSaving,    setEditSaving]    = useState(false)

  // Cerrar trimestre
  const [cerrando, setCerrando] = useState<string | null>(null)
  const [observacionesModal, setObservacionesModal] = useState<
    { trimestre: Trimestre; anno: number; observaciones: string[] } | null
  >(null)

  const load = async () => {
    setLoading(true)
    try {
      setGestiones(await api.get<Gestion[]>('/gestiones'))
    } catch {
      toastRef.current.error('No se pudieron cargar las gestiones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreateGestion = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/gestiones', { anno: parseInt(newAnno) })
      toastRef.current.success(`Gestión ${newAnno} creada con sus 3 trimestres`)
      setNewModal(false)
      load()
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : 'Error al crear gestión')
    } finally {
      setSaving(false)
    }
  }

  const handleActivar = async (id: string, anno: number) => {
    if (!confirm(`¿Activar la Gestión ${anno}? Se desactivará la gestión actual.`)) return
    try {
      await api.patch(`/gestiones/${id}/activar`, {})
      toastRef.current.success(`Gestión ${anno} activada`)
      load()
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : 'Error al activar')
    }
  }

  const openEditTrimestre = (t: Trimestre) => {
    setEditTrimestre(t)
    setEditDates({ fecha_inicio: toInputDate(t.fecha_inicio), fecha_fin: toInputDate(t.fecha_fin) })
  }

  const handleEditTrimestre = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTrimestre) return
    setEditSaving(true)
    try {
      await api.put(`/trimestres/${editTrimestre.id}`, editDates)
      toastRef.current.success('Fechas del trimestre actualizadas')
      setEditTrimestre(null)
      load()
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : 'Error al actualizar')
    } finally {
      setEditSaving(false)
    }
  }

  const handleCerrar = async (t: Trimestre, anno: number) => {
    if (!confirm(`¿Cerrar el ${t.numero}° Trimestre ${anno}? Esta acción no se puede revertir.`)) return
    setCerrando(t.id)
    try {
      const result = await api.put<{ ok: boolean; observaciones?: string[] }>(`/trimestres/${t.id}/cerrar`, {})
      if (result.ok) {
        toastRef.current.success(`${t.numero}° Trimestre ${anno} cerrado`)
        load()
      } else {
        setObservacionesModal({ trimestre: t, anno, observaciones: result.observaciones ?? [] })
      }
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : 'Error al cerrar trimestre')
    } finally {
      setCerrando(null)
    }
  }

  const handleForzarCierre = async () => {
    if (!observacionesModal) return
    const { trimestre: t, anno, observaciones } = observacionesModal
    if (!confirm(
      `¿Forzar el cierre del ${t.numero}° Trimestre ${anno} pese a ${observaciones.length} observación(es)?\n\nEsta acción no se puede revertir.`
    )) return
    setCerrando(t.id)
    try {
      await api.put(`/trimestres/${t.id}/cerrar`, { forzar: true })
      toastRef.current.success(`${t.numero}° Trimestre ${anno} cerrado (forzado)`)
      setObservacionesModal(null)
      load()
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : 'Error al forzar el cierre')
    } finally {
      setCerrando(null)
    }
  }

  const descargarInformeObservaciones = () => {
    if (!observacionesModal) return
    const { trimestre: t, anno, observaciones } = observacionesModal
    const lineas = [
      `Informe de cierre — ${t.numero}° Trimestre ${anno}`,
      `Generado: ${new Date().toLocaleString('es-BO')}`,
      '',
      `Se encontraron ${observaciones.length} observación(es) que impiden el cierre normal:`,
      '',
      ...observaciones.map((o, i) => `${i + 1}. ${o}`),
    ]
    const blob = new Blob([lineas.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `informe_cierre_T${t.numero}_${anno}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">Gestión Académica</h1>
          <p className="text-sm text-fg-muted mt-0.5">Años escolares y trimestres</p>
        </div>
        <Button onClick={() => setNewModal(true)}>+ Nueva gestión</Button>
      </div>

      {gestiones.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border bg-surface p-12 text-center">
          <p className="text-fg-muted">No hay gestiones creadas.</p>
        </div>
      )}

      <div className="space-y-4">
        {gestiones.map(g => (
          <div key={g.id} className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
            {/* Gestión header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-bg">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-fg">Gestión {g.anno}</h2>
                {g.activa
                  ? <Badge variant="success">Activa</Badge>
                  : <Badge variant="default">Inactiva</Badge>}
              </div>
              {!g.activa && (
                <Button variant="ghost" size="sm" onClick={() => handleActivar(g.id, g.anno)}>
                  Activar
                </Button>
              )}
            </div>

            {/* Trimestres */}
            <div className="divide-y divide-border">
              {g.trimestres.map(t => (
                <div key={t.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-fg w-28">
                      {t.numero}° Trimestre
                    </span>
                    <span className="text-sm text-fg-muted">
                      {formatDate(t.fecha_inicio)} — {formatDate(t.fecha_fin)}
                    </span>
                    {t.cerrado
                      ? <Badge variant="danger">Cerrado</Badge>
                      : <Badge variant="success">Abierto</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    {!t.cerrado && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => openEditTrimestre(t)}>
                          Editar fechas
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          loading={cerrando === t.id}
                          onClick={() => handleCerrar(t, g.anno)}
                        >
                          Cerrar trimestre
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modal nueva gestión */}
      <Modal
        isOpen={newModal}
        onClose={() => setNewModal(false)}
        title="Nueva Gestión Académica"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setNewModal(false)} disabled={saving}>Cancelar</Button>
            <Button form="form-gestion" type="submit" loading={saving}>Crear gestión</Button>
          </div>
        }
      >
        <form id="form-gestion" onSubmit={handleCreateGestion} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-fg">Año de la gestión *</label>
            <input
              type="number"
              min={2020}
              max={2099}
              value={newAnno}
              onChange={e => setNewAnno(e.target.value)}
              required
              className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand w-32"
            />
          </div>
          <p className="text-sm text-fg-muted">
            Se crearán automáticamente 3 trimestres con fechas por defecto para el año {newAnno}.
          </p>
        </form>
      </Modal>

      {/* Modal editar trimestre */}
      <Modal
        isOpen={!!editTrimestre}
        onClose={() => setEditTrimestre(null)}
        title={`Editar ${editTrimestre?.numero}° Trimestre`}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setEditTrimestre(null)} disabled={editSaving}>Cancelar</Button>
            <Button form="form-trimestre" type="submit" loading={editSaving}>Guardar fechas</Button>
          </div>
        }
      >
        <form id="form-trimestre" onSubmit={handleEditTrimestre} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-fg">Fecha de inicio *</label>
            <input
              type="date"
              value={editDates.fecha_inicio}
              onChange={e => setEditDates(d => ({ ...d, fecha_inicio: e.target.value }))}
              required
              className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-fg">Fecha de cierre *</label>
            <input
              type="date"
              value={editDates.fecha_fin}
              onChange={e => setEditDates(d => ({ ...d, fecha_fin: e.target.value }))}
              required
              className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        </form>
      </Modal>

      {/* Modal observaciones al no poder cerrar el trimestre */}
      <Modal
        isOpen={!!observacionesModal}
        onClose={() => setObservacionesModal(null)}
        title={`No se pudo cerrar el ${observacionesModal?.trimestre.numero}° Trimestre ${observacionesModal?.anno ?? ''}`}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setObservacionesModal(null)}>Cancelar</Button>
            <Button variant="ghost" onClick={descargarInformeObservaciones}>Descargar informe (.txt)</Button>
            <Button variant="danger" loading={cerrando === observacionesModal?.trimestre.id} onClick={handleForzarCierre}>
              Forzar cierre
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-fg-muted">
            Se encontraron <strong>{observacionesModal?.observaciones.length ?? 0}</strong> observación(es) — asignaciones sin
            indicadores o notas registradas en este trimestre. Puedes descargar el detalle, corregirlas y volver a intentar el
            cierre normal, o forzar el cierre igualmente.
          </p>
          <ul className="max-h-64 space-y-1 overflow-y-auto rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-400">
            {observacionesModal?.observaciones.map((o, i) => <li key={i}>• {o}</li>)}
          </ul>
        </div>
      </Modal>
    </div>
  )
}
