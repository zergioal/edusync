import { useState } from 'react'
import { api, apiDownload } from '../../lib/api'
import { useToast } from '../ui/Toast'
import { ExportarButton } from '../ui/ExportarButton'
import { Button, Spinner, Badge } from '@edusync/ui'

interface EstudianteNomina {
  codigo:           string
  apellido:         string
  nombre:           string
  email:            string
  nivel:            string
  grado:            string
  paralelo:         string
  curso:            string
  estado:           string
  becado:           boolean
  promedio?:        number
  areas_aprobadas?: number
  areas_reprobadas?: number
  resultado?:       'PROMOVIDO' | 'REPITE'
}
interface NominaData { anno: number; puede_ver_academico: boolean; estudiantes: EstudianteNomina[] }

const ESTADO_VARIANT: Record<string, 'success' | 'danger' | 'warning' | 'default' | 'info'> = {
  ACTIVO: 'success', PREINSCRITO: 'info', RETIRADO: 'danger', TRASLADADO: 'warning', EGRESADO: 'default',
}

interface ColumnaDef { key: string; label: string; grupo: 'basico' | 'academico' }
const COLUMNAS: ColumnaDef[] = [
  { key: 'codigo',           label: 'Código',               grupo: 'basico' },
  { key: 'curso',            label: 'Curso',                grupo: 'basico' },
  { key: 'email',            label: 'Correo institucional',  grupo: 'basico' },
  { key: 'estado',           label: 'Estado',                grupo: 'basico' },
  { key: 'becado',           label: 'Becado',                grupo: 'basico' },
  { key: 'promedio',         label: 'Promedio',              grupo: 'academico' },
  { key: 'areas_aprobadas',  label: 'N° áreas aprobadas',    grupo: 'academico' },
  { key: 'areas_reprobadas', label: 'N° áreas reprobadas',   grupo: 'academico' },
  { key: 'resultado',        label: 'Resultado (promoción)', grupo: 'academico' },
]
// Apellido y Nombre siempre van, no son opcionales — por eso no están en el catálogo de arriba.
const COLUMNAS_DEFECTO = ['codigo', 'curso', 'email', 'estado']

type OrdenPor = 'apellido' | 'codigo' | 'promedio' | 'areas_reprobadas'

interface Props {
  /** Base del endpoint: '/reportes/nomina' (staff) o '/reportes/mi-nomina' (docente). */
  endpoint:   string
  gestionId:  string
  nivelId?:   string
  gradoId?:   string
  paraleloId?: string
  /** Puede generarse con los filtros actuales (ej. en staff: gestión elegida; en docente: curso elegido). */
  listo:      boolean
}

export function NominaTabla({ endpoint, gestionId, nivelId, gradoId, paraleloId, listo }: Props) {
  const toast = useToast()
  const [data,    setData]    = useState<NominaData | null>(null)
  const [loading, setLoading] = useState(false)
  const [dlState, setDlState] = useState<'idle' | 'pdf' | 'xlsx'>('idle')

  const [columnas,    setColumnas]    = useState<string[]>(COLUMNAS_DEFECTO)
  const [estado,      setEstado]      = useState<'ACTIVO' | 'TODOS'>('ACTIVO')
  const [ordenPor,     setOrdenPor]    = useState<OrdenPor>('apellido')
  const [ordenDir,     setOrdenDir]    = useState<'asc' | 'desc'>('asc')
  const [promedioMin, setPromedioMin] = useState('')
  const [promedioMax, setPromedioMax] = useState('')

  const incluirAcademico = columnas.some(c => COLUMNAS.find(col => col.key === c)?.grupo === 'academico')

  function toggleColumna(key: string) {
    setColumnas(prev => prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key])
  }

  function qs() {
    const p = new URLSearchParams({ gestion_id: gestionId })
    if (nivelId)    p.set('nivel_id', nivelId)
    if (gradoId)    p.set('grado_id', gradoId)
    if (paraleloId) p.set('paralelo_id', paraleloId)
    if (estado === 'TODOS') p.set('estado', 'TODOS')
    if (incluirAcademico) p.set('incluir_academico', 'true')
    if (ordenPor !== 'apellido') { p.set('orden_por', ordenPor); p.set('orden_dir', ordenDir) }
    else if (ordenDir === 'desc') { p.set('orden_por', 'apellido'); p.set('orden_dir', 'desc') }
    if (promedioMin !== '') p.set('promedio_min', promedioMin)
    if (promedioMax !== '') p.set('promedio_max', promedioMax)
    p.set('columnas', ['numero', 'apellido', 'nombre', ...columnas].join(','))
    return p.toString()
  }

  async function generar() {
    if (!listo) return
    setLoading(true)
    try {
      setData(await api.get<NominaData>(`${endpoint}?${qs()}`))
    } catch {
      toast.error('No se pudo generar la nómina')
    } finally {
      setLoading(false)
    }
  }

  async function descargar(tipo: 'pdf' | 'xlsx') {
    if (!listo || !data) return
    setDlState(tipo)
    try {
      await apiDownload(`${endpoint}/${tipo === 'pdf' ? 'pdf' : 'excel'}?${qs()}`, `nomina_estudiantes.${tipo === 'pdf' ? 'pdf' : 'xlsx'}`)
    } catch {
      toast.error('Error al generar el archivo')
    } finally {
      setDlState('idle')
    }
  }

  return (
    <div className="space-y-4">
      {/* Filtros propios de la nómina */}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted mb-2">Columnas a mostrar</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {COLUMNAS.filter(c => c.grupo === 'basico').map(c => (
              <label key={c.key} className="inline-flex items-center gap-1.5 text-sm text-fg">
                <input type="checkbox" checked={columnas.includes(c.key)} onChange={() => toggleColumna(c.key)} className="rounded border-border" />
                {c.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted mb-2">
            Rendimiento académico (anual, por área)
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {COLUMNAS.filter(c => c.grupo === 'academico').map(c => (
              <label key={c.key} className="inline-flex items-center gap-1.5 text-sm text-fg">
                <input type="checkbox" checked={columnas.includes(c.key)} onChange={() => toggleColumna(c.key)} className="rounded border-border" />
                {c.label}
              </label>
            ))}
          </div>
          {data && !data.puede_ver_academico && incluirAcademico && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              El rendimiento académico completo del curso solo lo ve el/la asesor(a) — estas columnas salieron vacías.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">Estado del estudiante</label>
            <select value={estado} onChange={e => setEstado(e.target.value as 'ACTIVO' | 'TODOS')} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg">
              <option value="ACTIVO">Solo activos</option>
              <option value="TODOS">Todos (incl. retirados)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">Ordenar por</label>
            <select value={ordenPor} onChange={e => setOrdenPor(e.target.value as OrdenPor)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg">
              <option value="apellido">Apellido</option>
              <option value="codigo">Código</option>
              <option value="promedio">Promedio</option>
              <option value="areas_reprobadas">N° áreas reprobadas</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">Dirección</label>
            <select value={ordenDir} onChange={e => setOrdenDir(e.target.value as 'asc' | 'desc')} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg">
              <option value="asc">Ascendente</option>
              <option value="desc">Descendente</option>
            </select>
          </div>
          {incluirAcademico && (
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1">Promedio entre</label>
              <div className="flex items-center gap-1.5">
                <input type="number" min={0} max={100} value={promedioMin} onChange={e => setPromedioMin(e.target.value)} placeholder="0"
                  className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-sm text-fg" />
                <span className="text-fg-muted">–</span>
                <input type="number" min={0} max={100} value={promedioMax} onChange={e => setPromedioMax(e.target.value)} placeholder="100"
                  className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-sm text-fg" />
              </div>
            </div>
          )}
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
            <div className="py-12 text-center text-sm text-fg-muted">Sin estudiantes para los filtros elegidos.</div>
          ) : (
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="bg-bg text-left text-xs font-semibold uppercase tracking-wide text-fg-muted border-b border-border">
                  <th className="px-3 py-3 text-center w-10">N°</th>
                  <th className="px-4 py-3">Apellidos y Nombres</th>
                  {columnas.includes('codigo')           && <th className="px-4 py-3">Código</th>}
                  {columnas.includes('curso')             && <th className="px-4 py-3">Curso</th>}
                  {columnas.includes('email')             && <th className="px-4 py-3">Correo institucional</th>}
                  {columnas.includes('estado')            && <th className="px-4 py-3 text-center">Estado</th>}
                  {columnas.includes('becado')            && <th className="px-4 py-3 text-center">Becado</th>}
                  {columnas.includes('promedio')          && <th className="px-4 py-3 text-center">Promedio</th>}
                  {columnas.includes('areas_aprobadas')   && <th className="px-4 py-3 text-center">Aprobadas</th>}
                  {columnas.includes('areas_reprobadas')  && <th className="px-4 py-3 text-center">Reprobadas</th>}
                  {columnas.includes('resultado')         && <th className="px-4 py-3 text-center">Resultado</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.estudiantes.map((e, idx) => (
                  <tr key={e.codigo} className="hover:bg-surface-2">
                    <td className="px-3 py-2.5 text-center text-xs text-fg-muted">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-fg whitespace-nowrap">{e.apellido}, {e.nombre}</td>
                    {columnas.includes('codigo')  && <td className="px-4 py-2.5 font-mono text-xs text-fg-muted whitespace-nowrap">{e.codigo}</td>}
                    {columnas.includes('curso')   && <td className="px-4 py-2.5 text-fg-muted whitespace-nowrap">{e.curso}</td>}
                    {columnas.includes('email')   && <td className="px-4 py-2.5 text-fg-muted whitespace-nowrap">{e.email}</td>}
                    {columnas.includes('estado')  && (
                      <td className="px-4 py-2.5 text-center">
                        <Badge variant={ESTADO_VARIANT[e.estado] ?? 'default'}>{e.estado}</Badge>
                      </td>
                    )}
                    {columnas.includes('becado')  && <td className="px-4 py-2.5 text-center">{e.becado ? <span className="font-semibold text-emerald-700 dark:text-emerald-400">Sí</span> : <span className="text-fg-muted/50">No</span>}</td>}
                    {columnas.includes('promedio') && (
                      <td className="px-4 py-2.5 text-center font-semibold">
                        {e.promedio != null ? e.promedio : <span className="text-fg-muted/50">—</span>}
                      </td>
                    )}
                    {columnas.includes('areas_aprobadas') && (
                      <td className="px-4 py-2.5 text-center text-emerald-700 dark:text-emerald-400 font-semibold">
                        {e.areas_aprobadas ?? <span className="text-fg-muted/50">—</span>}
                      </td>
                    )}
                    {columnas.includes('areas_reprobadas') && (
                      <td className="px-4 py-2.5 text-center font-semibold">
                        <span className={e.areas_reprobadas ? 'text-red-700 dark:text-red-400' : 'text-fg-muted/50'}>
                          {e.areas_reprobadas ?? '—'}
                        </span>
                      </td>
                    )}
                    {columnas.includes('resultado') && (
                      <td className="px-4 py-2.5 text-center">
                        {e.resultado
                          ? <Badge variant={e.resultado === 'PROMOVIDO' ? 'success' : 'danger'}>{e.resultado}</Badge>
                          : <span className="text-fg-muted/50">—</span>}
                      </td>
                    )}
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
