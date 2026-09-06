import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from './ui/Toast'
import { Button } from '@edusync/ui'

/** Modal de autoservicio: cualquier usuario logueado cambia su propia contraseña. */
export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const toast = useToast()
  const [actual,  setActual]  = useState('')
  const [nueva,   setNueva]   = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (nueva.length < 6) { setError('La nueva contraseña debe tener al menos 6 caracteres'); return }
    if (nueva !== confirm) { setError('Las contraseñas nuevas no coinciden'); return }
    if (!user?.email) { setError('No se pudo identificar tu cuenta'); return }

    setSaving(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password: actual })
      if (authError) { setError('La contraseña actual no es correcta'); setSaving(false); return }

      const { error: updateError } = await supabase.auth.updateUser({ password: nueva })
      if (updateError) { setError('No se pudo actualizar la contraseña'); setSaving(false); return }

      toast.success('Contraseña actualizada')
      onClose()
    } catch {
      setError('Error al cambiar la contraseña')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-fg">Cambiar contraseña</h2>

        {error && <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={submit} className="space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Contraseña actual</span>
            <input
              type="password" required value={actual}
              onChange={e => setActual(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Nueva contraseña</span>
            <input
              type="password" required minLength={6} value={nueva}
              onChange={e => setNueva(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Confirmar nueva contraseña</span>
            <input
              type="password" required minLength={6} value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={saving}>Guardar</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
