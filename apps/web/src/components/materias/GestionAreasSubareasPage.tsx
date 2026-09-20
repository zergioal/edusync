import { useState, useEffect, useCallback, useRef } from 'react'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../ui/Toast'
import { Modal } from '../ui/Modal'
import { Button, Badge, Spinner } from '@edusync/ui'

interface Nivel { id: string; nombre: string }
interface Campo { id: string; nombre: string }
interface Dimension { id: string; nombre: string }

const DIMENSION_LABELS: Record<string, string> = {
  SER_DECIDIR: 'Ser/Decidir', SABER: 'Saber', HACER: 'Hacer', AUTOEVALUACION: 'Autoevaluación',
}

interface Subarea {
  id:                      string
  nombre:                  string
  activa:                  boolean
  aplica_solo_desde_grado: number | null
  aplica_hasta_grado:      number | null
  horas_semanales:         number | null
  es_especial:             boolean
  dimensiones_especiales:  string[]
  _count:                  { asignaciones: number }
}

interface MateriaPadre {
  id:                      string
  nombre:                  string
  campo:                   { nombre: string }
  solo_si_bth:             boolean
  tiene_subareas:          boolean
  activa:                  boolean
  aplica_solo_desde_grado: number | null
  aplica_hasta_grado:      number | null
  horas_semanales:         number | null
  subareas:                Subarea[]
  _count:                  { asignaciones: number }
}

interface AreaFormState {
  nombre:                  string
  campo_id:                string
  solo_si_bth:              boolean
  aplica_solo_desde_grado: string
  aplica_hasta_grado:      string
  horas_semanales:         string
}

interface SubareaFormState {
  nombre:                  string
  aplica_solo_desde_grado: string
  aplica_hasta_grado:      string
  horas_semanales:         string
  es_especial:             boolean
  dimension_ids:           string[]
}

const EMPTY_AREA_FORM: AreaFormState = {
  nombre: '', campo_id: '', solo_si_bth: false, aplica_solo_desde_grado: '', aplica_hasta_grado: '', horas_semanales: '',
}
const EMPTY_SUBAREA_FORM: SubareaFormState = {
  nombre: '', aplica_solo_desde_grado: '', aplica_hasta_grado: '', horas_semanales: '', es_especial: false, dimension_ids: [],
}

/** Nombre base sin el sufijo " (Área Padre)" que el backend agrega automáticamente, para editar cómodamente. */
function stripSufijo(nombre: string, padreNombre: string): string {
  const sufijo = ` (${padreNombre})`
  return nombre.endsWith(sufijo) ? nombre.slice(0, -sufijo.length) : nombre
}

/** Gestión CRUD de áreas y subáreas — compartida entre Admin, Director y Coordinador. */
export function GestionAreasSubareasPage() {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [niveles,     setNiveles]     = useState<Nivel[]>([])
  const [nivelId,     setNivelId]     = useState('')
  const [padres,      setPadres]      = useState<MateriaPadre[]>([])
  const [campos,      setCampos]      = useState<Campo[]>([])
  const [dimensiones, setDimensiones] = useState<Dimension[]>([])
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)

  const [areaModal, setAreaModal] = useState<{ mode: 'create' | 'edit'; area?: MateriaPadre } | null>(null)
  const [areaForm,  setAreaForm]  = useState<AreaFormState>(EMPTY_AREA_FORM)

  const [subareaModal, setSubareaModal] = useState<{ mode: 'create' | 'edit'; padre: MateriaPadre; subarea?: Subarea; step: 'tipo' | 'form' } | null>(null)
  const [subareaForm,  setSubareaForm]  = useState<SubareaFormState>(EMPTY_SUBAREA_FORM)

  useEffect(() => {
    api.get<Nivel[]>('/niveles')
      .then(data => { setNiveles(data); if (data[0]) setNivelId(data[0].id) })
      .catch(() => toastRef.current.error('Error cargando niveles'))
    api.get<Dimension[]>('/materias/dimensiones')
      .then(data => setDimensiones(data.filter(d => d.nombre !== 'AUTOEVALUACION')))
      .catch(() => toastRef.current.error('Error cargando dimensiones'))
  }, [])

  const load = useCallback(async (id: string) => {
    if (!id) return
    setLoading(true)
    try {
      const [padresData, camposData] = await Promise.all([
        api.get<MateriaPadre[]>(`/materias/admin?nivel_id=${id}`),
        api.get<Campo[]>(`/materias/campos?nivel_id=${id}`),
      ])
      setPadres(padresData)
      setCampos(camposData)
    } catch {
      toastRef.current.error('Error cargando materias')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(nivelId) }, [nivelId, load])

  // ── Áreas ────────────────────────────────────────────────────────────────

  const openCreateArea = () => { setAreaForm({ ...EMPTY_AREA_FORM, campo_id: campos[0]?.id ?? '' }); setAreaModal({ mode: 'create' }) }

  const openEditArea = (area: MateriaPadre) => {
    setAreaForm({
      nombre:                  area.nombre,
      campo_id:                '',
      solo_si_bth:             area.solo_si_bth,
      aplica_solo_desde_grado: area.aplica_solo_desde_grado?.toString() ?? '',
      aplica_hasta_grado:      area.aplica_hasta_grado?.toString() ?? '',
      horas_semanales:         area.horas_semanales?.toString() ?? '',
    })
    setAreaModal({ mode: 'edit', area })
  }

  const handleSubmitArea = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!areaModal || !areaForm.nombre.trim()) return
    if (areaModal.mode === 'create' && !areaForm.campo_id) {
      toastRef.current.error('Selecciona un campo')
      return
    }
    setSaving(true)
    try {
      const payload = {
        nombre:                  areaForm.nombre.trim(),
        solo_si_bth:             areaForm.solo_si_bth,
        aplica_solo_desde_grado: areaForm.aplica_solo_desde_grado ? parseInt(areaForm.aplica_solo_desde_grado, 10) : null,
        aplica_hasta_grado:      areaForm.aplica_hasta_grado ? parseInt(areaForm.aplica_hasta_grado, 10) : null,
        horas_semanales:         areaForm.horas_semanales ? parseInt(areaForm.horas_semanales, 10) : null,
      }
      if (areaModal.mode === 'create') {
        await api.post('/materias', { ...payload, campo_id: areaForm.campo_id })
        toastRef.current.success('Área creada correctamente')
      } else {
        await api.patch(`/materias/${areaModal.area!.id}`, payload)
        toastRef.current.success('Área actualizada')
      }
      setAreaModal(null)
      load(nivelId)
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteArea = async (area: MateriaPadre) => {
    if (area.subareas.some(s => s.activa)) {
      toastRef.current.error('Esta área tiene subáreas activas — elimínalas primero')
      return
    }
    const msg = area._count.asignaciones > 0
      ? `"${area.nombre}" tiene asignaciones registradas. Se eliminarán sus asignaciones de la gestión ` +
        `activa (los docentes quedarán sin esta materia este año) y el área se desactivará. El historial ` +
        `de calificaciones de gestiones anteriores no se verá afectado. ¿Continuar?`
      : `¿Eliminar "${area.nombre}"? Esta acción no se puede deshacer.`
    if (!confirm(msg)) return
    try {
      await api.delete(`/materias/${area.id}`)
      toastRef.current.success('Área eliminada')
      load(nivelId)
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : 'Error al eliminar')
    }
  }

  const handleReactivar = async (materia: { id: string; nombre: string }) => {
    try {
      await api.patch(`/materias/${materia.id}`, { activa: true })
      toastRef.current.success(`"${materia.nombre}" reactivada`)
      load(nivelId)
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : 'Error al reactivar')
    }
  }

  const handleDesactivar = async (materia: { id: string; nombre: string }) => {
    if (!confirm(`¿Desactivar "${materia.nombre}"? Dejará de estar disponible para asignar a docentes, pero se conserva junto con su historial — se puede reactivar en cualquier momento.`)) return
    try {
      await api.patch(`/materias/${materia.id}`, { activa: false })
      toastRef.current.success(`"${materia.nombre}" desactivada`)
      load(nivelId)
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : 'Error al desactivar')
    }
  }

  // ── Subáreas ─────────────────────────────────────────────────────────────

  const openCreateSubarea = (padre: MateriaPadre) => {
    if (padre.subareas.length === 0 && padre._count.asignaciones > 0) {
      const ok = confirm(
        `"${padre.nombre}" ya tiene ${padre._count.asignaciones} asignación(es) directa(s) registrada(s). ` +
        `Al crear su primera subárea, esas asignaciones dejarán de contar para la nota final — solo se ` +
        `promediarán las subáreas. ¿Continuar?`
      )
      if (!ok) return
    }
    const bloqueado = tipoSubareaBloqueado(padre)
    setSubareaForm({ ...EMPTY_SUBAREA_FORM, es_especial: bloqueado === 'especial' })
    setSubareaModal({ mode: 'create', padre, step: bloqueado === null ? 'tipo' : 'form' })
  }

  const openEditSubarea = (padre: MateriaPadre, subarea: Subarea) => {
    setSubareaForm({
      nombre:                  stripSufijo(subarea.nombre, padre.nombre),
      aplica_solo_desde_grado: subarea.aplica_solo_desde_grado?.toString() ?? '',
      aplica_hasta_grado:      subarea.aplica_hasta_grado?.toString() ?? '',
      horas_semanales:         subarea.horas_semanales?.toString() ?? '',
      es_especial:             subarea.es_especial,
      dimension_ids:           subarea.dimensiones_especiales,
    })
    setSubareaModal({ mode: 'edit', padre, subarea, step: 'form' })
  }

  // Si el área padre ya tiene subáreas de un tipo, la nueva debe ser del mismo tipo.
  const tipoSubareaBloqueado = (padre: MateriaPadre): 'normal' | 'especial' | null => {
    if (padre.subareas.some(s => s.es_especial)) return 'especial'
    if (padre.subareas.some(s => !s.es_especial)) return 'normal'
    return null
  }

  const handleSubmitSubarea = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subareaModal || !subareaForm.nombre.trim()) return
    if (subareaForm.es_especial && subareaForm.dimension_ids.length === 0) {
      toastRef.current.error('Elige al menos una dimensión para la subárea especial')
      return
    }
    setSaving(true)
    try {
      const payload = {
        nombre:                  subareaForm.nombre.trim(),
        aplica_solo_desde_grado: subareaForm.aplica_solo_desde_grado ? parseInt(subareaForm.aplica_solo_desde_grado, 10) : null,
        aplica_hasta_grado:      subareaForm.aplica_hasta_grado ? parseInt(subareaForm.aplica_hasta_grado, 10) : null,
        horas_semanales:         subareaForm.horas_semanales ? parseInt(subareaForm.horas_semanales, 10) : null,
        ...(subareaForm.es_especial ? { dimension_ids: subareaForm.dimension_ids } : {}),
      }
      if (subareaModal.mode === 'create') {
        await api.post('/materias', {
          ...payload, es_subarea_de_id: subareaModal.padre.id, es_especial: subareaForm.es_especial,
        })
        toastRef.current.success('Subárea creada correctamente')
      } else {
        await api.patch(`/materias/${subareaModal.subarea!.id}`, payload)
        toastRef.current.success('Subárea actualizada')
      }
      setSubareaModal(null)
      load(nivelId)
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSubarea = async (subarea: Subarea) => {
    const msg = subarea._count.asignaciones > 0
      ? `"${subarea.nombre}" tiene asignaciones registradas. Se eliminarán sus asignaciones de la gestión ` +
        `activa (los docentes quedarán sin esta subárea este año) y se desactivará. El historial de ` +
        `calificaciones de gestiones anteriores no se verá afectado. ¿Continuar?`
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

  const previewNombreSubarea = subareaModal ? `${subareaForm.nombre.trim() || '…'} (${subareaModal.padre.nombre})` : ''

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
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
        <Button size="sm" onClick={openCreateArea}>+ Nueva área</Button>
      </div>

      {loading && <div className="flex justify-center py-8"><Spinner /></div>}

      {!loading && padres.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border bg-surface p-10 text-center text-fg-muted">
          No hay áreas registradas en este nivel. Crea la primera.
        </div>
      )}

      {!loading && padres.map(padre => (
        <div key={padre.id} className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-bg px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-fg truncate">{padre.nombre}</span>
              <span className="text-xs text-fg-muted shrink-0">{padre.campo.nombre}</span>
              {padre.solo_si_bth && <Badge variant="info">BTH</Badge>}
              {!padre.activa && <Badge variant="warning">Inactiva</Badge>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="ghost" onClick={() => openCreateSubarea(padre)}>+ Añadir subárea</Button>
              <Button size="sm" variant="ghost" onClick={() => openEditArea(padre)}>Editar área</Button>
              {padre.activa ? (
                <Button size="sm" variant="secondary" onClick={() => handleDesactivar(padre)}>Desactivar</Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => handleReactivar(padre)}>Reactivar</Button>
              )}
              <Button size="sm" variant="danger" onClick={() => handleDeleteArea(padre)}>Eliminar área</Button>
            </div>
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
                    {sub.es_especial && (
                      <Badge variant="info">
                        Especial · {sub.dimensiones_especiales.map(id => DIMENSION_LABELS[dimensiones.find(d => d.id === id)?.nombre ?? ''] ?? '').filter(Boolean).join(', ')}
                      </Badge>
                    )}
                    {!sub.activa && <Badge variant="warning">Inactiva</Badge>}
                    {sub.horas_semanales != null && (
                      <span className="text-xs text-fg-muted shrink-0">{sub.horas_semanales} hrs/mes</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => openEditSubarea(padre, sub)}>Editar</Button>
                    {sub.activa ? (
                      <Button size="sm" variant="secondary" onClick={() => handleDesactivar(sub)}>Desactivar</Button>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => handleReactivar(sub)}>Reactivar</Button>
                    )}
                    <Button size="sm" variant="danger" onClick={() => handleDeleteSubarea(sub)}>Quitar</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Modal Área */}
      <Modal
        isOpen={areaModal !== null}
        onClose={() => setAreaModal(null)}
        title={areaModal?.mode === 'create' ? 'Nueva área' : 'Editar área'}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setAreaModal(null)} disabled={saving}>Cancelar</Button>
            <Button form="form-area" type="submit" loading={saving}>
              {areaModal?.mode === 'create' ? 'Crear área' : 'Guardar cambios'}
            </Button>
          </div>
        }
      >
        {areaModal && (
          <form id="form-area" onSubmit={handleSubmitArea} className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-fg">Nombre del área</label>
              <input
                type="text"
                value={areaForm.nombre}
                onChange={e => setAreaForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej. Educación Física"
                required
                autoFocus
                className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            {areaModal.mode === 'create' && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-fg">Campo</label>
                <select
                  value={areaForm.campo_id}
                  onChange={e => setAreaForm(f => ({ ...f, campo_id: e.target.value }))}
                  required
                  className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="">— Seleccionar campo —</option>
                  {campos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm text-fg">
              <input
                type="checkbox"
                checked={areaForm.solo_si_bth}
                onChange={e => setAreaForm(f => ({ ...f, solo_si_bth: e.target.checked }))}
                className="rounded border-border"
              />
              Solo disponible en unidades educativas BTH
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-fg">Desde grado (orden)</label>
                <input
                  type="number" min={1}
                  value={areaForm.aplica_solo_desde_grado}
                  onChange={e => setAreaForm(f => ({ ...f, aplica_solo_desde_grado: e.target.value }))}
                  placeholder="Todos"
                  className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-fg">Hasta grado (orden)</label>
                <input
                  type="number" min={1}
                  value={areaForm.aplica_hasta_grado}
                  onChange={e => setAreaForm(f => ({ ...f, aplica_hasta_grado: e.target.value }))}
                  placeholder="Todos"
                  className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>

            {areaModal.mode === 'edit' && areaModal.area?.tiene_subareas ? (
              <p className="text-xs text-fg-muted rounded-lg bg-surface-2 px-3 py-2">
                Esta área tiene subáreas — sus horas se calculan automáticamente sumando las horas
                mensuales de cada subárea, no se editan aquí.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-fg">Horas mensuales (opcional)</label>
                <input
                  type="number" min={0}
                  value={areaForm.horas_semanales}
                  onChange={e => setAreaForm(f => ({ ...f, horas_semanales: e.target.value }))}
                  className="w-32 rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <p className="text-xs text-fg-muted">
                  Se aplicará como carga horaria mensual en todos los grados donde aplique este área
                  (editable luego, grado por grado, en "Carga horaria por materia y grado").
                </p>
              </div>
            )}
          </form>
        )}
      </Modal>

      {/* Modal Subárea */}
      <Modal
        isOpen={subareaModal !== null}
        onClose={() => setSubareaModal(null)}
        title={
          subareaModal?.mode !== 'create'
            ? 'Editar subárea'
            : subareaModal.step === 'tipo' ? 'Nueva subárea — ¿qué tipo?' : 'Nueva subárea'
        }
        footer={
          subareaModal?.mode === 'create' && subareaModal.step === 'tipo' ? (
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setSubareaModal(null)}>Cancelar</Button>
            </div>
          ) : (
            <div className="flex justify-between gap-3">
              {subareaModal?.mode === 'create' && tipoSubareaBloqueado(subareaModal.padre) === null ? (
                <Button variant="ghost" onClick={() => setSubareaModal(m => m && { ...m, step: 'tipo' })} disabled={saving}>
                  ← Cambiar tipo
                </Button>
              ) : <span />}
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setSubareaModal(null)} disabled={saving}>Cancelar</Button>
                <Button form="form-subarea" type="submit" loading={saving}>
                  {subareaModal?.mode === 'create' ? 'Crear subárea' : 'Guardar cambios'}
                </Button>
              </div>
            </div>
          )
        }
      >
        {subareaModal?.mode === 'create' && subareaModal.step === 'tipo' && (
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              {
                tipo: 'normal' as const,
                titulo: 'Normal',
                resumen: 'Reemplaza al área principal',
                detalle: 'El área principal deja de poder asignarse directamente. La subárea tiene su propia nota final, que se promedia en pie de igualdad con sus subáreas hermanas para formar la nota del área en el boletín.',
              },
              {
                tipo: 'especial' as const,
                titulo: 'Especial',
                resumen: 'Convive con el área principal',
                detalle: 'El área principal sigue asignada y con horas normales. La subárea especial no tiene nota final propia: aporta una única nota adicional en las dimensiones que elijas (Ser/Decidir, Saber o Hacer), que se diluye dentro del promedio del docente del área principal. Nunca aparece en el boletín.',
              },
            ]).map(op => (
              <button
                key={op.tipo}
                type="button"
                onClick={() => {
                  setSubareaForm(f => ({ ...f, es_especial: op.tipo === 'especial' }))
                  setSubareaModal(m => m && { ...m, step: 'form' })
                }}
                className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-brand hover:bg-surface-2"
              >
                <span className="text-sm font-bold text-fg">{op.titulo}</span>
                <span className="text-xs font-medium text-brand">{op.resumen}</span>
                <span className="text-xs text-fg-muted leading-relaxed">{op.detalle}</span>
              </button>
            ))}
          </div>
        )}

        {subareaModal && !(subareaModal.mode === 'create' && subareaModal.step === 'tipo') && (
          <form id="form-subarea" onSubmit={handleSubmitSubarea} className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-fg">Nombre de la subárea</label>
              <input
                type="text"
                value={subareaForm.nombre}
                onChange={e => setSubareaForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej. Legislación"
                required
                autoFocus
                className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <p className="text-xs text-fg-muted">Se guardará como: <strong>{previewNombreSubarea}</strong></p>
            </div>

            {subareaModal.mode === 'create' && (
              <p className={`text-xs rounded-lg px-3 py-2 ${subareaForm.es_especial ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-800 dark:text-indigo-300' : 'bg-surface-2 text-fg-muted'}`}>
                Tipo: <strong>{subareaForm.es_especial ? 'Especial' : 'Normal'}</strong> —{' '}
                {subareaForm.es_especial
                  ? 'no reemplaza al área principal; aporta una nota adicional implícita en las dimensiones que marques abajo.'
                  : 'reemplaza la asignación directa del área principal y tiene nota final propia.'}
              </p>
            )}

            {subareaForm.es_especial && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-fg">Dimensiones donde aporta nota</label>
                <div className="flex flex-wrap gap-3">
                  {dimensiones.map(d => (
                    <label key={d.id} className="flex items-center gap-1.5 text-sm text-fg">
                      <input
                        type="checkbox"
                        checked={subareaForm.dimension_ids.includes(d.id)}
                        onChange={e => setSubareaForm(f => ({
                          ...f,
                          dimension_ids: e.target.checked
                            ? [...f.dimension_ids, d.id]
                            : f.dimension_ids.filter(id => id !== d.id),
                        }))}
                        className="rounded border-border"
                      />
                      {DIMENSION_LABELS[d.nombre] ?? d.nombre}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-fg">Desde grado (orden)</label>
                <input
                  type="number" min={1}
                  value={subareaForm.aplica_solo_desde_grado}
                  onChange={e => setSubareaForm(f => ({ ...f, aplica_solo_desde_grado: e.target.value }))}
                  placeholder={subareaModal.padre.aplica_solo_desde_grado?.toString() ?? 'Todos'}
                  className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-fg">Hasta grado (orden)</label>
                <input
                  type="number" min={1}
                  value={subareaForm.aplica_hasta_grado}
                  onChange={e => setSubareaForm(f => ({ ...f, aplica_hasta_grado: e.target.value }))}
                  placeholder={subareaModal.padre.aplica_hasta_grado?.toString() ?? 'Todos'}
                  className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>
            <p className="text-xs text-fg-muted -mt-2">Vacío = hereda el rango de "{subareaModal.padre.nombre}".</p>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-fg">Horas mensuales (opcional)</label>
              <input
                type="number" min={0}
                value={subareaForm.horas_semanales}
                onChange={e => setSubareaForm(f => ({ ...f, horas_semanales: e.target.value }))}
                className="w-32 rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <p className="text-xs text-fg-muted">
                Se aplicará como carga horaria mensual en todos los grados donde aplique esta subárea
                (editable luego, grado por grado, en "Carga horaria por materia y grado").
              </p>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
