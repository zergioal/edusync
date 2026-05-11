import { useState, useEffect, useRef } from 'react'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { Button, Spinner, Badge } from '@edusync/ui'

interface Institucion {
  id:         string
  nombre:     string
  subdominio: string
  logo_url:   string | null
  activa:     boolean
}

interface FormData {
  nombre:     string
  subdominio: string
  logo_url:   string
}

const EMPTY_FORM: FormData = { nombre: '', subdominio: '', logo_url: '' }

// ─── Modal ────────────────────────────────────────────────────────────────────

function InstModal({
  inst, onClose, onSaved,
}: {
  inst:    Institucion | null
  onClose: () => void
  onSaved: (i: Institucion) => void
}) {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [form,   setForm]   = useState<FormData>(
    inst ? { nombre: inst.nombre, subdominio: inst.subdominio, logo_url: inst.logo_url ?? '' } : EMPTY_FORM,
  )
  const [saving, setSaving] = useState(false)

  const set = (field: keyof FormData, val: string) => setForm(f => ({ ...f, [field]: val }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        nombre:     form.nombre.trim(),
        subdominio: form.subdominio.trim().toLowerCase(),
        ...(form.logo_url.trim() ? { logo_url: form.logo_url.trim() } : {}),
      }
      const saved: Institucion = inst
        ? await api.patch(`/instituciones/${inst.id}`, payload)
        : await api.post('/instituciones', payload)
      toastRef.current.success(inst ? 'Institución actualizada' : 'Institución creada')
      onSaved(saved)
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            {inst ? 'Editar institución' : 'Nueva institución'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 px-6 py-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.nombre}
              onChange={e => set('nombre', e.target.value)}
              placeholder="Unidad Educativa Ejemplo"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subdominio <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-1">
              <input
                required
                value={form.subdominio}
                onChange={e => set('subdominio', e.target.value.replace(/[^a-z0-9-]/g, ''))}
                placeholder="ue-ejemplo"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-400">.edusync.bo</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">Solo minúsculas, números y guiones.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL (opcional)</label>
            <input
              type="url"
              value={form.logo_url}
              onChange={e => set('logo_url', e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={saving}>{inst ? 'Guardar cambios' : 'Crear'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function InstitucionesPage() {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [insts,    setInsts]    = useState<Institucion[]>([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState<'new' | Institucion | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    api.get<Institucion[]>('/instituciones')
      .then(setInsts)
      .catch(() => toastRef.current.error('Error cargando instituciones'))
      .finally(() => setLoading(false))
  }, [])

  const handleSaved = (saved: Institucion) => {
    setInsts(prev => {
      const idx = prev.findIndex(i => i.id === saved.id)
      return idx >= 0 ? prev.map((i, j) => j === idx ? saved : i) : [saved, ...prev]
    })
    setModal(null)
  }

  const toggleActiva = async (inst: Institucion) => {
    setToggling(inst.id)
    try {
      const updated: Institucion = await api.patch(`/instituciones/${inst.id}`, { activa: !inst.activa })
      setInsts(prev => prev.map(i => i.id === inst.id ? updated : i))
      toastRef.current.success(updated.activa ? 'Institución activada' : 'Institución desactivada')
    } catch {
      toastRef.current.error('Error al cambiar estado')
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Instituciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión multi-tenant de unidades educativas</p>
        </div>
        <Button onClick={() => setModal('new')}>+ Nueva institución</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : insts.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white py-16 text-center">
          <p className="text-gray-400">No hay instituciones registradas.</p>
          <button
            type="button"
            onClick={() => setModal('new')}
            className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Crear la primera
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Nombre</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Subdominio</th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Estado</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {insts.map(inst => (
                <tr key={inst.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {inst.logo_url ? (
                        <img src={inst.logo_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                          {inst.nombre.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-gray-900">{inst.nombre}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 font-mono text-xs">
                    {inst.subdominio}.edusync.bo
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <Badge variant={inst.activa ? 'success' : 'default'}>
                      {inst.activa ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setModal(inst)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={toggling === inst.id}
                        onClick={() => toggleActiva(inst)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                          inst.activa
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {toggling === inst.id ? '...' : inst.activa ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && (
        <InstModal
          inst={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
