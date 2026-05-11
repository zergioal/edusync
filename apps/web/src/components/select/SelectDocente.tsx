import { useState, useEffect } from 'react'
import { api } from '../../lib/api'

interface Docente {
  id:      string
  usuario: { nombre: string; apellido: string; email: string }
}

interface Props {
  value:     string
  onChange:  (id: string) => void
  required?: boolean
  label?:    string
  disabled?: boolean
  placeholder?: string
}

export function SelectDocente({
  value, onChange, required, label = 'Docente', disabled, placeholder = '— Seleccionar docente —',
}: Props) {
  const [options, setOptions] = useState<Docente[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Docente[]>('/docentes')
      .then(setOptions)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        disabled={disabled ?? loading}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
      >
        <option value="">{loading ? 'Cargando…' : placeholder}</option>
        {options.map(d => (
          <option key={d.id} value={d.id}>
            {d.usuario.apellido}, {d.usuario.nombre}
          </option>
        ))}
      </select>
    </div>
  )
}
