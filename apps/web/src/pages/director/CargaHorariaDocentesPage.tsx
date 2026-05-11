import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Spinner, Badge } from '@edusync/ui'

interface DocenteHoras {
  id:       string
  nombre:   string
  apellido: string
  email:    string
  horas_pedagogicas_total: number
  n_asignaciones: number
}

export default function CargaHorariaDocentesPage() {
  const [docentes, setDocentes] = useState<DocenteHoras[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    api.get<DocenteHoras[]>('/docentes')
      .then(setDocentes)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  const sinHoras = docentes.filter(d => d.horas_pedagogicas_total === 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Carga Horaria Docentes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Horas pedagógicas asignadas por docente</p>
        </div>
        {sinHoras.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            {sinHoras.length} docente(s) sin horas asignadas
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-5 py-3 text-left">Docente</th>
              <th className="px-5 py-3 text-left">Email</th>
              <th className="px-5 py-3 text-center">Asignaciones</th>
              <th className="px-5 py-3 text-center">Horas pedagógicas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {docentes.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-gray-400">No hay docentes registrados</td>
              </tr>
            ) : docentes.map(d => (
              <tr key={d.id} className={`hover:bg-gray-50 transition-colors ${d.horas_pedagogicas_total === 0 ? 'bg-red-50' : ''}`}>
                <td className="px-5 py-3 font-medium text-gray-900">{d.apellido}, {d.nombre}</td>
                <td className="px-5 py-3 text-gray-500">{d.email}</td>
                <td className="px-5 py-3 text-center">{d.n_asignaciones ?? '—'}</td>
                <td className="px-5 py-3 text-center">
                  <Badge variant={d.horas_pedagogicas_total === 0 ? 'danger' : d.horas_pedagogicas_total < 20 ? 'warning' : 'success'}>
                    {d.horas_pedagogicas_total}h
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
