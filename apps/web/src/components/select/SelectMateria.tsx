import { useState, useEffect } from 'react'
import { api } from '../../lib/api'

interface Materia {
  id:    string
  nombre: string
  campo:  { nombre: string }
  nivel:  { nombre: string }
}

interface Props {
  value:     string
  onChange:  (id: string) => void
  nivelId?:  string
  required?: boolean
  label?:    string
  disabled?: boolean
}

export function SelectMateria({ value, onChange, nivelId, required, label = 'Materia', disabled }: Props) {
  const [options, setOptions] = useState<Materia[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    const qs = nivelId ? `?nivel_id=${nivelId}` : ''
    api.get<Materia[]>(`/materias${qs}`)
      .then(setOptions)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [nivelId])

  // Agrupa por campo
  const grouped = options.reduce<Record<string, Materia[]>>((acc, m) => {
    const k = m.campo.nombre;
    (acc[k] ??= []).push(m)
    return acc
  }, {})

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
        <option value="">{loading ? 'Cargando…' : '— Seleccionar materia —'}</option>
        {Object.entries(grouped).map(([campo, materias]) => (
          <optgroup key={campo} label={campo}>
            {materias.map(m => (
              <option key={m.id} value={m.id}>{m.nombre}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  )
}
