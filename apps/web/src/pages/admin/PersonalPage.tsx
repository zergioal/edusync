import { useState, useEffect, useCallback } from 'react'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../context/AuthContext'
import { ResetPasswordModal } from '../../components/ResetPasswordModal'
import { ROL_LABELS } from '../../lib/roleRoutes'
import { Rol } from '@edusync/types'
import { Button, Badge, Spinner } from '@edusync/ui'

// ─── Types ────────────────────────────────────────────────────────────────────

const ROLES_PERSONAL = [Rol.DIRECTOR, Rol.COORDINADOR, Rol.SECRETARIA, Rol.CONTADOR, Rol.REGENTE] as const

interface Nivel { id: string; nombre: string }

interface Personal {
  id:       string
  email:    string
  rol:      string
  nombre:   string
  apellido: string
  activo:   boolean
  alcance_niveles: { nivel: Nivel; es_bth: boolean }[]
}

// ─── Modal: crear / editar ────────────────────────────────────────────────────

function PersonalModal({ target, niveles, onClose, onSaved }: {
  target:  Personal | null // null = crear
  niveles: Nivel[]
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const [form, setForm] = useState({
    nombre:   target?.nombre   ?? '',
    apellido: target?.apellido ?? '',
    email:    target?.email    ?? '',
    rol:      target?.rol      ?? ('' as string),
  })
  const [nivelIds, setNivelIds] = useState<string[]>(target?.alcance_niveles.map(a => a.nivel.id) ?? [])
  const [esBTH, setEsBTH] = useState(target?.alcance_niveles.some(a => a.es_bth) ?? false)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const set = (k: 'nombre' | 'apellido' | 'email') => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const secundaria = niveles.find(n => n.nombre === 'SECUNDARIA')

  function toggleNivel(id: string) {
    setNivelIds(prev => prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id])
  }

  function toggleBTH() {
    setEsBTH(prev => {
      const next = !prev
      if (next && secundaria && !nivelIds.includes(secundaria.id)) {
        setNivelIds(ids => [...ids, secundaria.id])
      }
      return next
    })
  }

  const esCoordinador = form.rol === Rol.COORDINADOR

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      if (target) {
        await api.patch(`/personal/${target.id}`, {
          nombre: form.nombre, apellido: form.apellido,
          ...(esCoordinador ? { nivel_ids: nivelIds, es_bth: esBTH } : {}),
        })
        toast.success('Datos actualizados')
      } else {
        const res = await api.post<{ password: string }>('/personal', {
          nombre: form.nombre, apellido: form.apellido, email: form.email, rol: form.rol,
          ...(esCoordinador ? { nivel_ids: nivelIds, es_bth: esBTH } : {}),
        })
        toast.success(`Cuenta creada — contraseña: ${res.password}`)
      }
      onSaved(); onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-fg">{target ? 'Editar personal' : 'Registrar personal'}</h2>
          <button onClick={onClose} className="text-fg-muted hover:text-fg-muted text-xl leading-none">×</button>
        </div>

        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">Apellidos</span>
              <input required value={form.apellido} onChange={set('apellido')}
                className="rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">Nombres</span>
              <input required value={form.nombre} onChange={set('nombre')}
                className="rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand" />
            </label>
          </div>

          {!target && (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">Correo electrónico</span>
                <input required type="email" value={form.email} onChange={set('email')}
                  className="rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">Rol</span>
                <select required value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}
                  className="rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand">
                  <option value="">— Seleccionar —</option>
                  {ROLES_PERSONAL.map(r => <option key={r} value={r}>{ROL_LABELS[r]}</option>)}
                </select>
              </label>
            </>
          )}

          {esCoordinador && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">Niveles a cargo</span>
              <div className="flex flex-wrap gap-2">
                {niveles.map(n => (
                  <label key={n.id} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm cursor-pointer transition-colors ${
                    nivelIds.includes(n.id) ? 'border-brand bg-brand/10 text-fg' : 'border-border text-fg-muted hover:border-gray-400'
                  }`}>
                    <input type="checkbox" className="accent-brand" checked={nivelIds.includes(n.id)} onChange={() => toggleNivel(n.id)} />
                    {n.nombre}
                  </label>
                ))}
                <label className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm cursor-pointer transition-colors ${
                  esBTH ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-border text-fg-muted hover:border-gray-400'
                }`}>
                  <input type="checkbox" className="accent-amber-500" checked={esBTH} onChange={toggleBTH} />
                  BTH
                </label>
              </div>
              <p className="text-xs text-fg-muted">
                Sin ningún nivel marcado, esta persona genera reportes de todos los niveles sin restricción.
                "BTH" habilita además los reportes exclusivos de técnica especializada (incluye Secundaria).
              </p>
            </div>
          )}

          {!target && (
            <p className="text-xs text-fg-muted">La contraseña se genera automáticamente según el rol.</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" loading={saving} disabled={!target && !form.rol}>
              {target ? 'Guardar cambios' : 'Crear cuenta'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page principal ───────────────────────────────────────────────────────────

export default function PersonalPage() {
  const { user } = useAuth()
  const toast = useToast()
  const canManage = user?.rol === Rol.ADMIN_SISTEMA || user?.rol === Rol.DIRECTOR
  const canDelete = user?.rol === Rol.ADMIN_SISTEMA

  const [personal, setPersonal] = useState<Personal[]>([])
  const [niveles,  setNiveles]  = useState<Nivel[]>([])
  const [loading,  setLoading]  = useState(true)
  const [modal,        setModal]        = useState<'new' | Personal | null>(null)
  const [resetTarget,  setResetTarget]  = useState<Personal | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setPersonal(await api.get<Personal[]>('/personal'))
    } catch {
      toast.error('No se pudo cargar el personal')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    load()
    api.get<Nivel[]>('/niveles').then(setNiveles).catch(() => {})
  }, [load])

  async function handleDelete(p: Personal) {
    const nombre = `${p.apellido}, ${p.nombre}`
    if (!confirm(`¿Eliminar la cuenta de "${nombre}" (${ROL_LABELS[p.rol as Rol]})?\n\nEsta acción no se puede deshacer.`)) return
    try {
      await api.delete(`/personal/${p.id}`)
      toast.success(`Cuenta de "${nombre}" eliminada`)
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al eliminar')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">Gestión de Personal</h1>
          <p className="text-sm text-fg-muted mt-0.5">Director, Coordinador, Secretaría, Contador y Regente</p>
        </div>
        {canManage && <Button onClick={() => setModal('new')}>+ Registrar personal</Button>}
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-border bg-bg text-left text-xs font-semibold uppercase tracking-wide text-fg-muted">
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Apellidos y Nombres</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Niveles</th>
              <th className="px-4 py-3 text-center">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr><td colSpan={6} className="py-12 text-center"><Spinner /></td></tr>
            )}
            {!loading && personal.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-fg-muted">No hay personal registrado.</td></tr>
            )}
            {personal.map(p => (
              <tr key={p.id} className="hover:bg-surface-2 transition-colors">
                <td className="px-4 py-3"><Badge variant="info">{ROL_LABELS[p.rol as Rol]}</Badge></td>
                <td className="px-4 py-3 font-medium text-fg whitespace-nowrap">{p.apellido}, {p.nombre}</td>
                <td className="px-4 py-3 text-fg-muted text-xs">{p.email}</td>
                <td className="px-4 py-3">
                  {p.rol !== Rol.COORDINADOR ? (
                    <span className="text-xs text-fg-muted">—</span>
                  ) : p.alcance_niveles.length === 0 ? (
                    <span className="text-xs text-fg-muted italic">Todos</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {p.alcance_niveles.map(a => (
                        <span key={a.nivel.id} className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600 font-medium">
                          {a.nivel.nombre}
                        </span>
                      ))}
                      {p.alcance_niveles.some(a => a.es_bth) && (
                        <span className="inline-block rounded-md bg-amber-50 px-2 py-0.5 text-xs text-amber-600 font-medium border border-amber-200">
                          BTH
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {p.activo
                    ? <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Activo</span>
                    : <span className="text-xs font-medium text-fg-muted bg-surface-2 px-2 py-0.5 rounded-full">Inactivo</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                    {canManage && (
                      <Button variant="ghost" size="sm" onClick={() => setModal(p)}>Editar</Button>
                    )}
                    {canManage && (
                      <Button variant="ghost" size="sm" onClick={() => setResetTarget(p)}>Restablecer contraseña</Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(p)}>
                        ×
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <PersonalModal
          target={modal === 'new' ? null : modal}
          niveles={niveles}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
      {resetTarget && (
        <ResetPasswordModal
          target={{ id: resetTarget.id, nombre: resetTarget.nombre, apellido: resetTarget.apellido }}
          onClose={() => setResetTarget(null)}
        />
      )}
    </div>
  )
}
