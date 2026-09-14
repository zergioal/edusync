import { useState, useCallback, useEffect, useRef } from 'react'
import { api, ApiError } from '../lib/api'
import { useToast } from './ui/Toast'
import { Modal } from './ui/Modal'
import { Button, Spinner } from '@edusync/ui'
import { SelectParalelo } from './select/SelectParalelo'

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface Gestion { id: string; anno: number }

interface MateriaDisponible {
  id:            string
  nombre:        string
  campo:         { nombre: string }
  es_holistica:  boolean
  carga_horaria: { horas_mes: number }[]
}

interface ParaleloBlock {
  key:         number
  paralelo_id: string
  materia_ids: string[]
  disponibles: MateriaDisponible[]
  loading:     boolean
}

let nextKey = 1
function newBlock(): ParaleloBlock {
  return { key: nextKey++, paralelo_id: '', materia_ids: [], disponibles: [], loading: false }
}

// ─── Bloque de paralelo ───────────────────────────────────────────────────────

function ParaleloBloque({
  block, canRemove,
  onParaleloChange, onToggleMateria, onRemove,
}: {
  block:            ParaleloBlock
  canRemove:        boolean
  onParaleloChange: (key: number, id: string) => void
  onToggleMateria:  (key: number, id: string) => void
  onRemove:         (key: number) => void
}) {
  const byField = block.disponibles.reduce<Record<string, MateriaDisponible[]>>((acc, m) => {
    (acc[m.campo.nombre] ??= []).push(m)
    return acc
  }, {})

  return (
    <div className="rounded-xl border border-border bg-bg p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <SelectParalelo
            value={block.paralelo_id}
            onChange={id => onParaleloChange(block.key, id)}
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
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        )}
      </div>

      {!block.paralelo_id && (
        <p className="text-xs text-fg-muted italic">Seleccionar paralelo para ver materias disponibles.</p>
      )}
      {block.paralelo_id && block.loading && (
        <div className="flex items-center gap-2 text-xs text-fg-muted"><Spinner /><span>Cargando…</span></div>
      )}
      {block.paralelo_id && !block.loading && block.disponibles.length === 0 && (
        <p className="text-xs text-amber-600">Sin materias disponibles para este paralelo.</p>
      )}

      {block.paralelo_id && !block.loading && block.disponibles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-fg-muted">Materias disponibles</span>
            <div className="flex gap-2 text-xs">
              <button type="button" onClick={() => block.disponibles.forEach(m => { if (!block.materia_ids.includes(m.id)) onToggleMateria(block.key, m.id) })} className="text-blue-600 hover:text-blue-800">Todas</button>
              <span className="text-fg-muted">·</span>
              <button type="button" onClick={() => [...block.materia_ids].forEach(id => onToggleMateria(block.key, id))} className="text-fg-muted hover:text-fg">Ninguna</button>
            </div>
          </div>
          {Object.entries(byField).map(([campo, mats]) => (
            <div key={campo}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fg-muted">{campo}</p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {mats.map(m => {
                  const checked = block.materia_ids.includes(m.id)
                  const h = m.carga_horaria[0]?.horas_mes
                  return (
                    <label key={m.id} className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${checked ? 'border-blue-400 bg-blue-50 text-blue-800' : 'border-border bg-surface text-fg hover:border-border'}`}>
                      <input type="checkbox" checked={checked} onChange={() => onToggleMateria(block.key, m.id)} className="mt-0.5 shrink-0" />
                      <span className="leading-tight">
                        {m.nombre}
                        {h ? <span className="block text-xs opacity-60">{h}h/mes</span> : null}
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

  useEffect(() => {
    api.get<Gestion>('/gestiones/activa')
      .then(setGestion)
      .catch(() => toastRef.current.error('No se encontró una gestión activa'))
  }, [])

  const handleParaleloChange = useCallback(async (key: number, paralelo_id: string) => {
    setBlocks(prev =>
      prev.map(b => b.key === key ? { ...b, paralelo_id, materia_ids: [], disponibles: [], loading: !!paralelo_id } : b)
    )
    if (!paralelo_id) return
    try {
      const data = await api.get<MateriaDisponible[]>(`/materias/disponibles?paralelo_id=${paralelo_id}`)
      setBlocks(prev => prev.map(b => b.key === key ? { ...b, disponibles: data, loading: false } : b))
    } catch {
      toastRef.current.error('No se pudieron cargar las materias')
      setBlocks(prev => prev.map(b => b.key === key ? { ...b, loading: false } : b))
    }
  }, [])

  const toggleMateria = (key: number, materia_id: string) =>
    setBlocks(prev => prev.map(b => {
      if (b.key !== key) return b
      const materia_ids = b.materia_ids.includes(materia_id)
        ? b.materia_ids.filter(id => id !== materia_id)
        : [...b.materia_ids, materia_id]
      return { ...b, materia_ids }
    }))

  const addBlock    = () => setBlocks(prev => [...prev, newBlock()])
  const removeBlock = (key: number) => setBlocks(prev => prev.filter(b => b.key !== key))

  const totalPairs = blocks.reduce((s, b) => s + b.materia_ids.length, 0)
  const canSubmit  = !!gestion && totalPairs > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    const pairs = blocks.flatMap(b =>
      b.materia_ids.map(materia_id => ({ paralelo_id: b.paralelo_id, materia_id }))
    )

    setSaving(true)
    let created = 0
    const errors: string[] = []

    await Promise.allSettled(
      pairs.map(({ paralelo_id, materia_id }) =>
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
              onToggleMateria={toggleMateria}
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
