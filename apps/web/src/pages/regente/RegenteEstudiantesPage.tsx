import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { Spinner, Button } from '@edusync/ui'

interface Paralelo { id: string; nombre: string; grado: string; nivel: string }
interface Estudiante {
  id:      string
  codigo:  string
  usuario: { nombre: string; apellido: string }
  matriculas: { paralelo: { id: string } }[]
}

export default function RegenteEstudiantesPage() {
  const navigate = useNavigate()

  const [paralelos,    setParalelos]    = useState<Paralelo[]>([])
  const [paraleloId,   setParaleloId]   = useState('')
  const [estudiantes,  setEstudiantes]  = useState<Estudiante[]>([])
  const [loadingP,     setLoadingP]     = useState(true)
  const [loadingE,     setLoadingE]     = useState(false)

  useEffect(() => {
    api.get<Paralelo[]>('/asistencia/paralelos-regente')
      .then(setParalelos)
      .catch(() => {})
      .finally(() => setLoadingP(false))
  }, [])

  useEffect(() => {
    if (!paraleloId) { setEstudiantes([]); return }
    setLoadingE(true)
    api.get<Estudiante[]>(`/estudiantes?paralelo_id=${paraleloId}`)
      .then(setEstudiantes)
      .catch(() => setEstudiantes([]))
      .finally(() => setLoadingE(false))
  }, [paraleloId])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Estudiantes</h1>
        <p className="text-sm text-gray-500 mt-0.5">Selecciona un paralelo para ver sus estudiantes</p>
      </div>

      {/* Selector de paralelo */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {loadingP ? (
          <Spinner />
        ) : (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Paralelo</label>
            <select
              value={paraleloId}
              onChange={e => setParaleloId(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
            >
              <option value="">— Seleccionar paralelo —</option>
              {paralelos.map(p => (
                <option key={p.id} value={p.id}>{p.nivel} · {p.nombre}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabla de estudiantes */}
      {paraleloId && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
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
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm"
                        className="text-teal-600 hover:text-teal-800"
                        onClick={() => navigate(`/dashboard/regente/estudiante/${est.id}?tab=asistencia`)}>
                        Asistencia
                      </Button>
                      <Button variant="ghost" size="sm"
                        className="text-amber-600 hover:text-amber-800"
                        onClick={() => navigate(`/dashboard/regente/estudiante/${est.id}?tab=pensiones`)}>
                        Pensiones
                      </Button>
                    </div>
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
