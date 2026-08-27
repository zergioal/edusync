import { useState } from 'react'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from './ui/Toast'
import { Button } from '@edusync/ui'

const GRADOS_SUGERIDOS = ['PhD', 'Dr.', 'Mgr.', 'MSc.', 'Prof.', 'Lic.', 'Ing.', 'T.S.']

interface Props { onClose: () => void }

export function EditarPerfilModal({ onClose }: Props) {
  const { user, refreshUser } = useAuth()
  const toast = useToast()

  const apellidoParts = (user?.apellido ?? '').trim().split(/\s+/)
  const [form, setForm] = useState({
    apellidoPaterno: apellidoParts[0] ?? '',
    apellidoMaterno: apellidoParts.slice(1).join(' '),
    nombre:          user?.nombre ?? '',
    gradoAcademico:  user?.grado_academico ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const setField = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      await api.patch('/usuarios/me', {
        apellido:        `${form.apellidoPaterno.trim()} ${form.apellidoMaterno.trim()}`.trim(),
        nombre:           form.nombre,
        grado_academico:  form.gradoAcademico.trim() || null,
      })
      await refreshUser()
      toast.success('Datos actualizados')
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-fg">Editar mis datos</h2>

        {error && <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Apellido Paterno</span>
              <input required value={form.apellidoPaterno} onChange={setField('apellidoPaterno')}
                className="rounded-xl border border-border px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Apellido Materno</span>
              <input value={form.apellidoMaterno} onChange={setField('apellidoMaterno')}
                className="rounded-xl border border-border px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Nombres</span>
            <input required value={form.nombre} onChange={setField('nombre')}
              className="rounded-xl border border-border px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Grado académico</span>
            <input
              value={form.gradoAcademico}
              onChange={setField('gradoAcademico')}
              list="grados-academicos-sugeridos"
              placeholder="Ej: Lic., Ing., MSc..."
              className="rounded-xl border border-border px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <datalist id="grados-academicos-sugeridos">
              {GRADOS_SUGERIDOS.map(g => <option key={g} value={g} />)}
            </datalist>
            <span className="text-xs text-fg-muted">Opcional — escribe el que corresponda a tu formación.</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? '…' : 'Guardar cambios'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
