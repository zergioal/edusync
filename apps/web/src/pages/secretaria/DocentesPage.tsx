import { useState, useEffect, useCallback, useRef } from 'react'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { Button, Spinner } from '@edusync/ui'
import { SelectGestion } from '../../components/select/SelectGestion'
import { SelectParalelo, type Paralelo } from '../../components/select/SelectParalelo'
import { SelectMateria } from '../../components/select/SelectMateria'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function abbreviateCurso(gradoNombre: string, letra: string): string {
  const m = gradoNombre.match(/^(\d+°)\s+de\s+(Inicial|Primaria|Secundaria)$/)
  if (!m) return `${gradoNombre} ${letra}`
  const abbr = m[2] === 'Secundaria' ? 'Sec' : m[2] === 'Primaria' ? 'Pri' : 'Ini'
  return `${m[1]} ${abbr} ${letra}`
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AsignacionResumen {
  id:       string
  materia:  {
    nombre:          string
    horas_semanales: number | null
    carga_horaria:   { grado_id: string; horas_mes: number }[]
  }
  paralelo: { letra: string; grado: { id: string; nombre: string } }
  gestion:  { anno: number }
}

interface DocenteResumen {
  id:       string
  usuario:  { id: string; nombre: string; apellido: string; email: string }
  asignaciones: AsignacionResumen[]
}

interface AsignacionDetalle {
  id:       string
  materia:  { nombre: string; campo: { nombre: string } }
  paralelo: { letra: string; grado: { nombre: string; nivel: { nombre: string } } }
  gestion:  { anno: number }
}

interface DocenteDetalle {
  id:          string
  usuario_id:  string
  usuario:     { id: string; nombre: string; apellido: string; email: string }
  asignaciones: AsignacionDetalle[]
}

// ─── Modal: crear nuevo docente ───────────────────────────────────────────────

function NuevoDocenteModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [form, setForm]   = useState({ nombre: '', apellido: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const res = await api.post<{ docente: DocenteResumen; credentials: { email: string; password: string } }>(
        '/docentes', form,
      )
      toast.success(`Cuenta creada — contraseña: ${res.credentials.password}`)
      onSaved(); onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Registrar docente</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Apellidos</span>
              <input required value={form.apellido} onChange={set('apellido')}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Nombres</span>
              <input required value={form.nombre} onChange={set('nombre')}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Correo electrónico</span>
            <input required type="email" value={form.email} onChange={set('email')}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </label>
          <p className="text-xs text-gray-400">Contraseña temporal: <code className="font-mono">Docente2026#</code></p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" loading={saving}>Crear docente</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal: perfil completo de docente existente ──────────────────────────────

type PerfilTab = 'datos' | 'asignaciones'

function DocentePerfilModal({ docenteId, onClose, onSaved }: {
  docenteId: string
  onClose:   () => void
  onSaved:   () => void
}) {
  const toast = useToast()
  const [tab,     setTab]     = useState<PerfilTab>('datos')
  const [doc,     setDoc]     = useState<DocenteDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  const loadDoc = useCallback(async () => {
    try {
      setDoc(await api.get<DocenteDetalle>(`/docentes/${docenteId}`))
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [docenteId])

  useEffect(() => { loadDoc() }, [loadDoc])

  async function handleDelete() {
    if (!doc) return
    const nombre = `${doc.usuario.apellido}, ${doc.usuario.nombre}`
    if (!confirm(
      `ELIMINAR DOCENTE\n\n"${nombre}"\n\nSe eliminarán permanentemente:\n• Su cuenta de acceso\n• Todas sus asignaciones\n• Sus calificaciones e indicadores registrados\n\n¿Confirmar?`
    )) return
    setDeleting(true)
    try {
      await api.delete(`/docentes/${docenteId}`)
      toast.success(`Docente "${nombre}" eliminado`)
      onSaved(); onClose()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al eliminar')
      setDeleting(false)
    }
  }

  const nombre = doc ? `${doc.usuario.apellido}, ${doc.usuario.nombre}` : '…'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Perfil docente</p>
            <h2 className="text-lg font-bold text-gray-900">{nombre}</h2>
            {doc && <p className="text-sm text-gray-400 mt-0.5">{doc.usuario.email}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none mt-0.5">×</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 pb-0">
          {(['datos', 'asignaciones'] as PerfilTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium capitalize transition-all border-b-2 ${
                tab === t ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'datos' ? 'Datos' : `Asignaciones${doc ? ` (${doc.asignaciones.length})` : ''}`}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading
            ? <div className="flex justify-center py-10"><Spinner /></div>
            : doc && tab === 'datos'
              ? <DatosTab doc={doc} onSaved={() => { onSaved(); loadDoc() }} />
              : doc && <AsignacionesTab doc={doc} onChanged={loadDoc} />
          }
        </div>

        {/* Footer: delete */}
        <div className="border-t border-gray-100 px-6 py-3 flex justify-end">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-50 transition-colors"
          >
            {deleting ? 'Eliminando…' : 'Eliminar docente'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-tab: Datos personales ────────────────────────────────────────────────

function DatosTab({ doc, onSaved }: { doc: DocenteDetalle; onSaved: () => void }) {
  const toast = useToast()
  const [form, setForm]   = useState({ nombre: doc.usuario.nombre, apellido: doc.usuario.apellido, email: doc.usuario.email })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      await api.put(`/docentes/${doc.id}`, form)
      toast.success('Datos actualizados')
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Apellidos</span>
          <input required value={form.apellido} onChange={set('apellido')}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Nombres</span>
          <input required value={form.nombre} onChange={set('nombre')}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Correo electrónico</span>
        <input required type="email" value={form.email} onChange={set('email')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <p className="text-xs text-gray-400">El correo se actualizará también en la cuenta de acceso.</p>
      </label>
      <div className="flex justify-end">
        <Button type="submit" loading={saving}>Guardar cambios</Button>
      </div>
    </form>
  )
}

// ─── Sub-tab: Asignaciones ────────────────────────────────────────────────────

function AsignacionesTab({ doc, onChanged }: { doc: DocenteDetalle; onChanged: () => void }) {
  const toast = useToast()
  const [removing, setRemoving] = useState<string | null>(null)

  // Form: nueva asignación
  const [gestionId,  setGestionId]   = useState('')
  const [paraleloId, setParaleloId]  = useState('')
  const [nivelId,    setNivelId]     = useState('')
  const [materiaId,  setMateriaId]   = useState('')
  const [adding,     setAdding]      = useState(false)

  const handleParalelo = (p: Paralelo | null) => {
    setNivelId(p?.grado.nivel.id ?? '')
    setMateriaId('')
  }

  async function removeAsig(id: string) {
    setRemoving(id)
    try {
      await api.delete(`/asignaciones/${id}`)
      toast.success('Asignación eliminada')
      onChanged()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error')
    } finally {
      setRemoving(null)
    }
  }

  async function addAsig(e: React.FormEvent) {
    e.preventDefault()
    if (!gestionId || !paraleloId || !materiaId) return
    setAdding(true)
    try {
      await api.post('/asignaciones', {
        docente_id:  doc.id,
        materia_id:  materiaId,
        paralelo_id: paraleloId,
        gestion_id:  gestionId,
      })
      toast.success('Asignación agregada')
      setMateriaId(''); setParaleloId(''); setNivelId(''); setGestionId('')
      onChanged()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al agregar')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Lista actual */}
      {doc.asignaciones.length === 0
        ? <p className="text-sm text-gray-400 italic">Sin asignaciones registradas.</p>
        : (
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-2.5">Materia</th>
                  <th className="px-4 py-2.5">Paralelo</th>
                  <th className="px-4 py-2.5">Gestión</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {doc.asignaciones.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-gray-800">{a.materia.nombre}</p>
                      <p className="text-xs text-gray-400">{a.materia.campo.nombre}</p>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {a.paralelo?.grado?.nivel?.nombre} · {a.paralelo?.grado?.nombre} "{a.paralelo?.letra}"
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{a.gestion.anno}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => removeAsig(a.id)}
                        disabled={removing === a.id}
                        className="text-red-400 hover:text-red-600 text-xs font-medium disabled:opacity-50"
                      >
                        {removing === a.id ? '…' : 'Quitar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      {/* Formulario: agregar asignación */}
      <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/40 p-4 space-y-3">
        <p className="text-sm font-semibold text-blue-800">Agregar asignación</p>
        <form onSubmit={addAsig} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <SelectGestion value={gestionId} onChange={setGestionId} label="Gestión" />
            <SelectParalelo
              value={paraleloId}
              onChange={setParaleloId}
              onParaleloChange={handleParalelo}
              label="Paralelo"
              placeholder="— Seleccionar paralelo —"
            />
          </div>
          <SelectMateria
            value={materiaId}
            onChange={setMateriaId}
            {...(nivelId ? { nivelId } : {})}
            label="Materia"
            disabled={!paraleloId}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              loading={adding}
              disabled={!gestionId || !paraleloId || !materiaId}
              size="sm"
            >
              Agregar
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page principal ───────────────────────────────────────────────────────────

export default function DocentesPage() {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [docentes,    setDocentes]    = useState<DocenteResumen[]>([])
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState<'new' | string | null>(null)  // 'new' | docente.id
  const [buscarInput, setBuscarInput] = useState('')
  const [buscar,      setBuscar]      = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = buscar ? `?buscar=${encodeURIComponent(buscar)}` : ''
      setDocentes(await api.get<DocenteResumen[]>(`/docentes${qs}`))
    } catch {
      toastRef.current.error('No se pudieron cargar los docentes')
    } finally {
      setLoading(false)
    }
  }, [buscar])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Docentes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registro y gestión del cuerpo docente</p>
        </div>
        <Button onClick={() => setModal('new')}>+ Registrar docente</Button>
      </div>

      {/* Buscador */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <form onSubmit={e => { e.preventDefault(); setBuscar(buscarInput) }} className="flex gap-2 items-end">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Buscar</label>
            <input
              type="text" value={buscarInput} onChange={e => setBuscarInput(e.target.value)}
              placeholder="Nombre, apellido o correo…"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">Buscar</Button>
          {buscar && (
            <Button type="button" variant="ghost" size="sm" onClick={() => { setBuscar(''); setBuscarInput('') }}>
              Limpiar
            </Button>
          )}
        </form>
        <p className="text-sm text-gray-500 mt-2">
          {!loading && `${docentes.length} docente${docentes.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
              <th className="px-4 py-3 text-center w-10">N°</th>
              <th className="px-4 py-3">Apellidos y Nombres</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Materias asignadas</th>
              <th className="px-4 py-3 text-center">Hs/mes</th>
              <th className="px-4 py-3">Cursos</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr><td colSpan={7} className="py-12 text-center"><Spinner /></td></tr>
            )}
            {!loading && docentes.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-400">No hay docentes registrados.</td>
              </tr>
            )}
            {docentes.map((doc, idx) => {
              const materias = [...new Set(doc.asignaciones.map(a => a.materia?.nombre).filter(Boolean))]
              const horasMes = doc.asignaciones.reduce((s, a) => {
                const ch = a.materia?.carga_horaria?.find(c => c.grado_id === a.paralelo?.grado?.id)
                return s + (ch?.horas_mes ?? (a.materia?.horas_semanales ?? 0) * 4)
              }, 0)
              const cursos     = [...new Set(doc.asignaciones.map(a =>
                abbreviateCurso(a.paralelo?.grado?.nombre ?? '', a.paralelo?.letra ?? '')
              ))]
              return (
                <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors align-top">
                  <td className="px-4 py-3 text-center text-xs font-mono text-gray-400 select-none">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                    {doc.usuario.apellido}, {doc.usuario.nombre}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{doc.usuario.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {materias.slice(0, 2).map(m => (
                        <span key={m} className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{m}</span>
                      ))}
                      {materias.length > 2 && (
                        <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-400">+{materias.length - 2} más</span>
                      )}
                      {materias.length === 0 && <span className="text-xs text-gray-300 italic">Sin materias</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {horasMes > 0
                      ? <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600">{horasMes} h</span>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {cursos.slice(0, 3).map(c => (
                        <span key={c} className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600 font-medium">{c}</span>
                      ))}
                      {cursos.length > 3 && (
                        <span className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-xs text-indigo-400">+{cursos.length - 3}</span>
                      )}
                      {cursos.length === 0 && <span className="text-xs text-gray-300 italic">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setModal(doc.id)}>
                      Ver perfil
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal === 'new' && (
        <NuevoDocenteModal onClose={() => setModal(null)} onSaved={load} />
      )}
      {modal && modal !== 'new' && (
        <DocentePerfilModal docenteId={modal} onClose={() => setModal(null)} onSaved={load} />
      )}
    </div>
  )
}
