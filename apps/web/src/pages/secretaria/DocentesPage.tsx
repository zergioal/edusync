import { useState, useEffect, useCallback, useRef } from 'react'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { Button, Spinner } from '@edusync/ui'

interface Docente {
  id:       string
  usuario:  { id: string; nombre: string; apellido: string; email: string }
  asignaciones: { id: string }[]
}

interface ModalProps {
  docente:  Docente | null
  onClose:  () => void
  onSaved:  () => void
  institucionId?: string
}

function DocenteModal({ docente, onClose, onSaved }: ModalProps) {
  const toast   = useToast()
  const isEdit  = !!docente
  const [form, setForm] = useState({
    nombre:   docente?.usuario.nombre   ?? '',
    apellido: docente?.usuario.apellido ?? '',
    email:    docente?.usuario.email    ?? '',
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
        await api.put(`/docentes/${docente!.id}`, form)
        toast.success('Docente actualizado')
      } else {
        const res = await api.post<{ docente: Docente; credentials: { email: string; password: string } }>(
          '/docentes', form,
        )
        toast.success(`Cuenta creada — contraseña temporal: ${res.credentials.password}`)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.stopPropagation()}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-gray-900">
          {isEdit ? 'Editar docente' : 'Registrar docente'}
        </h2>

        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Apellidos</span>
              <input
                required value={form.apellido} onChange={set('apellido')}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Nombres</span>
              <input
                required value={form.nombre} onChange={set('nombre')}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Correo electrónico</span>
            <input
              required type="email" value={form.email} onChange={set('email')}
              disabled={isEdit}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </label>
          {!isEdit && (
            <p className="text-xs text-gray-400">
              Se creará la cuenta con contraseña temporal <code className="font-mono">Docente2026#</code>
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? '…' : isEdit ? 'Guardar cambios' : 'Crear docente'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function DocentesPage() {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [docentes, setDocentes] = useState<Docente[]>([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState<'new' | Docente | null>(null)
  const [buscarInput, setBuscarInput] = useState('')
  const [buscar,      setBuscar]      = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = buscar ? `?buscar=${encodeURIComponent(buscar)}` : ''
      setDocentes(await api.get<Docente[]>(`/docentes${qs}`))
    } catch {
      toastRef.current.error('No se pudieron cargar los docentes')
    } finally {
      setLoading(false)
    }
  }, [buscar])

  useEffect(() => { load() }, [load])

  async function handleDeactivate(doc: Docente) {
    if (!confirm(`¿Dar de baja a ${doc.usuario.apellido}, ${doc.usuario.nombre}?`)) return
    try {
      await api.delete(`/docentes/${doc.id}`)
      toast.success('Docente dado de baja')
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al dar de baja')
    }
  }

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
        <form
          onSubmit={e => { e.preventDefault(); setBuscar(buscarInput) }}
          className="flex gap-2 items-end"
        >
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Buscar</label>
            <input
              type="text"
              value={buscarInput}
              onChange={e => setBuscarInput(e.target.value)}
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
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-5 py-3">Apellidos y Nombres</th>
              <th className="px-5 py-3">Correo</th>
              <th className="px-5 py-3 text-center">Asignaciones</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr><td colSpan={4} className="py-12 text-center"><Spinner /></td></tr>
            )}
            {!loading && docentes.length === 0 && (
              <tr>
                <td colSpan={4} className="py-12 text-center text-gray-400">
                  No hay docentes registrados.
                </td>
              </tr>
            )}
            {docentes.map(doc => (
              <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-900">
                  {doc.usuario.apellido}, {doc.usuario.nombre}
                </td>
                <td className="px-5 py-3 text-gray-500">{doc.usuario.email}</td>
                <td className="px-5 py-3 text-center">
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    {doc.asignaciones.length}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setModal(doc)}>Editar</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeactivate(doc)}
                      className="text-red-500 hover:text-red-700">
                      Dar de baja
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <DocenteModal
          docente={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
