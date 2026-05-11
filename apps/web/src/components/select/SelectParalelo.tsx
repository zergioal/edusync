import { useState, useEffect, useRef } from 'react'
import { api } from '../../lib/api'

export interface Paralelo {
  id:    string
  letra: string
  grado: { nombre: string; nivel: { id: string; nombre: string } }
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
}

export function SelectParalelo({
  value, onChange, onParaleloChange, gradoId,
  required, label = 'Paralelo', disabled, placeholder,
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

  const handleChange = (id: string) => {
    onChange(id)
    if (onParaleloChange) onParaleloChange(options.find(p => p.id === id) ?? null)
  }

  const showOnlyLetra = Boolean(gradoId)

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value}
        onChange={e => handleChange(e.target.value)}
        required={required}
        disabled={disabled ?? loading}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
      >
        <option value="">
          {loading ? 'Cargando…' : options.length === 0 && gradoId ? 'Sin paralelos' : (placeholder ?? '— Seleccionar —')}
        </option>
        {options.map(p => (
          <option key={p.id} value={p.id}>
            {showOnlyLetra ? p.letra : `${p.grado.nivel.nombre} · ${p.grado.nombre} "${p.letra}"`}
          </option>
        ))}
      </select>
    </div>
  )
}
