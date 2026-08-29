import { Routes, Route, Link } from 'react-router-dom'
import { Icon, type IconName } from '../../components/ui/Icon'
import CuadroHonorPage    from './reportes/CuadroHonorPage'
import CentralizadorPage  from './reportes/CentralizadorPage'
import ParcialesPage      from './reportes/ParcialesPage'
import CarpetasPage       from './reportes/CarpetasPage'
import PromocionAnualPage from './reportes/PromocionAnualPage'
import ControlDiarioReportePage from './reportes/ControlDiarioReportePage'

const CARDS: { to: string; icon: IconName; title: string; desc: string }[] = [
  { to: 'cuadro-honor',   icon: 'trophy',           title: 'Cuadro de Honor',          desc: 'Ranking de estudiantes por promedio general del trimestre.' },
  { to: 'centralizador',  icon: 'grid',             title: 'Centralizador de Notas',    desc: 'Vista matricial de todas las notas del paralelo. Exporta a PDF y Excel.' },
  { to: 'parciales',      icon: 'clipboard-check',  title: 'Estado de Parciales',       desc: 'Verifica qué docentes han entregado sus evaluaciones parciales.' },
  { to: 'carpetas',       icon: 'folder',           title: 'Carpetas Entregables',      desc: 'Lista de estudiantes habilitados para recoger su carpeta de exámenes.' },
  { to: 'promocion',      icon: 'graduation-cap',   title: 'Resultado Final / Promoción', desc: 'Cálculo de promoción anual (requiere los 3 trimestres cerrados).' },
  { to: 'control-diario', icon: 'notebook',         title: 'Control Diario',           desc: 'Observaciones de conducta por curso — filtra por mes, trimestre o año y exporta a PDF.' },
]

function ReportesMenu() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">Reportes Académicos</h1>
        <p className="mt-1 text-sm text-fg-muted">Selecciona el tipo de reporte a generar.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CARDS.map(c => (
          <Link
            key={c.to}
            to={c.to}
            className="group flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm transition hover:border-blue-400 hover:shadow-md"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <Icon name={c.icon} className="h-6 w-6" />
            </div>
            <div>
              <div className="font-semibold text-fg group-hover:text-blue-700">{c.title}</div>
              <div className="mt-1 text-sm text-fg-muted">{c.desc}</div>
            </div>
            <div className="mt-auto text-sm font-medium text-blue-600 group-hover:underline">
              Abrir →
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function ReportesPage() {
  return (
    <Routes>
      <Route index           element={<ReportesMenu />} />
      <Route path="cuadro-honor"  element={<CuadroHonorPage />} />
      <Route path="centralizador" element={<CentralizadorPage />} />
      <Route path="parciales"     element={<ParcialesPage />} />
      <Route path="carpetas"      element={<CarpetasPage />} />
      <Route path="promocion"     element={<PromocionAnualPage />} />
      <Route path="control-diario" element={<ControlDiarioReportePage />} />
    </Routes>
  )
}
