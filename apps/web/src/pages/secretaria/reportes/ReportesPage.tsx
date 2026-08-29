import { Routes, Route, Link } from 'react-router-dom'
import NominaPage                 from './NominaPage'
import FichaEstudiantePage        from './FichaEstudiantePage'
import EstadoMatriculaPage        from './EstadoMatriculaPage'
import DocumentacionPendientePage from './DocumentacionPendientePage'
import EstadisticaMatriculaPage   from './EstadisticaMatriculaPage'
import CertificadosReportePage    from './CertificadosReportePage'
import PadresTutoresPage          from './PadresTutoresPage'
import CentralizadorPage  from '../../coordinador/reportes/CentralizadorPage'
import PromocionAnualPage from '../../coordinador/reportes/PromocionAnualPage'
import ReporteAsistenciaPage from '../../regente/ReporteAsistenciaPage'

const CARDS = [
  { to: 'nomina',              icon: '🧾', title: 'Nómina de Estudiantes',        desc: 'Lista de estudiantes inscritos, con filtros por gestión, nivel, grado y paralelo.' },
  { to: 'ficha',                icon: '🪪', title: 'Ficha Individual',              desc: 'Datos personales, académicos y del tutor de un estudiante específico.' },
  { to: 'estado-matricula',     icon: '🎒', title: 'Estado del Estudiante',         desc: 'Preinscritos, activos, retirados, trasladados y egresados.' },
  { to: 'documentacion',        icon: '📂', title: 'Documentación Pendiente',       desc: 'Identifica expedientes incompletos por estudiante.' },
  { to: 'estadistica',          icon: '📈', title: 'Estadística de Matrícula',      desc: 'Cantidad de estudiantes por nivel, grado, paralelo y sexo.' },
  { to: 'calificaciones',       icon: '📊', title: 'Calificaciones por Curso',      desc: 'Centralizador de notas: todas las materias en una misma hoja por paralelo y trimestre.' },
  { to: 'asistencia',           icon: '🗓️', title: 'Asistencia e Inasistencias',    desc: 'Presentes, ausentes y tardanzas por paralelo y período.' },
  { to: 'promocion',            icon: '🎓', title: 'Aprobados, Reprobados y Promovidos', desc: 'Resultado final de la gestión (requiere los 3 trimestres cerrados).' },
  { to: 'certificados',         icon: '📜', title: 'Certificados y Trámites',       desc: 'Constancias, certificados e historiales académicos emitidos.' },
  { to: 'padres-tutores',       icon: '👨‍👩‍👧', title: 'Padres / Tutores',              desc: 'Datos de contacto de padres, madres y tutores por estudiante.' },
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
            className="group flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm transition hover:border-blue-400 hover:shadow-md"
          >
            <div className="text-3xl">{c.icon}</div>
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
      <Route index                element={<ReportesMenu />} />
      <Route path="nomina"        element={<NominaPage />} />
      <Route path="ficha"         element={<FichaEstudiantePage />} />
      <Route path="estado-matricula" element={<EstadoMatriculaPage />} />
      <Route path="documentacion" element={<DocumentacionPendientePage />} />
      <Route path="estadistica"   element={<EstadisticaMatriculaPage />} />
      <Route path="calificaciones" element={<CentralizadorPage />} />
      <Route path="asistencia"    element={<ReporteAsistenciaPage />} />
      <Route path="promocion"     element={<PromocionAnualPage />} />
      <Route path="certificados"  element={<CertificadosReportePage />} />
      <Route path="padres-tutores" element={<PadresTutoresPage />} />
    </Routes>
  )
}
