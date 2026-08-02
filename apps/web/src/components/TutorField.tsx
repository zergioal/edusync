import { useState, useRef, useEffect, useCallback } from 'react'
import { api } from '../lib/api'

export interface TutorMatch {
  id:       string
  nombre:   string
  apellido: string
  email:    string
}

export function TutorField({
  label, nombre, setNombre, tel, setTel, email, setEmail,
  existing, setExisting, required,
}: {
  label:       string
  nombre:      string
  setNombre:   (v: string) => void
  tel:         string
  setTel:      (v: string) => void
  email:       string
  setEmail:    (v: string) => void
  existing:    TutorMatch | null
  setExisting: (t: TutorMatch | null) => void
  required?:   boolean
}) {
  const [suggestions, setSuggestions] = useState<TutorMatch[]>([])
  const [open, setOpen]               = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef  = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
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
      const data = await api.get<TutorMatch[]>(
        `/usuarios?rol=PADRE_TUTOR&buscar=${encodeURIComponent(q)}`
      )
      setSuggestions(data)
      setOpen(data.length > 0)
    } catch {
      setSuggestions([])
    }
  }, [])

  const handleNombreChange = (v: string) => {
    setNombre(v)
    setExisting(null)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(v), 300)
  }

  const select = (t: TutorMatch) => {
    setExisting(t)
    setNombre(`${t.apellido}, ${t.nombre}`)
    setEmail(t.email)
    setSuggestions([])
    setOpen(false)
  }

  const deselect = () => {
    setExisting(null)
    setNombre('')
    setEmail('')
    setTel('')
  }

  const inputCls = 'rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">{label}</h3>

      {/* Nombre con autocomplete */}
      <div className="flex flex-col gap-1" ref={wrapRef}>
        <label className="text-sm font-medium text-gray-700">
          Apellidos y Nombres {required ? '*' : ''}
          {!existing && (
            <span className="ml-1 text-xs font-normal text-gray-400">— escribe para buscar existentes</span>
          )}
        </label>

        {existing ? (
          // Card de tutor seleccionado
          <div className="flex items-center justify-between rounded-lg border-2 border-blue-200 bg-blue-50 px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-blue-900">{existing.apellido}, {existing.nombre}</p>
              <p className="text-xs text-blue-600">{existing.email}</p>
            </div>
            <button
              type="button"
              onClick={deselect}
              className="ml-3 text-blue-400 hover:text-blue-700 transition-colors text-lg leading-none"
              title="Cambiar tutor"
            >
              ×
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              value={nombre}
              onChange={e => handleNombreChange(e.target.value)}
              required={required}
              placeholder="Apellidos, Nombres"
              className={inputCls}
              autoComplete="off"
            />
            {open && suggestions.length > 0 && (
              <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100">
                  Padres / tutores existentes
                </p>
                {suggestions.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => select(t)}
                    className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <p className="text-sm font-medium text-gray-900">{t.apellido}, {t.nombre}</p>
                    <p className="text-xs text-gray-400">{t.email}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Teléfono — siempre visible, pero readonly si existe */}
      {!existing && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Teléfono {required ? '*' : ''}</label>
          <input type="tel" value={tel} onChange={e => setTel(e.target.value)} required={required}
            placeholder="7XXXXXXX"
            className={`${inputCls} w-48`} />
        </div>
      )}

      {/* Email — oculto si ya está pre-llenado y es existente */}
      {!existing && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Correo electrónico</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="padre@ejemplo.com"
            className={inputCls} />
        </div>
      )}
    </div>
  )
}
