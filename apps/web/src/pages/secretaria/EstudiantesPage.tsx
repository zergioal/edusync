import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../context/AuthContext'
import { Button, Badge, Spinner } from '@edusync/ui'
import { SelectGestion } from '../../components/select/SelectGestion'
import { SelectParalelo } from '../../components/select/SelectParalelo'
import { NuevoEstudianteModal } from './NuevoEstudianteModal'
import { Rol } from '@edusync/types'

const CAN_MANAGE_ROLES: string[] = [Rol.ADMIN_SISTEMA, Rol.DIRECTOR, Rol.COORDINADOR, Rol.SECRETARIA]

// ─── Types ────────────────────────────────────────────────────────────────────

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Editar estudiante</h2>

        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={submit} className="space-y-3">
          {/* Nombre */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Apellidos</span>
              <input
                required value={form.apellido} onChange={setField('apellido')}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Nombres</span>
              <input
                required value={form.nombre} onChange={setField('nombre')}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>

          {/* Email (solo lectura) */}
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Correo electrónico</span>
            <input
              value={estudiante.usuario.email} disabled
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400"
            />
          </label>

          {/* Código + Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Código</span>
              <input
                required value={form.codigo} onChange={setField('codigo')}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Fecha de nacimiento</span>
              <input
                type="date" value={form.fecha_nacimiento}
                onChange={setField('fecha_nacimiento')}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>

          {/* Beca */}
          <div className="rounded-lg border border-gray-200 p-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.becado}
                onChange={e => setForm(f => ({ ...f, becado: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Estudiante becado</span>
            </label>
            {form.becado && (
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Motivo de beca</span>
                <input
                  value={form.motivo_beca} onChange={setField('motivo_beca')}
                  maxLength={255}
                  placeholder="Ej: Beca por rendimiento académico"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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

export default function EstudiantesPage({ basePath = '/dashboard/admin' }: { basePath?: string } = {}) {
  const navigate  = useNavigate()
  const toast     = useToast()
  const toastRef  = useRef(toast)
  toastRef.current = toast
  const { user }  = useAuth()
  const canManage = user?.rol ? CAN_MANAGE_ROLES.includes(user.rol) : false

  const [estudiantes,  setEstudiantes]  = useState<Estudiante[]>([])
  const [loading,      setLoading]      = useState(true)
  const [modalNuevo,   setModalNuevo]   = useState(false)
  const [editTarget,   setEditTarget]   = useState<Estudiante | null>(null)

  const [gestionId,   setGestionId]   = useState('')
  const [paraleloId,  setParaleloId]  = useState('')
  const [buscar,      setBuscar]      = useState('')
  const [buscarInput, setBuscarInput] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (gestionId)  qs.set('gestion_id',  gestionId)
      if (paraleloId) qs.set('paralelo_id', paraleloId)
      if (buscar)     qs.set('buscar', buscar)
      setEstudiantes(await api.get<Estudiante[]>(`/estudiantes?${qs}`))
    } catch {
      toastRef.current.error('No se pudieron cargar los estudiantes')
    } finally {
      setLoading(false)
    }
  }, [gestionId, paraleloId, buscar])

  useEffect(() => { load() }, [load])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setBuscar(buscarInput)
  }

  async function handleDelete(est: Estudiante) {
    const nombre = `${est.usuario.apellido}, ${est.usuario.nombre}`
    if (!confirm(
      `⚠️ ELIMINAR ESTUDIANTE\n\n"${nombre}"\n\nEsta acción eliminará permanentemente al estudiante y TODOS sus datos: notas, asistencias, matrículas, pensiones y relaciones con tutores.\n\nEsta operación NO se puede deshacer.\n\n¿Confirmar eliminación?`
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estudiantes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Filiación y matrícula</p>
        </div>
        {canManage && <Button onClick={() => setModalNuevo(true)}>+ Matricular estudiante</Button>}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap gap-4 items-end">
          <SelectGestion value={gestionId} onChange={setGestionId} label="Gestión" placeholder="— Todas —" />
          <SelectParalelo value={paraleloId} onChange={setParaleloId} label="Paralelo" placeholder="— Todos —" />
          <form onSubmit={handleSearch} className="flex gap-2 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Buscar</label>
              <input
                type="text"
                value={buscarInput}
                onChange={e => setBuscarInput(e.target.value)}
                placeholder="Nombre o código..."
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">Buscar</Button>
            {buscar && (
              <Button type="button" variant="ghost" size="sm"
                onClick={() => { setBuscar(''); setBuscarInput('') }}>
                Limpiar
              </Button>
            )}
          </form>
        </div>
        <p className="text-sm text-gray-500">
          {!loading && `${estudiantes.length} estudiante${estudiantes.length !== 1 ? 's' : ''} encontrado${estudiantes.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-5 py-3">Código</th>
              <th className="px-5 py-3">Apellidos y Nombres</th>
              <th className="px-5 py-3">Paralelo</th>
              <th className="px-5 py-3">Tutor principal</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr><td colSpan={5} className="py-12 text-center"><Spinner /></td></tr>
            )}
            {!loading && estudiantes.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400">
                  No hay estudiantes con los filtros seleccionados.
                </td>
              </tr>
            )}
            {estudiantes.map(est => (
              <tr key={est.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3">
                  <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                    {est.codigo}
                  </span>
                </td>
                <td className="px-5 py-3 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <span>{est.usuario.apellido}, {est.usuario.nombre}</span>
                    {est.becado && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                        BECA
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">{est.usuario.email}</div>
                </td>
                <td className="px-5 py-3 text-gray-600">{getParalelo(est)}</td>
                <td className="px-5 py-3 text-gray-600">{getTutor(est)}</td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2 flex-wrap">
                    <Button variant="ghost" size="sm"
                      onClick={() => navigate(`${basePath}/estudiante/${est.id}`)}>
                      Perfil
                    </Button>
                    <Button variant="ghost" size="sm"
                      className="text-indigo-600 hover:text-indigo-800"
                      onClick={() => navigate(`${basePath}/estudiante/${est.id}?tab=calificaciones`)}>
                      Calificaciones
                    </Button>
                    <Button variant="ghost" size="sm"
                      className="text-teal-600 hover:text-teal-800"
                      onClick={() => navigate(`${basePath}/estudiante/${est.id}?tab=asistencia`)}>
                      Asistencia
                    </Button>
                    <Button variant="ghost" size="sm"
                      className="text-amber-600 hover:text-amber-800"
                      onClick={() => navigate(`${basePath}/estudiante/${est.id}?tab=pensiones`)}>
                      Pensiones
                    </Button>
                    {canManage && (
                      <Button variant="ghost" size="sm"
                        onClick={() => setEditTarget(est)}>
                        Editar
                      </Button>
                    )}
                    {canManage && (
                      <Button variant="ghost" size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(est)}>
                        Eliminar
                      </Button>
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
