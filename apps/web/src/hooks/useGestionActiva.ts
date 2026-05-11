import { useState, useEffect } from 'react'
import { api } from '../lib/api'

interface GestionActiva {
  id:         string
  anno:       number
  trimestres: Array<{ id: string; numero: number; cerrado: boolean; fecha_inicio: string; fecha_fin: string }>
}

export function useGestionActiva() {
  const [data, setData] = useState<GestionActiva | null>(null)

  useEffect(() => {
    api.get<GestionActiva>('/gestiones/activa').then(setData).catch(() => {})
  }, [])

  const trimestreActual =
    data?.trimestres.find(t => !t.cerrado) ??
    data?.trimestres[data.trimestres.length - 1] ??
    null

  return {
    anno:             data?.anno ?? null,
    trimestreActual,
    gestionLabel:     data ? `Gestión ${data.anno}` : '',
    trimestreLabel:   trimestreActual ? `${trimestreActual.numero}° Trimestre` : '',
  }
}
