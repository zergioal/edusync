import { useState, useEffect } from 'react'
import { api } from '../../lib/api'

interface Gestion { id: string; anno: number; activa: boolean }

interface Props {
  value:    string
  onChange: (id: string) => void
  label?:   string
  required?: boolean
  disabled?: boolean
  placeholder?: string
}

export function SelectGestion({
  value, onChange,
  label = 'Gestión', required, disabled, placeholder = '— Seleccionar gestión —',
}: Props) {
  const [options, setOptions] = useState<Gestion[]>([])

  useEffect(() => {
    api.get<Gestion[]>('/gestiones').then(gs => {
      setOptions(gs)
      // Auto-select active gestión only when no value is selected yet
      if (!value) {
        const activa = gs.find(g => g.activa)
        if (activa) onChange(activa.id)
      }
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}{required && ' *'}</label>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
      >
        <option value="">{placeholder}</option>
        {options.map(g => (
          <option key={g.id} value={g.id}>
            Gestión {g.anno}{g.activa ? ' (activa)' : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
