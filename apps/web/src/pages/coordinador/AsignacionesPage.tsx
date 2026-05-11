import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { Modal } from '../../components/ui/Modal'
import { Button, Spinner } from '@edusync/ui'
import { SelectParalelo } from '../../components/select/SelectParalelo'
import { SelectDocente } from '../../components/select/SelectDocente'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Gestion { id: string; anno: number }

interface MateriaDisponible {
  id:            string
  nombre:        string
  campo:         { nombre: string }
  es_holistica:  boolean
  carga_horaria: { horas_mes: number }[]
}

interface Asignacion {
  id:      string
  docente: {
    id:                      string
    horas_pedagogicas_total: number
    usuario:                 { nombre: string; apellido: string }
  }
  materia: { id: string; nombre: string; campo: { nombre: string }; nivel: { nombre: string } }
  paralelo: { id: string; letra: string; grado: { nombre: string; nivel: { id: string; nombre: string } } }
  gestion: { id: string; anno: number }
}

interface DocenteGroup {
  docente_id:              string
  nombre:                  string
  apellido:                string
  horas_pedagogicas_total: number
  asignaciones:            Asignacion[]
  niveles:                 string[]
}

interface LockedDocente { id: string; nombre: string; apellido: string }

interface ParaleloBlock {
  key:         number
  paralelo_id: string
  materia_ids: string[]
  disponibles: MateriaDisponible[]
  loading:     boolean
}

// ─── Bloque de paralelo (modal) ───────────────────────────────────────────────

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
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
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
            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Quitar bloque"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        )}
      </div>

      {!block.paralelo_id && (
        <p className="text-xs text-gray-400 italic">Seleccionar paralelo para ver materias disponibles.</p>
      )}
      {block.paralelo_id && block.loading && (
        <div className="flex items-center gap-2 text-xs text-gray-400"><Spinner /><span>Cargando…</span></div>
      )}
      {block.paralelo_id && !block.loading && block.disponibles.length === 0 && (
        <p className="text-xs text-amber-600">Sin materias disponibles para este paralelo.</p>
      )}

      {block.paralelo_id && !block.loading && block.disponibles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Materias disponibles</span>
            <div className="flex gap-2 text-xs">
              <button type="button" onClick={() => block.disponibles.forEach(m => { if (!block.materia_ids.includes(m.id)) onToggleMateria(block.key, m.id) })} className="text-blue-600 hover:text-blue-800">Todas</button>
              <span className="text-gray-300">·</span>
              <button type="button" onClick={() => [...block.materia_ids].forEach(id => onToggleMateria(block.key, id))} className="text-gray-500 hover:text-gray-700">Ninguna</button>
            </div>
          </div>
          {Object.entries(byField).map(([campo, mats]) => (
            <div key={campo}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">{campo}</p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {mats.map(m => {
                  const checked = block.materia_ids.includes(m.id)
                  const h = m.carga_horaria[0]?.horas_mes
                  return (
                    <label key={m.id} className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${checked ? 'border-blue-400 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
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

// ─── Componente principal ─────────────────────────────────────────────────────

const NIVEL_BADGE: Record<string, string> = {
  INICIAL:    'bg-amber-100 text-amber-700',
  PRIMARIA:   'bg-blue-100 text-blue-700',
  SECUNDARIA: 'bg-emerald-100 text-emerald-700',
}

let nextKey = 1
function newBlock(): ParaleloBlock {
  return { key: nextKey++, paralelo_id: '', materia_ids: [], disponibles: [], loading: false }
}

export default function AsignacionesPage() {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [gestion,      setGestion]      = useState<Gestion | null>(null)
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [loading,      setLoading]      = useState(true)
  const [filterPar,    setFilterPar]    = useState('')
  const [searchDoc,    setSearchDoc]    = useState('')
  const [expandedId,   setExpandedId]   = useState<string | null>(null)

  // ── Modal de asignación en lote ──────────────────────────────────────────
  const [modal,         setModal]         = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [lockedDocente, setLockedDocente] = useState<LockedDocente | null>(null)
  const [docenteId,     setDocenteId]     = useState('')
  const [blocks,        setBlocks]        = useState<ParaleloBlock[]>([newBlock()])

  // ── Gestión activa ────────────────────────────────────────────────────────

  useEffect(() => {
    api.get<Gestion>('/gestiones/activa')
      .then(setGestion)
      .catch(() => toastRef.current.error('No se encontró una gestión activa'))
  }, [])

  // ── Carga asignaciones (filtrada por gestión activa) ──────────────────────

  const load = useCallback(async () => {
    if (!gestion) return
    setLoading(true)
    try {
      const qs = new URLSearchParams({ gestion_id: gestion.id })
      if (filterPar) qs.set('paralelo_id', filterPar)
      setAsignaciones(await api.get<Asignacion[]>(`/asignaciones?${qs}`))
    } catch {
      toastRef.current.error('No se pudieron cargar las asignaciones')
    } finally {
      setLoading(false)
    }
  }, [gestion, filterPar])

  useEffect(() => { load() }, [load])

  // ── Agrupar por docente ───────────────────────────────────────────────────

  const allGroups = useMemo<DocenteGroup[]>(() => {
    const map = new Map<string, DocenteGroup>()
    for (const a of asignaciones) {
      const dId = a.docente.id
      if (!map.has(dId)) {
        map.set(dId, {
          docente_id:              dId,
          nombre:                  a.docente.usuario.nombre,
          apellido:                a.docente.usuario.apellido,
          horas_pedagogicas_total: a.docente.horas_pedagogicas_total,
          asignaciones:            [],
          niveles:                 [],
        })
      }
      const g = map.get(dId)!
      g.asignaciones.push(a)
      const nv = a.paralelo.grado.nivel.nombre
      if (!g.niveles.includes(nv)) g.niveles.push(nv)
    }
    return Array.from(map.values()).sort((a, b) =>
      a.apellido.localeCompare(b.apellido, 'es')
    )
  }, [asignaciones])

  const groups = useMemo(() => {
    if (!searchDoc.trim()) return allGroups
    const q = searchDoc.toLowerCase()
    return allGroups.filter(g =>
      g.apellido.toLowerCase().includes(q) || g.nombre.toLowerCase().includes(q)
    )
  }, [allGroups, searchDoc])

  // ── Abrir modal ───────────────────────────────────────────────────────────

  const openModalGlobal = () => {
    setLockedDocente(null)
    setDocenteId('')
    setBlocks([newBlock()])
    setModal(true)
  }

  const openModalForDocente = (g: DocenteGroup) => {
    setLockedDocente({ id: g.docente_id, nombre: g.nombre, apellido: g.apellido })
    setDocenteId(g.docente_id)
    setBlocks([newBlock()])
    setModal(true)
  }

  // ── Manipulación de bloques ───────────────────────────────────────────────

  const handleParaleloChange = async (key: number, paralelo_id: string) => {
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
  }

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
  const canSubmit  = !!docenteId && !!gestion && totalPairs > 0

  // ── Enviar ────────────────────────────────────────────────────────────────

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
        api.post('/asignaciones', { docente_id: docenteId, materia_id, paralelo_id, gestion_id: gestion!.id })
          .then(() => { created++ })
          .catch((err: unknown) => { errors.push(err instanceof ApiError ? err.message : 'Error') })
      )
    )

    setSaving(false)
    if (created > 0) {
      toastRef.current.success(`${created} asignación${created !== 1 ? 'es' : ''} creada${created !== 1 ? 's' : ''} correctamente`)
      load()
    }
    if (errors.length > 0) {
      toastRef.current.error(`${errors.length} error${errors.length !== 1 ? 'es' : ''}: ${errors[0]}`)
    }
    if (created > 0) setModal(false)
  }

  // ── Eliminar ──────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta asignación?')) return
    try {
      await api.delete(`/asignaciones/${id}`)
      toastRef.current.success('Asignación eliminada')
      load()
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : 'Error al eliminar')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asignación de Docentes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {gestion ? `Gestión ${gestion.anno}` : 'Cargando gestión…'}
          </p>
        </div>
        <Button onClick={openModalGlobal} disabled={!gestion}>+ Nueva asignación</Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
          <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Buscar docente</label>
          <input
            type="text"
            value={searchDoc}
            onChange={e => setSearchDoc(e.target.value)}
            placeholder="Nombre o apellido…"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
          <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Filtrar por paralelo</label>
          <SelectParalelo
            value={filterPar}
            onChange={setFilterPar}
            label=""
            placeholder="— Todos los paralelos —"
          />
        </div>
        {(filterPar || searchDoc) && (
          <div className="flex items-end">
            <Button variant="ghost" size="sm" onClick={() => { setFilterPar(''); setSearchDoc('') }}>
              Limpiar filtros
            </Button>
          </div>
        )}
      </div>

      {/* Resumen */}
      {!loading && (
        <p className="text-sm text-gray-500">
          {groups.length} docente{groups.length !== 1 ? 's' : ''} · {asignaciones.length} asignación{asignaciones.length !== 1 ? 'es' : ''}
        </p>
      )}

      {/* Lista agrupada por docente */}
      {loading && <div className="flex justify-center py-16"><Spinner /></div>}

      {!loading && groups.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-400">No hay asignaciones registradas para esta gestión.</p>
        </div>
      )}

      <div className="space-y-3">
        {groups.map(g => {
          const expanded = expandedId === g.docente_id
          return (
            <div
              key={g.docente_id}
              className={`rounded-xl border bg-white shadow-sm overflow-hidden transition-all ${
                expanded ? 'border-blue-200' : 'border-gray-200'
              }`}
            >
              {/* Fila del docente */}
              <div className={`flex items-center gap-4 px-5 py-4 ${expanded ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                {/* Avatar */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-sm">
                  {g.apellido[0]}{g.nombre[0]}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {g.apellido}, {g.nombre}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    {g.niveles.map(n => (
                      <span key={n} className={`rounded-full px-2 py-0.5 text-xs font-medium ${NIVEL_BADGE[n] ?? 'bg-gray-100 text-gray-600'}`}>
                        {n}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-6 text-center">
                  <div>
                    <p className="text-lg font-bold text-gray-800">{g.asignaciones.length}</p>
                    <p className="text-xs text-gray-400">materias</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-800">{g.horas_pedagogicas_total}</p>
                    <p className="text-xs text-gray-400">h/mes total</p>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openModalForDocente(g)}
                  >
                    + Agregar
                  </Button>
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : g.docente_id)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      expanded
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {expanded ? 'Cerrar' : 'Ver'}
                    <svg
                      className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
                      viewBox="0 0 20 20" fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Detalle expandido */}
              {expanded && (
                <div className="border-t border-blue-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="px-5 py-2.5">Materia</th>
                        <th className="px-5 py-2.5">Campo / Área</th>
                        <th className="px-5 py-2.5">Nivel</th>
                        <th className="px-5 py-2.5">Paralelo</th>
                        <th className="px-5 py-2.5 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {g.asignaciones.map(a => (
                        <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-2.5 font-medium text-gray-800">{a.materia.nombre}</td>
                          <td className="px-5 py-2.5 text-gray-500">{a.materia.campo.nombre}</td>
                          <td className="px-5 py-2.5">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${NIVEL_BADGE[a.materia.nivel.nombre] ?? 'bg-gray-100 text-gray-600'}`}>
                              {a.materia.nivel.nombre}
                            </span>
                          </td>
                          <td className="px-5 py-2.5 text-gray-700 font-medium">
                            {a.paralelo.grado.nombre} "{a.paralelo.letra}"
                          </td>
                          <td className="px-5 py-2.5 text-right">
                            <Button variant="danger" size="sm" onClick={() => handleDelete(a.id)}>
                              Eliminar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal de asignación en lote */}
      <Modal
        isOpen={modal}
        onClose={() => setModal(false)}
        maxWidth="xl"
        title={
          lockedDocente
            ? `Agregar asignaciones — ${lockedDocente.apellido}, ${lockedDocente.nombre}`
            : `Nueva asignación en lote — Gestión ${gestion?.anno ?? ''}`
        }
        footer={
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-500">
              {totalPairs > 0
                ? `${totalPairs} asignación${totalPairs !== 1 ? 'es' : ''} a crear`
                : 'Seleccionar paralelo y materias'}
            </span>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setModal(false)} disabled={saving}>Cancelar</Button>
              <Button form="form-lote" type="submit" loading={saving} disabled={!canSubmit}>
                {`Crear ${totalPairs > 0 ? totalPairs : ''} asignación${totalPairs !== 1 ? 'es' : ''}`}
              </Button>
            </div>
          </div>
        }
      >
        <form id="form-lote" onSubmit={handleSubmit}>
          {/* Docente — locked o selector */}
          <div className="mb-5">
            {lockedDocente ? (
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Docente</label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800">
                  <span className="font-semibold">{lockedDocente.apellido}, {lockedDocente.nombre}</span>
                </div>
              </div>
            ) : (
              <SelectDocente value={docenteId} onChange={setDocenteId} required />
            )}
          </div>

          {/* Bloques de paralelo */}
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
              className="w-full rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
            >
              + Agregar otro paralelo
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
