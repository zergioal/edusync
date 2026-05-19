import { useState, useEffect, useCallback, useRef } from 'react'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { Button, Badge, Spinner } from '@edusync/ui'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParaleloCard {
  id:    string
  letra: string
  grado: { nombre: string; nivel: { nombre: string } }
}

interface Hijo {
  id:      string
  codigo:  string
  usuario: { nombre: string; apellido: string }
}

interface Padre {
  id:        string
  nombre:    string
  apellido:  string
  email:     string
  activo:    boolean
  hijos_a_cargo: { estudiante: Hijo }[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ORDINAL_MAP: Record<string, string> = {
  primer: '1°', primero: '1°',
  segundo: '2°', segunda: '2°',
  tercer: '3°', tercero: '3°',
  cuarto: '4°', cuarta: '4°',
}

function abbreviateGrado(gradoNombre: string, letra: string): string {
  const numMatch = gradoNombre.match(/^(\d+°)/)
  if (numMatch) return `${numMatch[1]} ${letra}`
  const first = gradoNombre.toLowerCase().split(' ')[0] ?? ''
  const num = ORDINAL_MAP[first]
  if (num) return `${num} ${letra}`
  return `${gradoNombre.slice(0, 4)} ${letra}`
}

// ─── Colores por nivel (mismo patrón que EstudiantesPage) ────────────────────

const NIVEL_STYLES: Record<string, {
  bg: string; border: string; hover: string
  badge: string; num: string; label: string
}> = {
  INICIAL: {
    bg: 'bg-emerald-50', border: 'border-emerald-200',
    hover: 'hover:bg-emerald-100 hover:border-emerald-400 hover:shadow-emerald-100',
    badge: 'bg-emerald-100 text-emerald-700', num: 'text-emerald-700', label: 'Inicial',
  },
  PRIMARIA: {
    bg: 'bg-sky-50', border: 'border-sky-200',
    hover: 'hover:bg-sky-100 hover:border-sky-400 hover:shadow-sky-100',
    badge: 'bg-sky-100 text-sky-700', num: 'text-sky-700', label: 'Primaria',
  },
  SECUNDARIA: {
    bg: 'bg-violet-50', border: 'border-violet-200',
    hover: 'hover:bg-violet-100 hover:border-violet-400 hover:shadow-violet-100',
    badge: 'bg-violet-100 text-violet-700', num: 'text-violet-800', label: 'Secundaria',
  },
}
const NIVEL_FALLBACK = {
  bg: 'bg-gray-50', border: 'border-gray-200',
  hover: 'hover:bg-gray-100 hover:border-gray-400 hover:shadow-gray-100',
  badge: 'bg-gray-100 text-gray-600', num: 'text-gray-700', label: '',
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function PadreModal({ padre, onClose, onSaved }: { padre: Padre | null; onClose: () => void; onSaved: () => void }) {
  const toast  = useToast()
  const isEdit = !!padre
  const [form, setForm] = useState({
    nombre:   padre?.nombre   ?? '',
    apellido: padre?.apellido ?? '',
    email:    padre?.email    ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      if (isEdit) {
        await api.put(`/padres/${padre!.id}`, { nombre: form.nombre, apellido: form.apellido })
        toast.success('Padre/tutor actualizado')
      } else {
        const res = await api.post<{ padre: Padre; credentials: { email: string; password: string } }>('/padres', form)
        toast.success(`Cuenta creada — contraseña: ${res.credentials.password}`)
      }
      onSaved(); onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-gray-900">
          {isEdit ? 'Editar padre / tutor' : 'Registrar padre / tutor'}
        </h2>
        {error && <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700">{error}</div>}
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Apellidos</span>
              <input required value={form.apellido} onChange={set('apellido')}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombres</span>
              <input required value={form.nombre} onChange={set('nombre')}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Correo electrónico</span>
            <input required type="email" value={form.email} onChange={set('email')} disabled={isEdit}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-50 disabled:text-gray-400" />
          </label>
          {!isEdit && (
            <p className="text-xs text-gray-400">
              Contraseña temporal: <code className="font-mono bg-gray-100 px-1 rounded">Padre2026#</code>
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? '…' : isEdit ? 'Guardar cambios' : 'Crear padre/tutor'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type View = 'cursos' | 'lista'

export default function PadresPage() {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [view,             setView]             = useState<View>('cursos')
  const [paralelos,        setParalelos]        = useState<ParaleloCard[]>([])
  const [loadingParalelos, setLoadingParalelos] = useState(true)
  const [selectedParalelo, setSelectedParalelo] = useState<ParaleloCard | null>(null)

  const [padres,      setPadres]      = useState<Padre[]>([])
  const [loading,     setLoading]     = useState(false)
  const [modal,       setModal]       = useState<'new' | Padre | null>(null)
  const [buscarInput, setBuscarInput] = useState('')
  const [buscar,      setBuscar]      = useState('')

  // Cargar paralelos para la grilla
  useEffect(() => {
    api.get<ParaleloCard[]>('/paralelos')
      .then(setParalelos)
      .catch(() => toastRef.current.error('No se pudieron cargar los cursos'))
      .finally(() => setLoadingParalelos(false))
  }, [])

  const load = useCallback(async () => {
    if (!selectedParalelo) return
    setLoading(true)
    try {
      const qs = new URLSearchParams({ paralelo_id: selectedParalelo.id })
      if (buscar) qs.set('buscar', buscar)
      setPadres(await api.get<Padre[]>(`/padres?${qs}`))
    } catch {
      toastRef.current.error('No se pudieron cargar los padres de familia')
    } finally {
      setLoading(false)
    }
  }, [selectedParalelo, buscar])

  useEffect(() => { if (view === 'lista') load() }, [load, view])

  function selectCurso(p: ParaleloCard) {
    setSelectedParalelo(p)
    setBuscar(''); setBuscarInput('')
    setView('lista')
  }

  function backToCursos() {
    setView('cursos')
    setSelectedParalelo(null)
    setPadres([])
  }

  async function handleDelete(p: Padre) {
    const nombre = `${p.apellido}, ${p.nombre}`
    if (!confirm(
      `ELIMINAR PADRE / TUTOR\n\n"${nombre}"\n\nSe eliminará la cuenta permanentemente, incluyendo el vínculo con sus hijos registrados.\n\n¿Confirmar eliminación?`
    )) return
    try {
      await api.delete(`/padres/${p.id}`)
      toast.success(`Padre/tutor "${nombre}" eliminado`)
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al eliminar')
    }
  }

  // ── VISTA: Grilla de cursos ──────────────────────────────────────────────────

  if (view === 'cursos') {
    const byNivel: Record<string, ParaleloCard[]> = {}
    for (const p of paralelos) {
      const n = p.grado.nivel.nombre;
      (byNivel[n] ??= []).push(p)
    }
    const nivelOrder = ['INICIAL', 'PRIMARIA', 'SECUNDARIA']
    const niveles = nivelOrder.filter(n => byNivel[n])

    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Padres / Tutores</h1>
            <p className="text-sm text-gray-400 mt-0.5">Selecciona un curso para ver los tutores del grado</p>
          </div>
          <Button onClick={() => setModal('new')}>+ Registrar padre/tutor</Button>
        </div>

        {loadingParalelos ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : (
          <div className="space-y-8">
            {niveles.map(nivelNombre => {
              const style = NIVEL_STYLES[nivelNombre] ?? NIVEL_FALLBACK
              const cards = byNivel[nivelNombre]!.sort((a, b) => {
                const numA = parseInt(a.grado.nombre.match(/\d+/)?.[0] ?? '0')
                const numB = parseInt(b.grado.nombre.match(/\d+/)?.[0] ?? '0')
                return numA !== numB ? numA - numB : a.letra.localeCompare(b.letra)
              })
              return (
                <div key={nivelNombre}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${style.badge}`}>
                      {style.label || nivelNombre}
                    </span>
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="text-xs text-gray-400">{cards.length} paralelos</span>
                  </div>
                  <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))' }}>
                    {cards.map(p => (
                      <button
                        key={p.id}
                        onClick={() => selectCurso(p)}
                        className={`flex flex-col items-center justify-center rounded-xl border-2 h-20 text-center transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${style.bg} ${style.border} ${style.hover}`}
                      >
                        <p className={`text-base font-extrabold leading-tight px-1 ${style.num}`}>
                          {abbreviateGrado(p.grado.nombre, p.letra)}
                        </p>
                        <p className="mt-1 text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                          {style.label || nivelNombre}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {modal !== null && (
          <PadreModal
            padre={modal === 'new' ? null : modal}
            onClose={() => setModal(null)}
            onSaved={() => {}}
          />
        )}
      </div>
    )
  }

  // ── VISTA: Lista de padres ───────────────────────────────────────────────────

  const style = NIVEL_STYLES[selectedParalelo?.grado.nivel.nombre ?? ''] ?? NIVEL_FALLBACK

  return (
    <div className="space-y-5">
      {/* Breadcrumb + header */}
      <div>
        <button
          onClick={backToCursos}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 transition-colors mb-3"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Todos los cursos
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${style.badge}`}>
              {style.label || selectedParalelo?.grado.nivel.nombre}
            </span>
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedParalelo?.grado.nombre} &ldquo;{selectedParalelo?.letra}&rdquo;
            </h1>
            <span className="text-sm text-gray-400">— Padres/Tutores</span>
          </div>
          <Button onClick={() => setModal('new')}>+ Registrar padre/tutor</Button>
        </div>
      </div>

      {/* Buscador */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <form onSubmit={e => { e.preventDefault(); setBuscar(buscarInput) }} className="flex gap-2 items-end">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Buscar</label>
            <input type="text" value={buscarInput} onChange={e => setBuscarInput(e.target.value)}
              placeholder="Nombre, apellido o correo…"
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </div>
          <Button type="submit" variant="secondary" size="sm">Buscar</Button>
          {buscar && (
            <Button type="button" variant="ghost" size="sm" onClick={() => { setBuscar(''); setBuscarInput('') }}>
              Limpiar
            </Button>
          )}
        </form>
        <p className="text-sm text-gray-400 mt-2">
          {!loading && `${padres.length} padre${padres.length !== 1 ? 's' : ''} / tutor${padres.length !== 1 ? 'es' : ''}`}
        </p>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
              <th className="px-3 py-3 w-10 text-center">N°</th>
              <th className="px-4 py-3">Apellidos y Nombres</th>
              <th className="px-4 py-3 hidden sm:table-cell">Correo</th>
              <th className="px-4 py-3 hidden md:table-cell">Hijos vinculados</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr><td colSpan={5} className="py-12 text-center"><Spinner /></td></tr>
            )}
            {!loading && padres.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400">
                  No hay padres/tutores vinculados a este curso.
                </td>
              </tr>
            )}
            {padres.map((p, idx) => (
              <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-3 py-3 text-center text-xs font-mono text-gray-400">{idx + 1}</td>
                <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{p.apellido}, {p.nombre}</td>
                <td className="px-4 py-3 text-gray-400 text-xs hidden sm:table-cell">{p.email}</td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {p.hijos_a_cargo.length === 0 ? (
                    <span className="italic text-gray-400 text-xs">Sin hijos vinculados</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {p.hijos_a_cargo.map(rel => (
                        <Badge key={rel.estudiante.id} variant="info">
                          {rel.estudiante.usuario.apellido}, {rel.estudiante.usuario.nombre}
                        </Badge>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => setModal(p)}>Editar</Button>
                    <Button variant="ghost" size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(p)}>
                      ×
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <PadreModal
          padre={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
