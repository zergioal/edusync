import { Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { StatCard } from '../../components/ui/StatCard'
import { useAuth } from '../../context/AuthContext'
import { Badge } from '@edusync/ui'
import { api } from '../../lib/api'
import { AvatarDisplay, AvatarPickerModal, useAvatar } from '../../components/ui/AvatarSelector'
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

const ESCALA_LABEL: Record<Escala, string> = {
  ED: 'En Desarrollo', DA: 'Debe Alcanzar',
  DO: 'Desarrollado',  DP: 'Destacado',
}
const ESCALA_COLOR: Record<Escala, string> = {
  ED: 'bg-red-100 text-red-700',     DA: 'bg-orange-100 text-orange-700',
  DO: 'bg-green-100 text-green-700', DP: 'bg-emerald-100 text-emerald-700',
}

function EstudianteHome() {
  const { user, estadoFinanciero } = useAuth()
  const [stats, setStats] = useState<HomeStats | null>(null)
  const [escala, setEscala] = useState<Escala | null>(null)
  const estId = estadoFinanciero?.hijos?.[0]?.id
  const { avatarId, showPicker, openPicker, closePicker, onSaved } = useAvatar(user?.id ?? '')

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
          setEscala(boletin.escala_general ?? null)
        } else {
          setStats({ nivel: boletin.estudiante.nivel, promedio: null, materias_bajo: 0, faltas: boletin.total_faltas })
        }
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [estId])

  const nivelColors: Record<string, string> = {
    INICIAL: 'bg-amber-100 text-amber-700',
    PRIMARIA: 'bg-sky-100 text-sky-700',
    SECUNDARIA: 'bg-violet-100 text-violet-700',
  }

  return (
    <div className="space-y-6">

      {/* Profile card */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 flex items-start gap-5">
        <div className="relative">
          <AvatarDisplay userId={user?.id ?? ''} avatarId={avatarId} size="xl" />
          <button
            onClick={openPicker}
            className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center shadow hover:bg-indigo-700 transition-colors"
            title="Cambiar avatar"
          >✎</button>
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
            {user?.nombre} {user?.apellido}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5 truncate">{user?.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="default">Estudiante</Badge>
            {stats?.nivel && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${nivelColors[stats.nivel] ?? 'bg-gray-100 text-gray-600'}`}>
                {stats.nivel}
              </span>
            )}
            {escala && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESCALA_COLOR[escala]}`}>
                {ESCALA_LABEL[escala]}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Situación académica — trimestre actual
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

      {/* Quick links */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Acceso rápido</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { href: 'notas',      emoji: '📊', label: 'Mis Notas',     color: 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700'    },
            { href: 'asistencia', emoji: '📅', label: 'Asistencia',    color: 'bg-green-50 hover:bg-green-100 border-green-200 text-green-700'  },
            { href: 'tareas',     emoji: '📝', label: 'Tareas',        color: 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700'  },
            { href: 'boletin',    emoji: '📋', label: 'Mi Boletín',    color: 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700'},
          ].map(item => (
            <a
              key={item.href}
              href={`/dashboard/estudiante/${item.href}`}
              className={`rounded-xl border p-4 flex flex-col items-center gap-2 text-center transition-colors ${item.color}`}
            >
              <span className="text-2xl">{item.emoji}</span>
              <span className="text-sm font-semibold">{item.label}</span>
            </a>
          ))}
        </div>
      </div>

      {showPicker && user && (
        <AvatarPickerModal userId={user.id} onClose={closePicker} onSaved={onSaved} />
      )}
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
