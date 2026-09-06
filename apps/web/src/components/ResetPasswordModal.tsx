import { useState } from 'react'
import type { FormEvent } from 'react'
import { api, ApiError } from '../lib/api'
import { useToast } from './ui/Toast'
import { Button } from '@edusync/ui'

interface Target { id: string; nombre: string; apellido: string }

/** Modal para que personal administrativo restablezca la contraseña de un
 *  estudiante o padre/tutor (RN: solo esos dos roles pueden ser objetivo). */
export function ResetPasswordModal({ target, onClose }: { target: Target; onClose: () => void }) {
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    setSaving(true)
    try {
      await api.patch(`/usuarios/${target.id}/reset-password`, { password })
      toast.success('Contraseña actualizada')
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al restablecer la contraseña')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl space-y-4">
        <div>
          <h2 className="text-lg font-bold text-fg">Restablecer contraseña</h2>
          <p className="text-sm text-fg-muted mt-0.5">{target.apellido}, {target.nombre}</p>
        </div>

        {error && <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={submit} className="space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Nueva contraseña</span>
            <input
              type="text" required minLength={6} value={password}
              onChange={e => setPassword(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Confirmar contraseña</span>
            <input
              type="text" required minLength={6} value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
          <p className="text-xs text-fg-muted">La persona deberá usar esta nueva contraseña la próxima vez que inicie sesión.</p>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={saving}>Guardar</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
