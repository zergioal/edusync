import { useState, useCallback, useEffect, useRef } from 'react'
import { api, ApiError } from '../lib/api'
import { useToast } from './ui/Toast'
import { Modal } from './ui/Modal'
import { Icon } from './ui/Icon'
import { Button, Spinner } from '@edusync/ui'
import { SelectParalelo, type Paralelo } from './select/SelectParalelo'

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface Gestion { id: string; anno: number }

interface MateriaDisponible {
  id:            string
  nombre:        string
  campo:         { nombre: string }
  es_holistica:  boolean
  carga_horaria: { horas_mes: number }[]
}

interface AsignacionExistente { docente_id: string; materia_id: string }

/** Selección de materias para UN curso ya visitado dentro de un bloque — se conserva al cambiar de curso. */
interface CursoSeleccion {
  paralelo_label: string
  disponibles:    MateriaDisponible[]
  materia_ids:    string[]
  /** Materias que el docente YA tenía asignadas en este curso al momento de cargar — se muestran
   *  marcadas, pero no se vuelven a enviar al guardar (evita error de "ya existe"). */
  ya_asignadas:   string[]
}

interface ParaleloBlock {
  key:               number
  currentParaleloId: string
  /** El paralelo_id que está siendo cargado en este momento (o null) — evita que una respuesta
   *  tardía de un curso ya abandonado deje "Cargando…" pegado en el curso que se ve ahora. */
  loadingParaleloId: string | null
  /** Todos los cursos visitados en este bloque, cada uno con su propia selección — cambiar el
   *  desplegable a un curso ya visitado no borra lo que se había marcado ahí. */
  cursos:            Record<string, CursoSeleccion>
}

let nextKey = 1
function newBlock(): ParaleloBlock {
  return { key: nextKey++, currentParaleloId: '', loadingParaleloId: null, cursos: {} }
}

// ─── Bloque de paralelo ───────────────────────────────────────────────────────

function ParaleloBloque({
  block, canRemove,
  onParaleloChange, onJumpToCurso, onToggleMateria, onSelectAll, onSelectNone, onRemove,
}: {
  block:            ParaleloBlock
  canRemove:        boolean
  onParaleloChange: (key: number, paralelo: Paralelo | null) => void
  onJumpToCurso:    (key: number, paralelo_id: string) => void
  onToggleMateria:  (key: number, id: string) => void
  onSelectAll:      (key: number) => void
  onSelectNone:     (key: number) => void
  onRemove:         (key: number) => void
}) {
  const curso     = block.cursos[block.currentParaleloId]
  const isLoading = block.currentParaleloId !== '' && block.loadingParaleloId === block.currentParaleloId

  const byField = (curso?.disponibles ?? []).reduce<Record<string, MateriaDisponible[]>>((acc, m) => {
    (acc[m.campo.nombre] ??= []).push(m)
    return acc
  }, {})

  const otrosCursosConSeleccion = Object.entries(block.cursos)
    .filter(([id, c]) => id !== block.currentParaleloId && c.materia_ids.length > 0)

  return (
    <div className="rounded-xl border border-border bg-bg p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <SelectParalelo
            value={block.currentParaleloId}
            onChange={() => {}}
            onParaleloChange={p => onParaleloChange(block.key, p)}
            label=""
            placeholder="— Seleccionar paralelo —"
          />
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(block.key)}
            className="shrink-0 rounded-lg p-1.5 text-fg-muted hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Quitar bloque"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        )}
      </div>

      {otrosCursosConSeleccion.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-fg-muted">Ya seleccionado en:</span>
          {otrosCursosConSeleccion.map(([id, c]) => (
            <button
              key={id}
              type="button"
              onClick={() => onJumpToCurso(block.key, id)}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
              title="Volver a este curso"
            >
              {c.paralelo_label} · {c.materia_ids.length}
            </button>
          ))}
        </div>
      )}

      {!block.currentParaleloId && (
        <p className="text-xs text-fg-muted italic">Seleccionar paralelo para ver materias disponibles.</p>
      )}
      {block.currentParaleloId && isLoading && (
        <div className="flex items-center gap-2 text-xs text-fg-muted"><Spinner /><span>Cargando…</span></div>
      )}
      {block.currentParaleloId && !isLoading && curso && curso.disponibles.length === 0 && (
        <p className="text-xs text-amber-600">Sin materias disponibles para este paralelo.</p>
      )}

      {block.currentParaleloId && !isLoading && curso && curso.disponibles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-fg-muted">Materias disponibles</span>
            <div className="flex gap-2 text-xs">
              <button type="button" onClick={() => onSelectAll(block.key)} className="text-blue-600 hover:text-blue-800">Todas</button>
              <span className="text-fg-muted">·</span>
              <button type="button" onClick={() => onSelectNone(block.key)} className="text-fg-muted hover:text-fg">Ninguna</button>
            </div>
          </div>
          {Object.entries(byField).map(([campo, mats]) => (
            <div key={campo}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fg-muted">{campo}</p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {mats.map(m => {
                  const checked   = curso.materia_ids.includes(m.id)
                  const yaAsignada = curso.ya_asignadas.includes(m.id)
                  const h = m.carga_horaria[0]?.horas_mes
                  return (
                    <label
                      key={m.id}
                      className={`relative flex cursor-pointer items-start gap-2 overflow-hidden rounded-lg border pl-4 pr-3 py-2 text-sm transition-colors duration-150 ${
                        checked
                          ? 'border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-fg'
                          : 'border-border bg-surface text-fg hover:bg-surface-2'
                      }`}
                    >
                      <span
                        className={`absolute left-0 top-1/2 -translate-y-1/2 h-4 w-1 rounded-r-full bg-indigo-500 transition-opacity duration-150 ${
                          checked ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                      <input type="checkbox" checked={checked} onChange={() => onToggleMateria(block.key, m.id)} className="mt-0.5 shrink-0 accent-indigo-600" />
                      <span className="leading-tight">
                        {m.nombre}
                        {h ? <span className="block text-xs opacity-60">{h}h/mes</span> : null}
                        {yaAsignada && <span className="block text-xs font-medium text-emerald-600 dark:text-emerald-400">Ya asignada</span>}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Modal principal ───────────────────────────────────────────────────────────

interface Docente { id: string; nombre: string; apellido: string }

export function AsignarHorasModal({ docente, onClose, onSaved }: {
  docente: Docente
  onClose: () => void
  onSaved: () => void
}) {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [gestion, setGestion] = useState<Gestion | null>(null)
  const [saving,  setSaving]  = useState(false)
  const [blocks,  setBlocks]  = useState<ParaleloBlock[]>([newBlock()])
  const blocksRef = useRef(blocks)
  blocksRef.current = blocks
  const gestionRef = useRef(gestion)
  gestionRef.current = gestion

  useEffect(() => {
    api.get<Gestion>('/gestiones/activa')
      .then(setGestion)
      .catch(() => toastRef.current.error('No se encontró una gestión activa'))
  }, [])

  const handleParaleloChange = useCallback((key: number, paralelo: Paralelo | null) => {
    const paralelo_id = paralelo?.id ?? ''
    if (!paralelo_id) {
      setBlocks(prev => prev.map(b => b.key === key ? { ...b, currentParaleloId: '' } : b))
      return
    }

    const block = blocksRef.current.find(b => b.key === key)
    const yaVisitado = !!block?.cursos[paralelo_id]

    setBlocks(prev => prev.map(b => b.key === key
      ? { ...b, currentParaleloId: paralelo_id, loadingParaleloId: yaVisitado ? b.loadingParaleloId : paralelo_id }
      : b
    ))
    if (yaVisitado || !paralelo) return

    const label = `${paralelo.grado.nombre} "${paralelo.letra}"`
    const gestion_id = gestionRef.current?.id

    Promise.all([
      api.get<MateriaDisponible[]>(`/materias/disponibles?paralelo_id=${paralelo_id}`),
      gestion_id
        ? api.get<AsignacionExistente[]>(`/asignaciones?paralelo_id=${paralelo_id}&gestion_id=${gestion_id}`)
        : Promise.resolve([] as AsignacionExistente[]),
    ])
      .then(([disponibles, asignacionesExistentes]) => {
        const yaAsignadas = asignacionesExistentes
          .filter(a => a.docente_id === docente.id)
          .map(a => a.materia_id)
        setBlocks(prev => prev.map(b => b.key !== key ? b : {
          ...b,
          loadingParaleloId: b.loadingParaleloId === paralelo_id ? null : b.loadingParaleloId,
          cursos: {
            ...b.cursos,
            [paralelo_id]: { paralelo_label: label, disponibles, materia_ids: yaAsignadas, ya_asignadas: yaAsignadas },
          },
        }))
      })
      .catch(() => {
        toastRef.current.error('No se pudieron cargar las materias')
        setBlocks(prev => prev.map(b => b.key === key
          ? { ...b, loadingParaleloId: b.loadingParaleloId === paralelo_id ? null : b.loadingParaleloId }
          : b
        ))
      })
  }, [docente.id])

  const jumpToCurso = useCallback((key: number, paralelo_id: string) => {
    setBlocks(prev => prev.map(b => b.key === key ? { ...b, currentParaleloId: paralelo_id } : b))
  }, [])

  const updateCursoActual = (key: number, fn: (c: CursoSeleccion) => CursoSeleccion) =>
    setBlocks(prev => prev.map(b => {
      if (b.key !== key) return b
      const curso = b.cursos[b.currentParaleloId]
      if (!curso) return b
      return { ...b, cursos: { ...b.cursos, [b.currentParaleloId]: fn(curso) } }
    }))

  const toggleMateria = (key: number, materia_id: string) =>
    updateCursoActual(key, c => ({
      ...c,
      materia_ids: c.materia_ids.includes(materia_id)
        ? c.materia_ids.filter(id => id !== materia_id)
        : [...c.materia_ids, materia_id],
    }))

  const selectAll  = (key: number) => updateCursoActual(key, c => ({ ...c, materia_ids: c.disponibles.map(m => m.id) }))
  const selectNone = (key: number) => updateCursoActual(key, c => ({ ...c, materia_ids: [] }))

  const addBlock    = () => setBlocks(prev => [...prev, newBlock()])
  const removeBlock = (key: number) => setBlocks(prev => prev.filter(b => b.key !== key))

  // Todas las combinaciones (paralelo, materia) seleccionadas en TODOS los cursos visitados de TODOS
  // los bloques que NO estaban ya asignadas — no se reenvían las que ya existían.
  const allPairs = blocks.flatMap(b =>
    Object.entries(b.cursos).flatMap(([paralelo_id, c]) =>
      c.materia_ids.filter(id => !c.ya_asignadas.includes(id)).map(materia_id => ({ paralelo_id, materia_id }))
    )
  )
  const totalPairs = allPairs.length
  const canSubmit  = !!gestion && totalPairs > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setSaving(true)
    let created = 0
    const errors: string[] = []

    await Promise.allSettled(
      allPairs.map(({ paralelo_id, materia_id }) =>
        api.post('/asignaciones', { docente_id: docente.id, materia_id, paralelo_id, gestion_id: gestion!.id })
          .then(() => { created++ })
          .catch((err: unknown) => { errors.push(err instanceof ApiError ? err.message : 'Error') })
      )
    )

    setSaving(false)
    if (created > 0) {
      toastRef.current.success(`${created} asignación${created !== 1 ? 'es' : ''} creada${created !== 1 ? 's' : ''} correctamente`)
      onSaved()
    }
    if (errors.length > 0) {
      toastRef.current.error(`${errors.length} error${errors.length !== 1 ? 'es' : ''}: ${errors[0]}`)
    }
    if (created > 0) onClose()
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      maxWidth="xl"
      title={`Asignar horas — ${docente.apellido}, ${docente.nombre}`}
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-fg-muted">
            {totalPairs > 0
              ? `${totalPairs} asignación${totalPairs !== 1 ? 'es' : ''} a crear`
              : 'Seleccionar paralelo y materias'}
          </span>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button form="form-asignar-horas" type="submit" loading={saving} disabled={!canSubmit}>
              {`Crear ${totalPairs > 0 ? totalPairs : ''} asignación${totalPairs !== 1 ? 'es' : ''}`}
            </Button>
          </div>
        </div>
      }
    >
      <form id="form-asignar-horas" onSubmit={handleSubmit}>
        <div className="max-h-[55vh] overflow-y-auto space-y-3 pr-1">
          {blocks.map(block => (
            <ParaleloBloque
              key={block.key}
              block={block}
              canRemove={blocks.length > 1}
              onParaleloChange={handleParaleloChange}
              onJumpToCurso={jumpToCurso}
              onToggleMateria={toggleMateria}
              onSelectAll={selectAll}
              onSelectNone={selectNone}
              onRemove={removeBlock}
            />
          ))}
          <button
            type="button"
            onClick={addBlock}
            className="w-full rounded-xl border-2 border-dashed border-border py-3 text-sm text-fg-muted hover:border-blue-300 hover:text-blue-600 transition-colors"
          >
            + Agregar otro paralelo
          </button>
        </div>
      </form>
    </Modal>
  )
}
