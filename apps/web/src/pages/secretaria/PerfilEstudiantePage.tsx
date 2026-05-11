import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { Button, Badge, Spinner } from '@edusync/ui'

interface Estudiante {
  id:      string
  codigo:  string
  nivel:   { nombre: string }
  usuario: { nombre: string; apellido: string; email: string; activo: boolean }
  matriculas: {
    id:         string
    paralelo:   { letra: string; grado: { nombre: string; nivel: { nombre: string } } }
    gestion:    { anno: number; activa: boolean }
  }[]
  relaciones_padre: {
    padre: { nombre: string; apellido: string; email: string }
  }[]
}

export default function PerfilEstudiantePage() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const [est,     setEst]     = useState<Estudiante | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!id) return
    api.get<Estudiante>(`/estudiantes/${id}`)
      .then(setEst)
      .catch(() => setError('No se pudo cargar el perfil del estudiante'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>
  if (error || !est) return (
    <div className="text-center py-16 text-red-500">
      {error || 'Estudiante no encontrado'}
    </div>
  )

  const matriculaActiva = est.matriculas.find(m => m.gestion.activa) ?? est.matriculas[0]

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>← Volver</Button>
        <h1 className="text-2xl font-bold text-gray-900">Perfil del estudiante</h1>
      </div>

      {/* Datos personales */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xl font-bold text-gray-900">
              {est.usuario.apellido}, {est.usuario.nombre}
            </p>
            <p className="text-sm text-gray-500 mt-1">{est.usuario.email}</p>
          </div>
          <div className="text-right space-y-1">
            <span className="font-mono text-sm bg-gray-100 px-3 py-1 rounded text-gray-700 block">
              {est.codigo}
            </span>
            {est.usuario.activo
              ? <Badge variant="success">Activo</Badge>
              : <Badge variant="danger">Inactivo</Badge>}
          </div>
        </div>

        {matriculaActiva && (
          <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Nivel:</span>{' '}
              <span className="font-medium">{matriculaActiva.paralelo.grado.nivel.nombre}</span>
            </div>
            <div>
              <span className="text-gray-500">Grado y Paralelo:</span>{' '}
              <span className="font-medium">
                {matriculaActiva.paralelo.grado.nombre} "{matriculaActiva.paralelo.letra}"
              </span>
            </div>
            <div>
              <span className="text-gray-500">Gestión actual:</span>{' '}
              <span className="font-medium">{matriculaActiva.gestion.anno}</span>
            </div>
          </div>
        )}
      </div>

      {/* Tutores */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">Tutores / Padres</h2>
        {est.relaciones_padre.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Sin tutores registrados</p>
        ) : (
          <div className="space-y-3">
            {est.relaciones_padre.map((rel, i) => (
              <div key={i} className="flex items-center gap-4 text-sm">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">
                  {rel.padre.nombre[0]}
                </div>
                <div>
                  <p className="font-medium text-gray-800">{rel.padre.apellido}, {rel.padre.nombre}</p>
                  <p className="text-gray-400">{rel.padre.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial de matrículas */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">
          Historial de matrículas
        </h2>
        {est.matriculas.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Sin matrículas registradas</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="pb-2">Gestión</th>
                <th className="pb-2">Grado</th>
                <th className="pb-2">Paralelo</th>
                <th className="pb-2">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {est.matriculas.map(m => (
                <tr key={m.id}>
                  <td className="py-2 font-medium">{m.gestion.anno}</td>
                  <td className="py-2 text-gray-600">{m.paralelo.grado.nombre}</td>
                  <td className="py-2">{m.paralelo.letra}</td>
                  <td className="py-2">
                    {m.gestion.activa
                      ? <Badge variant="success">Activa</Badge>
                      : <Badge variant="default">Finalizada</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
