import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, apiDownload } from '../../../lib/api'
import { useToast } from '../../../components/ui/Toast'
import { SelectMiCurso } from '../../../components/docente/SelectMiCurso'
import { SelectGestion } from '../../../components/select/SelectGestion'
import { ExportarButton } from '../../../components/ui/ExportarButton'
import { Icon } from '../../../components/ui/Icon'
import { Button, Spinner, Badge } from '@edusync/ui'

interface EstudianteNomina {
  codigo:   string
  apellido: string
  nombre:   string
  nivel:    string
  grado:    string
  paralelo: string
  estado:   string
}
interface NominaData { anno: number; estudiantes: EstudianteNomina[] }

const ESTADO_VARIANT: Record<string, 'success' | 'danger' | 'warning' | 'default' | 'info'> = {
  ACTIVO: 'success', PREINSCRITO: 'info', RETIRADO: 'danger', TRASLADADO: 'warning', EGRESADO: 'default',
}

export default function NominaPage() {
  const toast = useToast()
  const [paraleloId, setParaleloId] = useState('')
  const [gestionId,  setGestionId]  = useState('')
  const [data,       setData]       = useState<NominaData | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [dlState,    setDlState]    = useState<'idle' | 'pdf' | 'xlsx'>('idle')

  const listo = !!paraleloId && !!gestionId

  async function generar() {
    if (!listo) return
    setLoading(true)
    try {
      setData(await api.get<NominaData>(`/reportes/mi-nomina?paralelo_id=${paraleloId}&gestion_id=${gestionId}`))
    } catch {
      toast.error('No se pudo generar la nómina')
    } finally {
      setLoading(false)
    }
  }

  async function descargar(tipo: 'pdf' | 'xlsx') {
    if (!listo) return
    setDlState(tipo)
    try {
      await apiDownload(
        `/reportes/mi-nomina/${tipo === 'pdf' ? 'pdf' : 'excel'}?paralelo_id=${paraleloId}&gestion_id=${gestionId}`,
        `nomina_estudiantes.${tipo === 'pdf' ? 'pdf' : 'xlsx'}`,
      )
    } catch {
      toast.error('Error al generar el archivo')
    } finally {
      setDlState('idle')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link to=".." className="text-sm font-medium text-fg-muted hover:text-fg transition-colors flex items-center gap-1">
          <Icon name="arrow-left" className="h-4 w-4" /> Reportes
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-fg">Nómina de Estudiantes</h1>
        <p className="text-sm text-fg-muted mt-0.5">Elige uno de tus cursos para generar la nómina.</p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectMiCurso value={paraleloId} onChange={id => { setParaleloId(id); setData(null) }} />
          <SelectGestion value={gestionId} onChange={id => { setGestionId(id); setData(null) }} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={generar} disabled={!listo || loading} loading={loading}>Generar nómina</Button>
          {data && <ExportarButton disabled={dlState !== 'idle'} dlState={dlState} onExport={descargar} />}
        </div>
      </div>

      {loading && <div className="flex justify-center py-12"><Spinner /></div>}

      {data && !loading && (
        <div className="rounded-xl border border-border bg-surface shadow-sm overflow-x-auto">
          <div className="px-5 py-3 border-b border-border">
            <span className="text-sm font-semibold text-fg">Gestión {data.anno} · {data.estudiantes.length} estudiante{data.estudiantes.length !== 1 ? 's' : ''}</span>
          </div>
          {data.estudiantes.length === 0 ? (
            <div className="py-12 text-center text-sm text-fg-muted">Sin estudiantes matriculados en este curso.</div>
          ) : (
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="bg-bg text-left text-xs font-semibold uppercase tracking-wide text-fg-muted border-b border-border">
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Apellidos y Nombres</th>
                  <th className="px-4 py-3">Grado y Paralelo</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.estudiantes.map(e => (
                  <tr key={e.codigo} className="hover:bg-surface-2">
                    <td className="px-4 py-2.5 font-mono text-xs text-fg-muted whitespace-nowrap">{e.codigo}</td>
                    <td className="px-4 py-2.5 font-medium text-fg whitespace-nowrap">{e.apellido}, {e.nombre}</td>
                    <td className="px-4 py-2.5 text-fg-muted whitespace-nowrap">{e.grado} "{e.paralelo}"</td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge variant={ESTADO_VARIANT[e.estado] ?? 'default'}>{e.estado}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
