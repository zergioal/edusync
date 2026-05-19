import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../context/AuthContext'
import { Button, Badge, Spinner } from '@edusync/ui'
import { SelectGestion } from '../../components/select/SelectGestion'
import { NuevoEstudianteModal } from './NuevoEstudianteModal'
import { Rol } from '@edusync/types'

const CAN_MANAGE_ROLES: string[] = [Rol.ADMIN_SISTEMA, Rol.DIRECTOR, Rol.COORDINADOR, Rol.SECRETARIA]

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParaleloCard {
  id:    string
  letra: string
  grado: { nombre: string; nivel: { nombre: string } }
}

interface Paralelo { id: string; letra: string; grado: { nombre: string; nivel: { nombre: string } } }
interface Estudiante {
  id:               string
  codigo:           string
  becado:           boolean
  motivo_beca:      string | null
  fecha_nacimiento: string | null
  usuario:          { nombre: string; apellido: string; email: string }
  matriculas:       { paralelo: Paralelo }[]
  relaciones_padre: { padre: { nombre: string; apellido: string } }[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ORDINAL_MAP: Record<string, string> = {
  primer: '1°', primero: '1°',
  segundo: '2°', segunda: '2°',
  tercer: '3°', tercero: '3°',
  cuarto: '4°', cuarta: '4°',
}

function abbreviateGrado(gradoNombre: string, letra: string): string {
  // "5° de Secundaria" → "5° A"
  const numMatch = gradoNombre.match(/^(\d+°)/)
  if (numMatch) return `${numMatch[1]} ${letra}`
  // "Primer año de Escolaridad" → "1° A"
  const first = gradoNombre.toLowerCase().split(' ')[0] ?? ''
  const num = ORDINAL_MAP[first]
  if (num) return `${num} ${letra}`
  return `${gradoNombre.slice(0, 4)} ${letra}`
}

// ─── Colores por nivel ────────────────────────────────────────────────────────

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

// ─── Modal de edición ─────────────────────────────────────────────────────────

interface EditModalProps {
  estudiante: Estudiante
  onClose:    () => void
  onSaved:    () => void
}

function EditarEstudianteModal({ estudiante, onClose, onSaved }: EditModalProps) {
  const toast  = useToast()
  const [form, setForm] = useState({
    apellido:         estudiante.usuario.apellido,
    nombre:           estudiante.usuario.nombre,
    codigo:           estudiante.codigo,
    fecha_nacimiento: estudiante.fecha_nacimiento
      ? new Date(estudiante.fecha_nacimiento).toISOString().split('T')[0]
      : '',
    becado:      estudiante.becado,
    motivo_beca: estudiante.motivo_beca ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const setField = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      await api.patch(`/estudiantes/${estudiante.id}`, {
        apellido:         form.apellido,
        nombre:           form.nombre,
        codigo:           form.codigo,
        fecha_nacimiento: form.fecha_nacimiento || null,
        becado:           form.becado,
        motivo_beca:      form.becado ? (form.motivo_beca || null) : null,
      })
      toast.success('Estudiante actualizado')
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Editar estudiante</h2>

        {error && <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Apellidos</span>
              <input required value={form.apellido} onChange={setField('apellido')}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombres</span>
              <input required value={form.nombre} onChange={setField('nombre')}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Correo electrónico</span>
            <input value={estudiante.usuario.email} disabled
              className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-400" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Código</span>
              <input required value={form.codigo} onChange={setField('codigo')}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha de nacimiento</span>
              <input type="date" value={form.fecha_nacimiento} onChange={setField('fecha_nacimiento')}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </label>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.becado}
                onChange={e => setForm(f => ({ ...f, becado: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-sm font-medium text-gray-700">Estudiante becado</span>
            </label>
            {form.becado && (
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Motivo de beca</span>
                <input value={form.motivo_beca} onChange={setField('motivo_beca')} maxLength={255}
                  placeholder="Ej: Beca por rendimiento académico"
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
              </label>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? '…' : 'Guardar cambios'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type View = 'cursos' | 'lista'

export default function EstudiantesPage({ basePath = '/dashboard/admin' }: { basePath?: string } = {}) {
  const navigate  = useNavigate()
  const toast     = useToast()
  const toastRef  = useRef(toast)
  toastRef.current = toast
  const { user }  = useAuth()
  const canManage = user?.rol ? CAN_MANAGE_ROLES.includes(user.rol) : false

  // Vista
  const [view,             setView]             = useState<View>('cursos')
  const [paralelos,        setParalelos]        = useState<ParaleloCard[]>([])
  const [loadingParalelos, setLoadingParalelos] = useState(true)
  const [selectedParalelo, setSelectedParalelo] = useState<ParaleloCard | null>(null)

  // Lista
  const [estudiantes,  setEstudiantes]  = useState<Estudiante[]>([])
  const [loading,      setLoading]      = useState(false)
  const [modalNuevo,   setModalNuevo]   = useState(false)
  const [editTarget,   setEditTarget]   = useState<Estudiante | null>(null)
  const [gestionId,    setGestionId]    = useState('')
  const [buscar,       setBuscar]       = useState('')
  const [buscarInput,  setBuscarInput]  = useState('')

  // Cargar paralelos para la grilla de cursos
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
      if (gestionId) qs.set('gestion_id', gestionId)
      if (buscar)    qs.set('buscar', buscar)
      setEstudiantes(await api.get<Estudiante[]>(`/estudiantes?${qs}`))
    } catch {
      toastRef.current.error('No se pudieron cargar los estudiantes')
    } finally {
      setLoading(false)
    }
  }, [selectedParalelo, gestionId, buscar])

  useEffect(() => { if (view === 'lista') load() }, [load, view])

  function selectCurso(p: ParaleloCard) {
    setSelectedParalelo(p)
    setBuscar(''); setBuscarInput(''); setGestionId('')
    setView('lista')
  }

  function backToCursos() {
    setView('cursos')
    setSelectedParalelo(null)
    setEstudiantes([])
  }

  async function handleDelete(est: Estudiante) {
    const nombre = `${est.usuario.apellido}, ${est.usuario.nombre}`
    if (!confirm(
      `ELIMINAR ESTUDIANTE\n\n"${nombre}"\n\nEsta acción eliminará permanentemente al estudiante y TODOS sus datos: notas, asistencias, matrículas, pensiones y relaciones con tutores.\n\n¿Confirmar eliminación?`
    )) return
    try {
      await api.delete(`/estudiantes/${est.id}`)
      toast.success(`Estudiante "${nombre}" eliminado`)
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al eliminar')
    }
  }

  const getParalelo = (est: Estudiante) => {
    const m = est.matriculas[0]
    if (!m) return '—'
    return `${m.paralelo.grado.nombre} "${m.paralelo.letra}"`
  }

  const getTutor = (est: Estudiante) => {
    const r = est.relaciones_padre[0]
    if (!r) return <span className="italic text-gray-400">Sin tutor</span>
    return `${r.padre.apellido}, ${r.padre.nombre}`
  }

  // ── VISTA: Grilla de cursos ──────────────────────────────────────────────────

  if (view === 'cursos') {
    // Agrupar por nivel
    const byNivel: Record<string, ParaleloCard[]> = {}
    for (const p of paralelos) {
      const n = p.grado.nivel.nombre
      ;(byNivel[n] ??= []).push(p)
    }
    const nivelOrder = ['INICIAL', 'PRIMARIA', 'SECUNDARIA']
    const niveles = nivelOrder.filter(n => byNivel[n])

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Estudiantes</h1>
            <p className="text-sm text-gray-400 mt-0.5">Selecciona un curso para ver su lista</p>
          </div>
          {canManage && (
            <Button onClick={() => setModalNuevo(true)}>+ Matricular estudiante</Button>
          )}
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

        <NuevoEstudianteModal isOpen={modalNuevo} onClose={() => setModalNuevo(false)} onSuccess={() => {}} />
      </div>
    )
  }

  // ── VISTA: Lista de estudiantes ──────────────────────────────────────────────

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
          </div>
          {canManage && <Button onClick={() => setModalNuevo(true)}>+ Matricular estudiante</Button>}
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap gap-4 items-end">
          <SelectGestion value={gestionId} onChange={setGestionId} label="Gestión" placeholder="— Todas —" />
          <form onSubmit={e => { e.preventDefault(); setBuscar(buscarInput) }} className="flex gap-2 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Buscar</label>
              <input type="text" value={buscarInput} onChange={e => setBuscarInput(e.target.value)}
                placeholder="Nombre o código..."
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 w-52" />
            </div>
            <Button type="submit" variant="secondary" size="sm">Buscar</Button>
            {buscar && (
              <Button type="button" variant="ghost" size="sm" onClick={() => { setBuscar(''); setBuscarInput('') }}>
                Limpiar
              </Button>
            )}
          </form>
        </div>
        <p className="text-sm text-gray-400">
          {!loading && `${estudiantes.length} estudiante${estudiantes.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
              <th className="px-3 py-3 w-10 text-center">N°</th>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Apellidos y Nombres</th>
              <th className="px-4 py-3 hidden md:table-cell">Tutor principal</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr><td colSpan={4} className="py-12 text-center"><Spinner /></td></tr>
            )}
            {!loading && estudiantes.length === 0 && (
              <tr>
                <td colSpan={4} className="py-12 text-center text-gray-400">
                  No hay estudiantes en este curso.
                </td>
              </tr>
            )}
            {estudiantes.map((est, idx) => (
              <tr key={est.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-3 py-3 text-center text-xs font-mono text-gray-400">{idx + 1}</td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded-lg text-gray-600 whitespace-nowrap">
                    {est.codigo}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="whitespace-nowrap">{est.usuario.apellido}, {est.usuario.nombre}</span>
                    {est.becado && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                        BECA
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 truncate max-w-[180px]">{est.usuario.email}</div>
                </td>
                <td className="px-4 py-3 text-gray-500 text-sm hidden md:table-cell">{getTutor(est)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1 flex-nowrap">
                    <Button variant="ghost" size="sm"
                      onClick={() => navigate(`${basePath}/estudiante/${est.id}`)}>
                      Perfil
                    </Button>
                    <Button variant="ghost" size="sm"
                      className="text-indigo-600 hover:text-indigo-800 hidden sm:inline-flex"
                      onClick={() => navigate(`${basePath}/estudiante/${est.id}?tab=calificaciones`)}>
                      Notas
                    </Button>
                    <Button variant="ghost" size="sm"
                      className="text-teal-600 hover:text-teal-800 hidden sm:inline-flex"
                      onClick={() => navigate(`${basePath}/estudiante/${est.id}?tab=asistencia`)}>
                      Asist.
                    </Button>
                    <Button variant="ghost" size="sm"
                      className="text-amber-600 hover:text-amber-800 hidden sm:inline-flex"
                      onClick={() => navigate(`${basePath}/estudiante/${est.id}?tab=pensiones`)}>
                      Pensión
                    </Button>
                    {canManage && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setEditTarget(est)}>
                          Editar
                        </Button>
                        <Button variant="ghost" size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDelete(est)}>
                          ×
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NuevoEstudianteModal
        isOpen={modalNuevo}
        onClose={() => setModalNuevo(false)}
        onSuccess={load}
      />
      {editTarget && (
        <EditarEstudianteModal
          estudiante={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
