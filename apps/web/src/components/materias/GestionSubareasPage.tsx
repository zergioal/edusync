import { useState, useEffect, useCallback, useRef } from 'react'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../ui/Toast'
import { Modal } from '../ui/Modal'
import { Button, Badge, Spinner } from '@edusync/ui'

interface Nivel { id: string; nombre: string }

interface Subarea {
  id:                      string
  nombre:                  string
  activa:                  boolean
  aplica_solo_desde_grado: number | null
  aplica_hasta_grado:      number | null
  horas_semanales:         number | null
  _count:                  { asignaciones: number }
}

interface MateriaPadre {
  id:                      string
  nombre:                  string
  campo:                   { nombre: string }
  solo_si_bth:             boolean
  tiene_subareas:          boolean
  aplica_solo_desde_grado: number | null
  aplica_hasta_grado:      number | null
  subareas:                Subarea[]
  _count:                  { asignaciones: number }
}

interface FormState {
  nombre:                  string
  aplica_solo_desde_grado: string
  aplica_hasta_grado:      string
  horas_semanales:         string
}

const EMPTY_FORM: FormState = { nombre: '', aplica_solo_desde_grado: '', aplica_hasta_grado: '', horas_semanales: '' }

/** Nombre base sin el sufijo " (Área Padre)" que el backend agrega automáticamente, para editar cómodamente. */
function stripSufijo(nombre: string, padreNombre: string): string {
  const sufijo = ` (${padreNombre})`
  return nombre.endsWith(sufijo) ? nombre.slice(0, -sufijo.length) : nombre
}

/** Gestión CRUD de subáreas de cualquier área — compartida entre Admin, Director y Coordinador. */
export function GestionSubareasPage() {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [niveles,  setNiveles]  = useState<Nivel[]>([])
  const [nivelId,  setNivelId]  = useState('')
  const [padres,   setPadres]   = useState<MateriaPadre[]>([])
  const [loading,  setLoading]  = useState(false)
  const [saving,   setSaving]   = useState(false)

  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; padre: MateriaPadre; subarea?: Subarea } | null>(null)
  const [form,  setForm]  = useState<FormState>(EMPTY_FORM)

  useEffect(() => {
    api.get<Nivel[]>('/niveles')
      .then(data => { setNiveles(data); if (data[0]) setNivelId(data[0].id) })
      .catch(() => toastRef.current.error('Error cargando niveles'))
  }, [])

  const load = useCallback(async (id: string) => {
    if (!id) return
    setLoading(true)
    try {
      setPadres(await api.get<MateriaPadre[]>(`/materias/admin?nivel_id=${id}`))
    } catch {
      toastRef.current.error('Error cargando materias')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(nivelId) }, [nivelId, load])

  const openCreate = (padre: MateriaPadre) => {
    if (padre.subareas.length === 0 && padre._count.asignaciones > 0) {
      const ok = confirm(
        `"${padre.nombre}" ya tiene ${padre._count.asignaciones} asignación(es) directa(s) registrada(s). ` +
        `Al crear su primera subárea, esas asignaciones dejarán de contar para la nota final — solo se ` +
        `promediarán las subáreas. ¿Continuar?`
      )
      if (!ok) return
    }
    setForm(EMPTY_FORM)
    setModal({ mode: 'create', padre })
  }

  const openEdit = (padre: MateriaPadre, subarea: Subarea) => {
    setForm({
      nombre:                  stripSufijo(subarea.nombre, padre.nombre),
      aplica_solo_desde_grado: subarea.aplica_solo_desde_grado?.toString() ?? '',
      aplica_hasta_grado:      subarea.aplica_hasta_grado?.toString() ?? '',
      horas_semanales:         subarea.horas_semanales?.toString() ?? '',
    })
    setModal({ mode: 'edit', padre, subarea })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modal || !form.nombre.trim()) return
    setSaving(true)
    try {
      const payload = {
        nombre:                  form.nombre.trim(),
        aplica_solo_desde_grado: form.aplica_solo_desde_grado ? parseInt(form.aplica_solo_desde_grado, 10) : null,
        aplica_hasta_grado:      form.aplica_hasta_grado ? parseInt(form.aplica_hasta_grado, 10) : null,
        horas_semanales:         form.horas_semanales ? parseInt(form.horas_semanales, 10) : null,
      }
      if (modal.mode === 'create') {
        await api.post('/materias', { ...payload, es_subarea_de_id: modal.padre.id })
        toastRef.current.success('Subárea creada correctamente')
      } else {
        await api.patch(`/materias/${modal.subarea!.id}`, payload)
        toastRef.current.success('Subárea actualizada')
      }
      setModal(null)
      load(nivelId)
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (subarea: Subarea) => {
    const msg = subarea._count.asignaciones > 0
      ? `"${subarea.nombre}" ya tiene ${subarea._count.asignaciones} asignación(es) registrada(s) — se desactivará en vez de eliminarse. ¿Continuar?`
      : `¿Eliminar "${subarea.nombre}"? Esta acción no se puede deshacer.`
    if (!confirm(msg)) return
    try {
      await api.delete(`/materias/${subarea.id}`)
      toastRef.current.success('Subárea eliminada')
      load(nivelId)
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : 'Error al eliminar')
    }
  }

  const previewNombre = modal ? `${form.nombre.trim() || '…'} (${modal.padre.nombre})` : ''

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        {niveles.map(n => (
          <button
            key={n.id}
            type="button"
            onClick={() => setNivelId(n.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              nivelId === n.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-surface-2 text-fg-muted hover:bg-surface-2'
            }`}
          >
            {n.nombre}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-8"><Spinner /></div>}

      {!loading && padres.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border bg-surface p-10 text-center text-fg-muted">
          No hay materias registradas en este nivel.
        </div>
      )}

      {!loading && padres.map(padre => (
        <div key={padre.id} className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-bg px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-fg truncate">{padre.nombre}</span>
              <span className="text-xs text-fg-muted shrink-0">{padre.campo.nombre}</span>
              {padre.solo_si_bth && <Badge variant="info">BTH</Badge>}
            </div>
            <Button size="sm" variant="ghost" onClick={() => openCreate(padre)}>
              + Añadir subárea
            </Button>
          </div>

          {padre.subareas.length === 0 ? (
            <p className="px-4 py-3 text-sm text-fg-muted italic">Sin subáreas.</p>
          ) : (
            <div className="divide-y divide-border">
              {padre.subareas.map(sub => (
                <div key={sub.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-sm truncate ${sub.activa ? 'text-fg' : 'text-fg-muted line-through'}`}>
                      {sub.nombre}
                    </span>
                    {!sub.activa && <Badge variant="warning">Inactiva</Badge>}
                    {sub.horas_semanales != null && (
                      <span className="text-xs text-fg-muted shrink-0">{sub.horas_semanales} hrs/sem</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(padre, sub)}>Editar</Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(sub)}>Quitar</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <Modal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.mode === 'create' ? 'Nueva subárea' : 'Editar subárea'}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModal(null)} disabled={saving}>Cancelar</Button>
            <Button form="form-subarea" type="submit" loading={saving}>
              {modal?.mode === 'create' ? 'Crear subárea' : 'Guardar cambios'}
            </Button>
          </div>
        }
      >
        {modal && (
          <form id="form-subarea" onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-fg">Nombre de la subárea</label>
              <input
                type="text"
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej. Legislación"
                required
                autoFocus
                className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <p className="text-xs text-fg-muted">Se guardará como: <strong>{previewNombre}</strong></p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-fg">Desde grado (orden)</label>
                <input
                  type="number" min={1}
                  value={form.aplica_solo_desde_grado}
                  onChange={e => setForm(f => ({ ...f, aplica_solo_desde_grado: e.target.value }))}
                  placeholder={modal.padre.aplica_solo_desde_grado?.toString() ?? 'Todos'}
                  className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-fg">Hasta grado (orden)</label>
                <input
                  type="number" min={1}
                  value={form.aplica_hasta_grado}
                  onChange={e => setForm(f => ({ ...f, aplica_hasta_grado: e.target.value }))}
                  placeholder={modal.padre.aplica_hasta_grado?.toString() ?? 'Todos'}
                  className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>
            <p className="text-xs text-fg-muted -mt-2">Vacío = hereda el rango de "{modal.padre.nombre}".</p>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-fg">Horas semanales (opcional)</label>
              <input
                type="number" min={0}
                value={form.horas_semanales}
                onChange={e => setForm(f => ({ ...f, horas_semanales: e.target.value }))}
                className="w-32 rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
