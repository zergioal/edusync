import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SelectGestion } from '../../../components/select/SelectGestion'
import { SelectNivel }   from '../../../components/select/SelectNivel'
import { SelectGrado }   from '../../../components/select/SelectGrado'
import { SelectParalelo } from '../../../components/select/SelectParalelo'
import { NominaTabla } from '../../../components/reportes/NominaTabla'

export default function NominaPage() {
  const [gestionId,  setGestionId]  = useState('')
  const [nivelId,    setNivelId]    = useState('')
  const [gradoId,    setGradoId]    = useState('')
  const [paraleloId, setParaleloId] = useState('')

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to=".." className="text-sm text-blue-600 hover:underline">← Reportes</Link>
        <h1 className="text-xl font-bold text-fg">Nómina de Estudiantes</h1>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <SelectGestion value={gestionId} onChange={setGestionId} />
          <SelectNivel   value={nivelId}   onChange={id => { setNivelId(id); setGradoId(''); setParaleloId('') }} required={false} />
          <SelectGrado   value={gradoId}   onChange={id => { setGradoId(id); setParaleloId('') }} nivelId={nivelId} />
          <SelectParalelo value={paraleloId} onChange={setParaleloId} gradoId={gradoId} placeholder="— Todos —" />
        </div>
      </div>

      <NominaTabla
        endpoint="/reportes/nomina"
        gestionId={gestionId}
        nivelId={nivelId}
        gradoId={gradoId}
        paraleloId={paraleloId}
        listo={!!gestionId}
      />
    </div>
  )
}
