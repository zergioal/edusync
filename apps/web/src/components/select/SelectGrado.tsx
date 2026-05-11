import { useState, useEffect } from 'react'
import { api } from '../../lib/api'

interface Grado { id: string; nombre: string; nivel: { nombre: string } }

interface Props {
  value:     string
  onChange:  (id: string) => void
  nivelId?:  string
  required?: boolean
  label?:    string
  disabled?: boolean
}

export function SelectGrado({ value, onChange, nivelId, required, label = 'Grado', disabled }: Props) {
  const [options, setOptions] = useState<Grado[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!nivelId) { setOptions([]); return }
    setLoading(true)
    api.get<Grado[]>(`/grados?nivel_id=${nivelId}`)
      .then(setOptions)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [nivelId])

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        disabled={disabled ?? loading ?? !nivelId}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
      >
        <option value="">{loading ? 'Cargando…' : !nivelId ? 'Selecciona un nivel primero' : '— Seleccionar grado —'}</option>
        {options.map(g => (
          <option key={g.id} value={g.id}>{g.nombre}</option>
        ))}
      </select>
    </div>
  )
}
