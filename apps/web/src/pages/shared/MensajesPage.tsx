import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { Modal } from '../../components/ui/Modal'
import { Button, Spinner, Badge } from '@edusync/ui'
import { ROL_LABELS } from '../../lib/roleRoutes'

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
  rol:      keyof typeof ROL_LABELS
  email:    string
}

export default function MensajesPage() {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast
  const [searchParams, setSearchParams] = useSearchParams()

  const [bandeja,   setBandeja]   = useState<Bandeja>({ recibidos: [], enviados: [] })
  const [tab,       setTab]       = useState<'recibidos' | 'enviados'>('recibidos')
  const [selected,  setSelected]  = useState<MensajeItem | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [compose,   setCompose]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [form,      setForm]      = useState({ asunto: '', cuerpo: '' })

  // ── Búsqueda de destinatario ─────────────────────────────────────────────
  const [destQuery,       setDestQuery]       = useState('')
  const [destSuggestions, setDestSuggestions] = useState<UsuarioSearch[]>([])
  const [destOpen,        setDestOpen]        = useState(false)
  const [destinatario,    setDestinatario]    = useState<UsuarioSearch | null>(null)
  const destTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const destWrapRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (destWrapRef.current && !destWrapRef.current.contains(e.target as Node)) setDestOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const buscarDestinatarios = useCallback(async (q: string) => {
    if (q.length < 2) { setDestSuggestions([]); setDestOpen(false); return }
    try {
      const data = await api.get<UsuarioSearch[]>(`/usuarios?buscar=${encodeURIComponent(q)}`)
      setDestSuggestions(data)
      setDestOpen(data.length > 0)
    } catch {
      setDestSuggestions([])
    }
  }, [])

  const handleDestQueryChange = (v: string) => {
    setDestQuery(v)
    setDestinatario(null)
    if (destTimerRef.current) clearTimeout(destTimerRef.current)
    destTimerRef.current = setTimeout(() => buscarDestinatarios(v), 300)
  }

  function resetCompose() {
    setForm({ asunto: '', cuerpo: '' })
    setDestinatario(null); setDestQuery(''); setDestSuggestions([])
  }

  function load() {
    setLoading(true)
    api.get<Bandeja>('/mensajes/bandeja')
      .then(setBandeja)
      .catch(() => toastRef.current.error('Error al cargar mensajes'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  // Abrir un mensaje específico si se llegó desde una notificación (?mensajeId=...)
  useEffect(() => {
    const mensajeId = searchParams.get('mensajeId')
    if (!mensajeId) return
    api.get<MensajeItem>(`/mensajes/${mensajeId}`)
      .then(m => { setSelected(m); load() })
      .catch(() => toastRef.current.error('No se pudo abrir el mensaje'))
      .finally(() => setSearchParams({}, { replace: true }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function abrirMensaje(m: MensajeItem) {
    setSelected(m)
    if (!m.leido && tab === 'recibidos') {
      await api.get(`/mensajes/${m.id}`).catch(() => {})
      load()
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!destinatario || !form.asunto || !form.cuerpo) return
    setSaving(true)
    try {
      await api.post('/mensajes', { destinatario_id: destinatario.id, asunto: form.asunto, cuerpo: form.cuerpo })
      toastRef.current.success('Mensaje enviado')
      setCompose(false)
      resetCompose()
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
        onClose={() => { setCompose(false); resetCompose() }}
        title="Nuevo mensaje"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setCompose(false); resetCompose() }} disabled={saving}>Cancelar</Button>
            <Button form="form-mensaje" type="submit" loading={saving} disabled={!destinatario}>Enviar</Button>
          </div>
        }
      >
        <form id="form-mensaje" onSubmit={enviar} className="space-y-4">
          <div className="flex flex-col gap-1" ref={destWrapRef}>
            <label className="text-sm font-medium text-gray-700">Para</label>
            {destinatario ? (
              <div className="flex items-center justify-between rounded-lg border-2 border-blue-200 bg-blue-50 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-blue-900">{destinatario.apellido}, {destinatario.nombre}</p>
                  <p className="text-xs text-blue-600">{ROL_LABELS[destinatario.rol]} · {destinatario.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setDestinatario(null); setDestQuery('') }}
                  className="ml-3 text-blue-400 hover:text-blue-700 transition-colors text-lg leading-none"
                  title="Cambiar destinatario"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={destQuery}
                  onChange={e => handleDestQueryChange(e.target.value)}
                  required
                  placeholder="Escribe un nombre o apellido para buscar…"
                  autoComplete="off"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-full focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {destOpen && destSuggestions.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-lg">
                    {destSuggestions.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => { setDestinatario(u); setDestQuery(''); setDestSuggestions([]); setDestOpen(false) }}
                        className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <p className="text-sm font-medium text-gray-900">{u.apellido}, {u.nombre}</p>
                        <p className="text-xs text-gray-400">{ROL_LABELS[u.rol]} · {u.email}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
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
