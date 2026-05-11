import { useState, useEffect, useRef } from 'react'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { Modal } from '../../components/ui/Modal'
import { Button, Spinner, Badge } from '@edusync/ui'

interface Asignacion {
  id:      string
  materia: { nombre: string }
  paralelo: { letra: string; grado: { nombre: string } }
}

interface Tarea {
  id:            string
  titulo:        string
  descripcion:   string | null
  fecha_entrega: string
  publicado_en:  string
  activo:        boolean
  asignacion: {
    materia:  { nombre: string }
    paralelo: { letra: string; grado: { nombre: string } }
  }
}

const EMPTY_FORM = { asignacion_id: '', titulo: '', descripcion: '', fecha_entrega: '' }

function diasRestantes(fecha: string): number {
  return Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000)
}

export default function TareasPage() {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [tareas,      setTareas]      = useState<Tarea[]>([])
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [filtro,      setFiltro]      = useState('')
  const [form,        setForm]        = useState(EMPTY_FORM)

  function load() {
    setLoading(true)
    Promise.all([
      api.get<Tarea[]>('/tareas'),
      api.get<Asignacion[]>('/asignaciones/mias'),
    ])
      .then(([t, a]) => { setTareas(t); setAsignaciones(a) })
      .catch(() => toastRef.current.error('Error al cargar tareas'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/tareas', form)
      toastRef.current.success('Tarea publicada')
      setModal(false)
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : 'Error al publicar')
    } finally {
      setSaving(false)
    }
  }

  const filtradas = filtro ? tareas.filter(t => t.asignacion.materia.nombre === filtro) : tareas

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Tareas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tareas publicadas a tus paralelos</p>
        </div>
        <Button onClick={() => setModal(true)}>+ Nueva tarea</Button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFiltro('')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            !filtro ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Todas
        </button>
        {[...new Set(tareas.map(t => t.asignacion.materia.nombre))].map(m => (
          <button
            key={m}
            onClick={() => setFiltro(m)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filtro === m ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : filtradas.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white px-5 py-12 text-center text-sm text-gray-400 shadow-sm">
          No hay tareas publicadas. Crea la primera.
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(t => {
            const dias = diasRestantes(t.fecha_entrega)
            return (
              <div key={t.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{t.titulo}</h3>
                      <Badge variant="info">{t.asignacion.materia.nombre}</Badge>
                      <span className="text-xs text-gray-400">
                        {t.asignacion.paralelo.grado.nombre} "{t.asignacion.paralelo.letra}"
                      </span>
                    </div>
                    {t.descripcion && (
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">{t.descripcion}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-xs font-semibold ${dias < 0 ? 'text-red-500' : dias <= 2 ? 'text-amber-500' : 'text-green-600'}`}>
                      {dias < 0 ? `Vencida hace ${-dias}d` : dias === 0 ? 'Vence hoy' : `${dias}d restantes`}
                    </span>
                    <span className="text-xs text-gray-400">
                      Entrega: {new Date(t.fecha_entrega).toLocaleDateString('es-BO')}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal nueva tarea */}
      <Modal
        isOpen={modal}
        onClose={() => setModal(false)}
        title="Nueva Tarea"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModal(false)} disabled={saving}>Cancelar</Button>
            <Button form="form-tarea" type="submit" loading={saving}>Publicar tarea</Button>
          </div>
        }
      >
        <form id="form-tarea" onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Materia / Paralelo</label>
            <select
              value={form.asignacion_id}
              onChange={e => setForm(f => ({ ...f, asignacion_id: e.target.value }))}
              required
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Seleccionar —</option>
              {asignaciones.map(a => (
                <option key={a.id} value={a.id}>
                  {a.materia.nombre} — {a.paralelo.grado.nombre} "{a.paralelo.letra}"
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Título</label>
            <input
              type="text"
              value={form.titulo}
              onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              required
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Descripción (opcional)</label>
            <textarea
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              rows={3}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Fecha de entrega</label>
            <input
              type="date"
              value={form.fecha_entrega}
              onChange={e => setForm(f => ({ ...f, fecha_entrega: e.target.value }))}
              required
              min={new Date().toISOString().slice(0, 10)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}
