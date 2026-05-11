import { Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { StatCard } from '../../components/ui/StatCard'
import { useAuth } from '../../context/AuthContext'
import { Badge } from '@edusync/ui'
import { api } from '../../lib/api'
import MisCalificacionesPage from '../estudiante/MisCalificacionesPage'
import MiBoletinPage         from '../estudiante/MiBoletinPage'
import MiAsistenciaPage      from '../estudiante/MiAsistenciaPage'
import MisTareasPage         from '../estudiante/MisTareasPage'
import AnunciosInternosPage  from '../shared/AnunciosInternosPage'
import MensajesPage          from '../shared/MensajesPage'

type Escala = 'ED' | 'DA' | 'DO' | 'DP'
interface HomeStats {
  nivel:         string
  promedio:      number | null
  materias_bajo: number
  faltas:        number
}

function EstudianteHome() {
  const { user, estadoFinanciero } = useAuth()
  const [stats, setStats] = useState<HomeStats | null>(null)
  const estId = estadoFinanciero?.hijos?.[0]?.id

  useEffect(() => {
    if (!estId) return
    let cancelled = false

    api.get<{ id: string; trimestres: Array<{ id: string; numero: number; cerrado: boolean }> }>('/gestiones/activa')
      .then(async g => {
        if (cancelled) return

        const t = g.trimestres.find(t => !t.cerrado) ?? g.trimestres[g.trimestres.length - 1]
        if (!t) return

        const boletin = await api.get<{
          tipo: 'REGULAR' | 'INICIAL'
          estudiante: { nivel: string }
          materias?: Array<{ total: number }>
          promedio_general?: number
          escala_general?: Escala
          total_faltas: number
        }>(`/boletines/${estId}?trimestre_id=${t.id}`)
        if (cancelled) return

        if (boletin.tipo === 'REGULAR') {
          setStats({
            nivel:         boletin.estudiante.nivel,
            promedio:      boletin.promedio_general ?? null,
            materias_bajo: (boletin.materias ?? []).filter(m => m.total <= 50).length,
            faltas:        boletin.total_faltas,
          })
        } else {
          setStats({
            nivel:         boletin.estudiante.nivel,
            promedio:      null,
            materias_bajo: 0,
            faltas:        boletin.total_faltas,
          })
        }
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [estId])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hola, {user?.nombre} {user?.apellido}
        </h1>
        <div className="mt-1 flex items-center gap-2">
          <Badge variant="default">Estudiante</Badge>
          {stats?.nivel && <span className="text-sm text-gray-400">{stats.nivel}</span>}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Mi situación académica
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Promedio general"
            value={stats?.promedio != null ? String(stats.promedio) : '—'}
            icon="chart"
            color="green"
          />
          <StatCard
            label="Materias por mejorar"
            value={stats != null ? String(stats.materias_bajo) : '—'}
            icon="book"
            color={stats?.materias_bajo ? 'yellow' : 'blue'}
          />
          <StatCard
            label="Faltas este trimestre"
            value={stats != null ? String(stats.faltas) : '—'}
            icon="calendar"
            color={stats?.faltas ? 'yellow' : 'green'}
          />
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Próximas evaluaciones
        </h2>
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="px-5 py-12 text-center text-sm text-gray-400">
            No hay evaluaciones programadas próximas
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionPlaceholder({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
        <p className="text-gray-400">Módulo en construcción</p>
      </div>
    </div>
  )
}

export default function EstudianteDashboard() {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<EstudianteHome />} />
        <Route path="notas"      element={<MisCalificacionesPage />} />
        <Route path="boletin"    element={<MiBoletinPage />} />
        <Route path="asistencia" element={<MiAsistenciaPage />} />
        <Route path="tareas"     element={<MisTareasPage />} />
        <Route path="horario"    element={<SectionPlaceholder title="Mi Horario" />} />
        <Route path="anuncios"   element={<AnunciosInternosPage />} />
        <Route path="mensajes"   element={<MensajesPage />} />
        <Route path="*"          element={<EstudianteHome />} />
      </Routes>
    </DashboardLayout>
  )
}
