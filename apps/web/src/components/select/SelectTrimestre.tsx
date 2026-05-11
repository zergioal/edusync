import { useState, useEffect } from 'react'
import { api } from '../../lib/api'

export interface Trimestre {
  id:          string
  numero:      number
  fecha_inicio: string
  fecha_fin:    string
  cerrado:     boolean
  gestion_id:  string
}

interface Props {
  value:      string
  onChange:   (id: string) => void
  gestionId?: string
  label?:     string
  required?:  boolean
  disabled?:  boolean
  soloTrimestre?: boolean
}

export function SelectTrimestre({
  value, onChange, gestionId,
  label = 'Trimestre', required, disabled, soloTrimestre,
}: Props) {
  const [options, setOptions] = useState<Trimestre[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!gestionId) { setOptions([]); return }
    setLoading(true)
    api.get<Trimestre[]>(`/trimestres?gestion_id=${gestionId}`)
      .then(setOptions)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [gestionId])

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}{required && ' *'}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        disabled={disabled ?? loading ?? !gestionId}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
      >
        <option value="">{loading ? 'Cargando…' : '— Trimestre —'}</option>
        {options.map(t => (
          <option key={t.id} value={t.id}>
            {soloTrimestre ? `T${t.numero}` : `T${t.numero}° Trimestre${t.cerrado ? ' ✓' : ''}`}
          </option>
        ))}
      </select>
    </div>
  )
}
