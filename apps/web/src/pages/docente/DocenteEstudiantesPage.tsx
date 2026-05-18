import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { Spinner, Button } from '@edusync/ui'

interface Asignacion {
  id:       string
  materia:  { nombre: string }
  paralelo: { id: string; letra: string; grado: { nombre: string; nivel: { nombre: string } } }
  gestion:  { anno: number }
}
interface Estudiante {
  id:      string
  codigo:  string
  usuario: { nombre: string; apellido: string }
}

export default function DocenteEstudiantesPage() {
  const navigate = useNavigate()

  const [asignaciones,  setAsignaciones]  = useState<Asignacion[]>([])
  const [asignacionId,  setAsignacionId]  = useState('')
  const [estudiantes,   setEstudiantes]   = useState<Estudiante[]>([])
  const [loadingA,      setLoadingA]      = useState(true)
  const [loadingE,      setLoadingE]      = useState(false)

  useEffect(() => {
    api.get<Asignacion[]>('/asignaciones/mias')
      .then(setAsignaciones)
      .catch(() => {})
      .finally(() => setLoadingA(false))
  }, [])

  const asignacion = asignaciones.find(a => a.id === asignacionId)

  useEffect(() => {
    if (!asignacion) { setEstudiantes([]); return }
    setLoadingE(true)
    api.get<Estudiante[]>(`/estudiantes?paralelo_id=${asignacion.paralelo.id}`)
      .then(setEstudiantes)
      .catch(() => setEstudiantes([]))
      .finally(() => setLoadingE(false))
  }, [asignacionId, asignacion])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Estudiantes</h1>
        <p className="text-sm text-gray-500 mt-0.5">Selecciona una materia asignada para ver sus estudiantes</p>
      </div>

      {/* Selector de asignación */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {loadingA ? (
          <Spinner />
        ) : (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Materia / Paralelo</label>
            <select
              value={asignacionId}
              onChange={e => setAsignacionId(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-96"
            >
              <option value="">— Seleccionar asignación —</option>
              {asignaciones.map(a => (
                <option key={a.id} value={a.id}>
                  {a.materia.nombre} — {a.paralelo.grado.nombre} "{a.paralelo.letra}" ({a.gestion.anno})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabla de estudiantes */}
      {asignacionId && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {asignacion && (
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 text-sm text-gray-600">
              <span className="font-semibold">{asignacion.materia.nombre}</span>
              {' — '}
              {asignacion.paralelo.grado.nivel.nombre} · {asignacion.paralelo.grado.nombre} "{asignacion.paralelo.letra}"
            </div>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-white text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3">Código</th>
                <th className="px-5 py-3">Apellidos y Nombres</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loadingE && (
                <tr><td colSpan={3} className="py-12 text-center"><Spinner /></td></tr>
              )}
              {!loadingE && estudiantes.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-gray-400">
                    No hay estudiantes matriculados en este paralelo.
                  </td>
                </tr>
              )}
              {estudiantes.map(est => (
                <tr key={est.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                      {est.codigo}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {est.usuario.apellido}, {est.usuario.nombre}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button variant="ghost" size="sm"
                      className="text-indigo-600 hover:text-indigo-800"
                      onClick={() => navigate(`/dashboard/docente/estudiante/${est.id}?tab=calificaciones`)}>
                      Calificaciones
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
