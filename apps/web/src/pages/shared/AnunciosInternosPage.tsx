import { useState, useEffect, useRef } from 'react'
import { api, ApiError } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { Modal } from '../../components/ui/Modal'
import { Button, Badge, Spinner } from '@edusync/ui'

interface Anuncio {
  id:           string
  titulo:       string
  contenido:    string
  visible_para: string
  destacado:    boolean
  publicado_en: string
  activo:       boolean
  autor:        { nombre: string; apellido: string; rol: string }
  paralelo:     { letra: string; grado: { nombre: string } } | null
}

const CAN_PUBLISH = new Set(['DIRECTOR', 'COORDINADOR', 'SECRETARIA', 'REGENTE', 'DOCENTE', 'ADMIN_SISTEMA'])

const VISIBLE_LABELS: Record<string, string> = {
  TODOS:       'Todos',
  DOCENTES:    'Docentes',
  ESTUDIANTES: 'Estudiantes',
  PPFF:        'Padres/Tutores',
  INTERNOS:    'Internos',
  PARALELO:    'Paralelo',
}

export default function AnunciosInternosPage() {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast
  const { user } = useAuth()

  const [anuncios,  setAnuncios]  = useState<Anuncio[]>([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(false)
  const [ver,       setVer]       = useState<Anuncio | null>(null)
  const [saving,    setSaving]    = useState(false)
  const [form,      setForm]      = useState({ titulo: '', contenido: '', visible_para: 'TODOS', destacado: false })

  const canPublish = user ? CAN_PUBLISH.has(user.rol) : false

  function load() {
    setLoading(true)
    api.get<Anuncio[]>('/anuncios')
      .then(setAnuncios)
      .catch(() => toastRef.current.error('Error al cargar anuncios'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/anuncios', form)
      toastRef.current.success('Anuncio publicado')
      setModal(false)
      setForm({ titulo: '', contenido: '', visible_para: 'TODOS', destacado: false })
      load()
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : 'Error al publicar')
    } finally {
      setSaving(false)
    }
  }

  function formatFecha(s: string) {
    return new Date(s).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comunicados Internos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Anuncios y comunicados de la institución</p>
        </div>
        {canPublish && (
          <Button onClick={() => setModal(true)}>+ Nuevo comunicado</Button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : anuncios.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm px-5 py-12 text-center text-sm text-gray-400">
          No hay comunicados publicados
        </div>
      ) : (
        <div className="space-y-3">
          {anuncios.map(a => (
            <div
              key={a.id}
              onClick={() => setVer(a)}
              className={`cursor-pointer rounded-xl border bg-white shadow-sm p-5 hover:border-blue-200 transition-colors ${
                a.destacado ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.destacado && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        Destacado
                      </span>
                    )}
                    <h3 className="font-semibold text-gray-900 truncate">{a.titulo}</h3>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{a.contenido}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                    <span>{a.autor.apellido}, {a.autor.nombre}</span>
                    <span>·</span>
                    <span>{formatFecha(a.publicado_en)}</span>
                  </div>
                </div>
                <Badge variant="info">{VISIBLE_LABELS[a.visible_para] ?? a.visible_para}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal ver detalle */}
      <Modal
        isOpen={ver !== null}
        onClose={() => setVer(null)}
        title={ver?.titulo ?? ''}
        footer={<Button variant="secondary" onClick={() => setVer(null)}>Cerrar</Button>}
      >
        {ver && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>Por: {ver.autor.apellido}, {ver.autor.nombre}</span>
              <span>·</span>
              <span>{formatFecha(ver.publicado_en)}</span>
              <Badge variant="info">{VISIBLE_LABELS[ver.visible_para] ?? ver.visible_para}</Badge>
            </div>
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
              {ver.contenido}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal publicar */}
      <Modal
        isOpen={modal}
        onClose={() => setModal(false)}
        title="Nuevo Comunicado"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModal(false)} disabled={saving}>Cancelar</Button>
            <Button form="form-anuncio" type="submit" loading={saving}>Publicar</Button>
          </div>
        }
      >
        <form id="form-anuncio" onSubmit={handleSubmit} className="space-y-4">
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
            <label className="text-sm font-medium text-gray-700">Contenido</label>
            <textarea
              value={form.contenido}
              onChange={e => setForm(f => ({ ...f, contenido: e.target.value }))}
              required
              rows={5}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Visible para</label>
            <select
              value={form.visible_para}
              onChange={e => setForm(f => ({ ...f, visible_para: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(VISIBLE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.destacado}
              onChange={e => setForm(f => ({ ...f, destacado: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm text-gray-700">Marcar como destacado</span>
          </label>
        </form>
      </Modal>
    </div>
  )
}
