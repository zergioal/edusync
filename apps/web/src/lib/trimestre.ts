export interface TrimestreBasic {
  id:          string
  numero:      number
  fecha_inicio: string
  fecha_fin:   string
  cerrado:     boolean
}

export function getTrimestreActivo(trimestres: TrimestreBasic[]): TrimestreBasic | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const active = trimestres.find(t => {
    const inicio = new Date(t.fecha_inicio)
    const fin    = new Date(t.fecha_fin)
    return today >= inicio && today <= fin && !t.cerrado
  })
  return active ?? trimestres.find(t => !t.cerrado) ?? trimestres[0] ?? null
}

export function trimestreLabel(numero: number): string {
  return `${numero}° Trimestre`
}
