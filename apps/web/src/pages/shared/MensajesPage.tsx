import { useState, useEffect, useRef } from 'react'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { Modal } from '../../components/ui/Modal'
import { Button, Spinner, Badge } from '@edusync/ui'

interface MensajeItem {
  id:              string
  asunto:          string
  cuerpo:          string
  leido:           boolean
  enviado_en:      string
  remitente?:      { nombre: string; apellido: string; rol: string }
  destinatario?:   { nombre: string; apellido: string; rol: string }
}

interface Bandeja {
  recibidos: MensajeItem[]
  enviados:  MensajeItem[]
}

interface UsuarioSearch {
  id:       string
  nombre:   string
  apellido: string
  rol:      string
  email:    string
}

export default function MensajesPage() {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [bandeja,   setBandeja]   = useState<Bandeja>({ recibidos: [], enviados: [] })
  const [tab,       setTab]       = useState<'recibidos' | 'enviados'>('recibidos')
  const [selected,  setSelected]  = useState<MensajeItem | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [compose,   setCompose]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [usuarios,  setUsuarios]  = useState<UsuarioSearch[]>([])
  const [form,      setForm]      = useState({ destinatario_id: '', asunto: '', cuerpo: '' })

  function load() {
    setLoading(true)
    api.get<Bandeja>('/mensajes/bandeja')
      .then(setBandeja)
      .catch(() => toastRef.current.error('Error al cargar mensajes'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  useEffect(() => {
    if (compose && usuarios.length === 0) {
      api.get<UsuarioSearch[]>('/usuarios')
        .then(setUsuarios)
        .catch(() => {})
    }
  }, [compose, usuarios.length])

  async function abrirMensaje(m: MensajeItem) {
    setSelected(m)
    if (!m.leido && tab === 'recibidos') {
      await api.get(`/mensajes/${m.id}`).catch(() => {})
      load()
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.destinatario_id || !form.asunto || !form.cuerpo) return
    setSaving(true)
    try {
      await api.post('/mensajes', form)
      toastRef.current.success('Mensaje enviado')
      setCompose(false)
      setForm({ destinatario_id: '', asunto: '', cuerpo: '' })
      load()
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : 'Error al enviar')
    } finally {
      setSaving(false)
    }
  }

  function fmt(s: string) {
    return new Date(s).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const lista = tab === 'recibidos' ? bandeja.recibidos : bandeja.enviados

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mensajes</h1>
        <Button onClick={() => setCompose(true)}>Nuevo mensaje</Button>
      </div>

      <div className="flex gap-4 h-[calc(100vh-14rem)]">
        {/* Panel izquierdo: lista */}
        <div className="w-72 flex-shrink-0 flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {(['recibidos', 'enviados'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  tab === t ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'recibidos' ? 'Recibidos' : 'Enviados'}
                {t === 'recibidos' && bandeja.recibidos.filter(m => !m.leido).length > 0 && (
                  <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                    {bandeja.recibidos.filter(m => !m.leido).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex flex-1 items-center justify-center"><Spinner /></div>
          ) : lista.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
              Sin mensajes
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {lista.map(m => (
                <button
                  key={m.id}
                  onClick={() => abrirMensaje(m)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                    selected?.id === m.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm truncate ${!m.leido && tab === 'recibidos' ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {m.asunto}
                    </p>
                    {!m.leido && tab === 'recibidos' && (
                      <span className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-500 mt-1.5" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {tab === 'recibidos'
                      ? `De: ${m.remitente?.apellido}, ${m.remitente?.nombre}`
                      : `Para: ${m.destinatario?.apellido}, ${m.destinatario?.nombre}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{fmt(m.enviado_en)}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Panel derecho: detalle */}
        <div className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm overflow-y-auto p-6">
          {selected ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">{selected.asunto}</h2>
              <div className="flex items-center gap-4 text-sm text-gray-500 pb-4 border-b border-gray-100">
                {selected.remitente && (
                  <span>De: <span className="font-medium text-gray-700">{selected.remitente.apellido}, {selected.remitente.nombre}</span></span>
                )}
                {selected.destinatario && (
                  <span>Para: <span className="font-medium text-gray-700">{selected.destinatario.apellido}, {selected.destinatario.nombre}</span></span>
                )}
                <span>{fmt(selected.enviado_en)}</span>
              </div>
              <div className="whitespace-pre-wrap text-sm text-gray-700">{selected.cuerpo}</div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              Selecciona un mensaje para leerlo
            </div>
          )}
        </div>
      </div>

      {/* Modal compose */}
      <Modal
        isOpen={compose}
        onClose={() => setCompose(false)}
        title="Nuevo mensaje"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setCompose(false)} disabled={saving}>Cancelar</Button>
            <Button form="form-mensaje" type="submit" loading={saving}>Enviar</Button>
          </div>
        }
      >
        <form id="form-mensaje" onSubmit={enviar} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Para</label>
            <select
              value={form.destinatario_id}
              onChange={e => setForm(f => ({ ...f, destinatario_id: e.target.value }))}
              required
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Seleccionar destinatario —</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>{u.apellido}, {u.nombre} ({u.rol})</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Asunto</label>
            <input
              type="text"
              value={form.asunto}
              onChange={e => setForm(f => ({ ...f, asunto: e.target.value }))}
              required
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Mensaje</label>
            <textarea
              value={form.cuerpo}
              onChange={e => setForm(f => ({ ...f, cuerpo: e.target.value }))}
              required
              rows={5}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}
