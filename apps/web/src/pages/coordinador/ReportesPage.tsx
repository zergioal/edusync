import { Routes, Route, Link } from 'react-router-dom'
import CuadroHonorPage    from './reportes/CuadroHonorPage'
import CentralizadorPage  from './reportes/CentralizadorPage'
import ParcialesPage      from './reportes/ParcialesPage'
import CarpetasPage       from './reportes/CarpetasPage'
import PromocionAnualPage from './reportes/PromocionAnualPage'

const CARDS = [
  { to: 'cuadro-honor',   icon: '🏆', title: 'Cuadro de Honor',          desc: 'Ranking de estudiantes por promedio general del trimestre.' },
  { to: 'centralizador',  icon: '📊', title: 'Centralizador de Notas',    desc: 'Vista matricial de todas las notas del paralelo. Exporta a PDF y Excel.' },
  { to: 'parciales',      icon: '📋', title: 'Estado de Parciales',       desc: 'Verifica qué docentes han entregado sus evaluaciones parciales.' },
  { to: 'carpetas',       icon: '📁', title: 'Carpetas Entregables',      desc: 'Lista de estudiantes habilitados para recoger su carpeta de exámenes.' },
  { to: 'promocion',      icon: '🎓', title: 'Resultado Final / Promoción', desc: 'Cálculo de promoción anual (requiere los 3 trimestres cerrados).' },
]

function ReportesMenu() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes Académicos</h1>
        <p className="mt-1 text-sm text-gray-500">Selecciona el tipo de reporte a generar.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CARDS.map(c => (
          <Link
            key={c.to}
            to={c.to}
            className="group flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-400 hover:shadow-md"
          >
            <div className="text-3xl">{c.icon}</div>
            <div>
              <div className="font-semibold text-gray-900 group-hover:text-blue-700">{c.title}</div>
              <div className="mt-1 text-sm text-gray-500">{c.desc}</div>
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
    </Routes>
  )
}
