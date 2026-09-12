import { useState, useEffect, useRef } from 'react'
import { api } from '../../lib/api'

export interface Paralelo {
  id:    string
  letra: string
  grado: { nombre: string; orden: number; nivel: { id: string; nombre: string } }
}

interface Props {
  value:               string
  onChange:            (id: string) => void
  onParaleloChange?:   (paralelo: Paralelo | null) => void
  gradoId?:            string
  required?:           boolean
  label?:              string
  disabled?:           boolean
  placeholder?:        string
  /** Si viene con elementos, solo se muestran paralelos de esos niveles (ej.
   *  coordinador con alcance restringido). La seguridad real la da el backend —
   *  esto es solo para no ofrecer opciones que igual serían rechazadas. */
  nivelesPermitidos?: string[] | undefined
  /** Si viene con elementos, solo se muestran paralelos cuyo grado.orden esté en la lista
   *  (ej. reportes exclusivos de BTH, que solo aplican a 5to y 6to). */
  gradoOrdenes?: number[] | undefined
}

export function SelectParalelo({
  value, onChange, onParaleloChange, gradoId,
  required, label = 'Paralelo', disabled, placeholder, nivelesPermitidos, gradoOrdenes,
}: Props) {
  const [options, setOptions] = useState<Paralelo[]>([])
  const [loading, setLoading] = useState(false)

  // Keep a ref so the effect always sees the latest value without being a dep
  const valueRef = useRef(value)
  valueRef.current = value

  useEffect(() => {
    if (gradoId !== undefined && !gradoId) {
      setOptions([])
      onChange('')
      if (onParaleloChange) onParaleloChange(null)
      return
    }

    setLoading(true)
    const qs = gradoId ? `?grado_id=${gradoId}` : ''
    api.get<Paralelo[]>(`/paralelos${qs}`)
      .then(data => {
        setOptions(data)
        if (gradoId && data.length > 0) {
          const inList = data.some(p => p.id === valueRef.current)
          if (!inList && data[0]) {
            // Auto-select first option (usually "A") when current value is not in the list
            onChange(data[0].id)
            if (onParaleloChange) onParaleloChange(data[0])
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradoId])

  const displayOptions = options
    .filter(p => !nivelesPermitidos?.length || nivelesPermitidos.includes(p.grado.nivel.nombre))
    .filter(p => !gradoOrdenes?.length || gradoOrdenes.includes(p.grado.orden))

  const handleChange = (id: string) => {
    onChange(id)
    if (onParaleloChange) onParaleloChange(displayOptions.find(p => p.id === id) ?? null)
  }

  const showOnlyLetra = Boolean(gradoId)

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-fg">{label}</label>
      <select
        value={value}
        onChange={e => handleChange(e.target.value)}
        required={required}
        disabled={disabled ?? loading}
        className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-bg"
      >
        <option value="">
          {loading ? 'Cargando…' : displayOptions.length === 0 && gradoId ? 'Sin paralelos' : (placeholder ?? '— Seleccionar —')}
        </option>
        {displayOptions.map(p => (
          <option key={p.id} value={p.id}>
            {showOnlyLetra ? p.letra : `${p.grado.nivel.nombre} · ${p.grado.nombre} "${p.letra}"`}
          </option>
        ))}
      </select>
    </div>
  )
}
