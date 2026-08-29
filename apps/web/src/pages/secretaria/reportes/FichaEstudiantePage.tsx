import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api, apiDownload } from '../../../lib/api'

interface EstudianteMatch {
  id: string; codigo: string
  usuario: { nombre: string; apellido: string }
}

interface Ficha {
  datos_personales: {
    nombre: string; apellido: string; email: string; telefono: string | null
    codigo: string; fecha_nacimiento: string | null; sexo: 'M' | 'F' | null
    becado: boolean; motivo_beca: string | null
  }
  matriculas: Array<{ anno: number; nivel: string; grado: string; paralelo: string; estado: string; lleva_tecnica: boolean }>
  tutores: Array<{ nombre: string; apellido: string; email: string; telefono: string | null }>
}

const ESTADO_BADGE: Record<string, string> = {
  ACTIVO: 'bg-emerald-100 text-emerald-700', RETIRADO: 'bg-rose-100 text-rose-700', TRASLADADO: 'bg-amber-100 text-amber-700',
}

export default function FichaEstudiantePage() {
  const [query,       setQuery]       = useState('')
  const [suggestions, setSuggestions] = useState<EstudianteMatch[]>([])
  const [open,        setOpen]        = useState(false)
  const [selected,    setSelected]    = useState<EstudianteMatch | null>(null)
  const [ficha,        setFicha]        = useState<Ficha | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [downloading,  setDownloading]  = useState(false)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); setOpen(false); return }
    try {
      const data = await api.get<EstudianteMatch[]>(`/estudiantes?buscar=${encodeURIComponent(q)}`)
      setSuggestions(data)
      setOpen(data.length > 0)
    } catch { setSuggestions([]) }
  }, [])

  function handleQueryChange(v: string) {
    setQuery(v)
    setSelected(null)
    setFicha(null)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(v), 300)
  }

  async function select(est: EstudianteMatch) {
    setSelected(est)
    setQuery(`${est.usuario.apellido}, ${est.usuario.nombre}`)
    setSuggestions([]); setOpen(false)
    setLoading(true); setError('')
    try {
      setFicha(await api.get<Ficha>(`/reportes/ficha-estudiante/${est.id}`))
    } catch {
      setError('No se pudo cargar la ficha del estudiante')
    } finally { setLoading(false) }
  }

  async function descargarPdf() {
    if (!selected) return
    setDownloading(true)
    try {
      await apiDownload(`/reportes/ficha-estudiante/pdf/${selected.id}`, `ficha_${selected.codigo}.pdf`)
    } finally { setDownloading(false) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to=".." className="text-sm text-blue-600 hover:underline">← Reportes</Link>
        <h1 className="text-xl font-bold text-fg">🪪 Ficha Individual del Estudiante</h1>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="relative max-w-md" ref={wrapRef}>
          <label className="text-sm font-medium text-fg">Buscar estudiante</label>
          <input
            type="text"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder="Nombre o apellido…"
            autoComplete="off"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
          />
          {open && suggestions.length > 0 && (
            <div className="absolute z-50 mt-1 w-full bg-surface rounded-xl border border-border shadow-lg overflow-hidden">
              {suggestions.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => select(s)}
                  className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                >
                  <p className="text-sm font-medium text-fg">{s.usuario.apellido}, {s.usuario.nombre}</p>
                  <p className="text-xs text-fg-muted font-mono">{s.codigo}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading && <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-fg-muted">Cargando ficha…</div>}
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {ficha && !loading && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={descargarPdf} disabled={downloading}
              className="rounded-lg border border-blue-600 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-50">
              {downloading ? '…' : '📄 Descargar PDF'}
            </button>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted mb-3">Datos personales</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-fg-muted">Nombre completo:</span> <span className="font-medium">{ficha.datos_personales.apellido}, {ficha.datos_personales.nombre}</span></div>
              <div><span className="text-fg-muted">Código:</span> <span className="font-mono">{ficha.datos_personales.codigo}</span></div>
              <div><span className="text-fg-muted">Correo:</span> {ficha.datos_personales.email}</div>
              <div><span className="text-fg-muted">Teléfono:</span> {ficha.datos_personales.telefono ?? '—'}</div>
              <div><span className="text-fg-muted">Fecha de nacimiento:</span> {ficha.datos_personales.fecha_nacimiento ? new Date(ficha.datos_personales.fecha_nacimiento).toLocaleDateString('es-BO') : '—'}</div>
              <div><span className="text-fg-muted">Sexo:</span> {ficha.datos_personales.sexo === 'M' ? 'Masculino' : ficha.datos_personales.sexo === 'F' ? 'Femenino' : '—'}</div>
              <div className="col-span-2">
                <span className="text-fg-muted">Becado:</span> {ficha.datos_personales.becado ? `Sí${ficha.datos_personales.motivo_beca ? ' — ' + ficha.datos_personales.motivo_beca : ''}` : 'No'}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted mb-3">Historial de matrículas</h2>
            {ficha.matriculas.length === 0 ? (
              <p className="text-sm text-fg-muted italic">Sin matrículas registradas</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-fg-muted border-b border-border">
                    <th className="pb-2">Gestión</th><th className="pb-2">Nivel</th><th className="pb-2">Grado</th>
                    <th className="pb-2">Paralelo</th><th className="pb-2">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ficha.matriculas.map((m, i) => (
                    <tr key={i}>
                      <td className="py-2 font-medium">{m.anno}</td>
                      <td className="py-2">{m.nivel}</td>
                      <td className="py-2">{m.grado}</td>
                      <td className="py-2">{m.paralelo}</td>
                      <td className="py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_BADGE[m.estado] ?? ''}`}>{m.estado}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted mb-3">Padres / Tutores</h2>
            {ficha.tutores.length === 0 ? (
              <p className="text-sm text-fg-muted italic">Sin tutores registrados</p>
            ) : (
              <div className="space-y-2">
                {ficha.tutores.map((t, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-medium">{t.apellido}, {t.nombre}</span>
                    <span className="text-fg-muted"> — {t.email}{t.telefono ? ` · ${t.telefono}` : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
