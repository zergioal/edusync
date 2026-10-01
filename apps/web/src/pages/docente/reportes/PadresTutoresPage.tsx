import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, apiDownload } from '../../../lib/api'
import { useToast } from '../../../components/ui/Toast'
import { SelectMiCurso } from '../../../components/docente/SelectMiCurso'
import { SelectGestion } from '../../../components/select/SelectGestion'
import { ExportarButton } from '../../../components/ui/ExportarButton'
import { Icon } from '../../../components/ui/Icon'
import { WhatsAppButton } from '../../../components/ui/WhatsAppButton'
import { Button, Spinner } from '@edusync/ui'

interface FilaPadre {
  estudiante: string
  codigo:     string
  nivel:      string
  grado:      string
  paralelo:   string
  tutor:      string
  email:      string
  telefono:   string | null
}

export default function PadresTutoresPage() {
  const toast = useToast()
  const [paraleloId, setParaleloId] = useState('')
  const [gestionId,  setGestionId]  = useState('')
  const [filas,      setFilas]      = useState<FilaPadre[] | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [dlState,    setDlState]    = useState<'idle' | 'pdf' | 'xlsx'>('idle')

  const listo = !!paraleloId && !!gestionId

  async function generar() {
    if (!listo) return
    setLoading(true)
    try {
      setFilas(await api.get<FilaPadre[]>(`/reportes/mi-padres-tutores?paralelo_id=${paraleloId}&gestion_id=${gestionId}`))
    } catch {
      toast.error('No se pudo generar el reporte')
    } finally {
      setLoading(false)
    }
  }

  async function descargar(tipo: 'pdf' | 'xlsx') {
    if (!listo) return
    setDlState(tipo)
    try {
      await apiDownload(
        `/reportes/mi-padres-tutores/${tipo === 'pdf' ? 'pdf' : 'excel'}?paralelo_id=${paraleloId}&gestion_id=${gestionId}`,
        `padres_tutores.${tipo === 'pdf' ? 'pdf' : 'xlsx'}`,
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
        <h1 className="text-2xl font-bold text-fg">Padres / Tutores</h1>
        <p className="text-sm text-fg-muted mt-0.5">Elige uno de tus cursos para ver los tutores de sus estudiantes.</p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectMiCurso value={paraleloId} onChange={id => { setParaleloId(id); setFilas(null) }} />
          <SelectGestion value={gestionId} onChange={id => { setGestionId(id); setFilas(null) }} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={generar} disabled={!listo || loading} loading={loading}>Generar reporte</Button>
          {filas && <ExportarButton disabled={dlState !== 'idle'} dlState={dlState} onExport={descargar} />}
        </div>
      </div>

      {loading && <div className="flex justify-center py-12"><Spinner /></div>}

      {filas && !loading && (
        <div className="rounded-xl border border-border bg-surface shadow-sm overflow-x-auto">
          {filas.length === 0 ? (
            <div className="py-12 text-center text-sm text-fg-muted">Sin registros para este curso.</div>
          ) : (
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-bg text-left text-xs font-semibold uppercase tracking-wide text-fg-muted border-b border-border">
                  <th className="px-4 py-3">Estudiante</th>
                  <th className="px-4 py-3">Tutor</th>
                  <th className="px-4 py-3">Correo</th>
                  <th className="px-4 py-3">Teléfono</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filas.map((f, i) => (
                  <tr key={i} className="hover:bg-surface-2">
                    <td className="px-4 py-2.5 font-medium text-fg whitespace-nowrap">{f.estudiante}</td>
                    <td className="px-4 py-2.5 text-fg-muted whitespace-nowrap">{f.tutor}</td>
                    <td className="px-4 py-2.5 text-fg-muted">{f.email}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-fg-muted">{f.telefono ?? '—'}</span>
                        {f.telefono && (
                          <WhatsAppButton
                            numero={f.telefono}
                            mensaje={`Hola, le escribimos de la Unidad Educativa sobre ${f.estudiante}. `}
                          />
                        )}
                      </div>
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
