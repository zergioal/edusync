import { useState, useEffect, useCallback, useRef } from 'react'
import { api, ApiError } from '../../lib/api'
import { useGestionActiva } from '../../hooks/useGestionActiva'
import { useToast } from '../../components/ui/Toast'
import { Modal } from '../../components/ui/Modal'
import { Button } from '@edusync/ui'
import { Spinner, Badge } from '@edusync/ui'
import { SelectNivel } from '../../components/select/SelectNivel'
import { SelectGrado } from '../../components/select/SelectGrado'
import { SelectDocente } from '../../components/select/SelectDocente'

// ─── Tipos ──────────────────────────��──────────────────────────────────��─────

interface Paralelo {
  id:     string
  letra:  string
  activo: boolean
  grado:  { id: string; nombre: string; nivel: { id: string; nombre: string } }
  asesor: { id: string; usuario: { nombre: string; apellido: string } } | null
  _count: { matriculas: number }
}

// ─── Form inicial ─────────────────────────────────────────────────────────────

const EMPTY_FORM = { nivel_id: '', grado_id: '', letra: '', asesor_id: '' }

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ParalelosPage() {
  const toast    = useToast()
  const toastRef = useRef(toast)
  const { gestionLabel } = useGestionActiva()
  toastRef.current = toast

  const [paralelos, setParalelos] = useState<Paralelo[]>([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState<'create' | 'edit' | null>(null)
  const [saving,    setSaving]    = useState(false)
  const [editId,    setEditId]    = useState<string | null>(null)
  const [form,      setForm]      = useState(EMPTY_FORM)

  // ── Carga inicial ────────────────────────────────────────────────────���─────

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setParalelos(await api.get<Paralelo[]>('/paralelos'))
    } catch {
      toastRef.current.error('No se pudieron cargar los paralelos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Crear ──────────────────────────────────────────────────────────────────

  const openCreate = () => { setForm(EMPTY_FORM); setEditId(null); setModal('create') }

  const openEdit = (p: Paralelo) => {
    setForm({
      nivel_id:  p.grado.nivel.id,
      grado_id:  p.grado.id,
      letra:     p.letra,
      asesor_id: p.asesor?.id ?? '',
    })
    setEditId(p.id)
    setModal('edit')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.grado_id || !form.letra) return
    setSaving(true)
    try {
      const payload = {
        grado_id:  form.grado_id,
        letra:     form.letra.toUpperCase(),
        asesor_id: form.asesor_id || undefined,
      }

      if (modal === 'create') {
        await api.post('/paralelos', payload)
        toastRef.current.success('Paralelo creado correctamente')
      } else {
        await api.put(`/paralelos/${editId}`, payload)
        toastRef.current.success('Paralelo actualizado')
      }

      setModal(null)
      load()
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (id: string, letra: string) => {
    if (!confirm(`¿Desactivar el paralelo "${letra}"? Esta acción es reversible.`)) return
    try {
      await api.delete(`/paralelos/${id}`)
      toastRef.current.success('Paralelo desactivado')
      load()
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : 'Error al desactivar')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cursos y Paralelos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de paralelos{gestionLabel ? ` — ${gestionLabel}` : ''}</p>
        </div>
        <Button onClick={openCreate}>+ Nuevo paralelo</Button>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-5 py-3">Nivel</th>
              <th className="px-5 py-3">Grado</th>
              <th className="px-5 py-3">Paralelo</th>
              <th className="px-5 py-3">Docente Asesor</th>
              <th className="px-5 py-3 text-center">Estudiantes</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr><td colSpan={6} className="py-12 text-center"><Spinner /></td></tr>
            )}
            {!loading && paralelos.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400">
                  No hay paralelos registrados. Crea el primero.
                </td>
              </tr>
            )}
            {paralelos.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3">
                  <Badge variant={
                    p.grado.nivel.nombre === 'INICIAL'   ? 'warning' :
                    p.grado.nivel.nombre === 'PRIMARIA'  ? 'info' : 'success'
                  }>
                    {p.grado.nivel.nombre}
                  </Badge>
                </td>
                <td className="px-5 py-3 font-medium text-gray-900">{p.grado.nombre}</td>
                <td className="px-5 py-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                    {p.letra}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-600">
                  {p.asesor
                    ? `${p.asesor.usuario.apellido}, ${p.asesor.usuario.nombre}`
                    : <span className="italic text-gray-400">Sin asignar</span>}
                </td>
                <td className="px-5 py-3 text-center">
                  <span className="font-semibold text-gray-700">{p._count.matriculas}</span>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeactivate(p.id, p.letra)}
                    >
                      Desactivar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal crear / editar */}
      <Modal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'Nuevo Paralelo' : 'Editar Paralelo'}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModal(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button form="form-paralelo" type="submit" loading={saving}>
              {modal === 'create' ? 'Crear paralelo' : 'Guardar cambios'}
            </Button>
          </div>
        }
      >
        <form id="form-paralelo" onSubmit={handleSubmit} className="space-y-4">
          <SelectNivel
            value={form.nivel_id}
            onChange={id => setForm(f => ({ ...f, nivel_id: id, grado_id: '' }))}
            required
          />
          <SelectGrado
            value={form.grado_id}
            onChange={id => setForm(f => ({ ...f, grado_id: id }))}
            nivelId={form.nivel_id}
            required
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Letra del paralelo</label>
            <input
              type="text"
              maxLength={1}
              value={form.letra}
              onChange={e => setForm(f => ({ ...f, letra: e.target.value.toUpperCase() }))}
              placeholder="A"
              required
              className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <SelectDocente
            value={form.asesor_id}
            onChange={id => setForm(f => ({ ...f, asesor_id: id }))}
            label="Docente Asesor (opcional)"
            placeholder="— Sin asesor —"
          />
        </form>
      </Modal>
    </div>
  )
}
