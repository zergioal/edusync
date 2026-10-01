import { Routes, Route, Link } from 'react-router-dom'
import { Icon, type IconName } from '../../components/ui/Icon'
import NominaPage from './reportes/NominaPage'
import CalificacionesPorCursoPage from './reportes/CalificacionesPorCursoPage'
import ControlDiarioPage from './reportes/ControlDiarioPage'
import PadresTutoresPage from './reportes/PadresTutoresPage'

const CARDS: { to: string; icon: IconName; title: string; desc: string }[] = [
  { to: 'nomina',          icon: 'users',          title: 'Nómina de Estudiantes',    desc: 'Lista de estudiantes matriculados en uno de tus cursos. Exporta a PDF y Excel.' },
  { to: 'calificaciones',  icon: 'document-list',  title: 'Calificaciones por Curso', desc: 'Centralizador de notas de tu(s) materia(s), por curso.' },
  { to: 'control-diario',  icon: 'notebook',       title: 'Control Diario',           desc: 'Observaciones por estudiante o de todo el curso — filtra por mes, trimestre o gestión.' },
  { to: 'padres-tutores',  icon: 'users',          title: 'Padres / Tutores',         desc: 'Contactos de los tutores de los estudiantes de uno de tus cursos.' },
]

function ReportesMenu() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">Reportes</h1>
        <p className="mt-1 text-sm text-fg-muted">Selecciona el tipo de reporte a generar.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CARDS.map(c => (
          <Link
            key={c.to}
            to={c.to}
            className="group flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm transition hover:border-brand hover:shadow-md"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <Icon name={c.icon} className="h-6 w-6" />
            </div>
            <div>
              <div className="font-semibold text-fg group-hover:text-indigo-700 dark:group-hover:text-indigo-400">{c.title}</div>
              <div className="mt-1 text-sm text-fg-muted">{c.desc}</div>
            </div>
            <div className="mt-auto text-sm font-medium text-indigo-600 dark:text-indigo-400 group-hover:underline">
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
      <Route index                  element={<ReportesMenu />} />
      <Route path="nomina"          element={<NominaPage />} />
      <Route path="calificaciones"  element={<CalificacionesPorCursoPage />} />
      <Route path="control-diario"  element={<ControlDiarioPage />} />
      <Route path="padres-tutores"  element={<PadresTutoresPage />} />
    </Routes>
  )
}
