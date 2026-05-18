import { useState, useEffect, useCallback, useRef } from 'react'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { Button, Badge, Spinner } from '@edusync/ui'

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  padre:   Padre | null
  onClose: () => void
  onSaved: () => void
}

function PadreModal({ padre, onClose, onSaved }: ModalProps) {
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
        const res = await api.post<{ padre: Padre; credentials: { email: string; password: string } }>(
          '/padres', form,
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
          {isEdit ? 'Editar padre / tutor' : 'Registrar padre / tutor'}
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
              Se creará la cuenta con contraseña temporal <code className="font-mono">Padre2026#</code>
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

export default function PadresPage() {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [padres,      setPadres]      = useState<Padre[]>([])
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState<'new' | Padre | null>(null)
  const [buscarInput, setBuscarInput] = useState('')
  const [buscar,      setBuscar]      = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = buscar ? `?buscar=${encodeURIComponent(buscar)}` : ''
      setPadres(await api.get<Padre[]>(`/padres${qs}`))
    } catch {
      toastRef.current.error('No se pudieron cargar los padres de familia')
    } finally {
      setLoading(false)
    }
  }, [buscar])

  useEffect(() => { load() }, [load])

  async function handleDelete(p: Padre) {
    const nombre = `${p.apellido}, ${p.nombre}`
    if (!confirm(
      `⚠️ ELIMINAR PADRE / TUTOR\n\n"${nombre}"\n\nSe eliminará la cuenta permanentemente, incluyendo el vínculo con sus hijos registrados.\n\n¿Confirmar eliminación?`
    )) return
    try {
      await api.delete(`/padres/${p.id}`)
      toast.success(`Padre/tutor "${nombre}" eliminado`)
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al eliminar')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Padres / Tutores</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de cuentas de padres de familia</p>
        </div>
        <Button onClick={() => setModal('new')}>+ Registrar padre/tutor</Button>
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
          {!loading && `${padres.length} padre${padres.length !== 1 ? 's' : ''} / tutor${padres.length !== 1 ? 'es' : ''}`}
        </p>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-5 py-3">Apellidos y Nombres</th>
              <th className="px-5 py-3">Correo</th>
              <th className="px-5 py-3">Hijos vinculados</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr><td colSpan={4} className="py-12 text-center"><Spinner /></td></tr>
            )}
            {!loading && padres.length === 0 && (
              <tr>
                <td colSpan={4} className="py-12 text-center text-gray-400">
                  No hay padres/tutores registrados.
                </td>
              </tr>
            )}
            {padres.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-900">
                  {p.apellido}, {p.nombre}
                </td>
                <td className="px-5 py-3 text-gray-500">{p.email}</td>
                <td className="px-5 py-3">
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
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setModal(p)}>Editar</Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(p)}
                    >
                      Eliminar
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
