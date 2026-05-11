import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { Button, Badge, Spinner } from '@edusync/ui'
import { SelectGestion } from '../../components/select/SelectGestion'
import { SelectParalelo } from '../../components/select/SelectParalelo'
import { NuevoEstudianteModal } from './NuevoEstudianteModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Paralelo { id: string; letra: string; grado: { nombre: string; nivel: { nombre: string } } }
interface Estudiante {
  id:       string
  codigo:   string
  becado:   boolean
  usuario:  { nombre: string; apellido: string; email: string }
  matriculas: { paralelo: Paralelo }[]
  relaciones_padre: { padre: { nombre: string; apellido: string } }[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EstudiantesPage({ basePath = '/dashboard/admin' }: { basePath?: string } = {}) {
  const navigate  = useNavigate()
  const toast     = useToast()
  const toastRef  = useRef(toast)
  toastRef.current = toast

  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState(false)

  const [gestionId,   setGestionId]   = useState('')
  const [paraleloId,  setParaleloId]  = useState('')
  const [buscar,      setBuscar]      = useState('')
  const [buscarInput, setBuscarInput] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (gestionId)  qs.set('gestion_id',  gestionId)
      if (paraleloId) qs.set('paralelo_id', paraleloId)
      if (buscar)     qs.set('buscar', buscar)
      setEstudiantes(await api.get<Estudiante[]>(`/estudiantes?${qs}`))
    } catch {
      toastRef.current.error('No se pudieron cargar los estudiantes')
    } finally {
      setLoading(false)
    }
  }, [gestionId, paraleloId, buscar])

  useEffect(() => { load() }, [load])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setBuscar(buscarInput)
  }

  const paralelo = (est: Estudiante) => {
    const m = est.matriculas[0]
    if (!m) return '—'
    return `${m.paralelo.grado.nombre} "${m.paralelo.letra}"`
  }

  const tutor = (est: Estudiante) => {
    const r = est.relaciones_padre[0]
    if (!r) return <span className="italic text-gray-400">Sin tutor</span>
    return `${r.padre.apellido}, ${r.padre.nombre}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estudiantes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Filiación y matrícula</p>
        </div>
        <Button onClick={() => setModal(true)}>+ Matricular estudiante</Button>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap gap-4 items-end">
          <SelectGestion value={gestionId} onChange={setGestionId} label="Gestión" placeholder="— Todas —" />
          <SelectParalelo value={paraleloId} onChange={setParaleloId} label="Paralelo" placeholder="— Todos —" />
          <form onSubmit={handleSearch} className="flex gap-2 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Buscar</label>
              <input
                type="text"
                value={buscarInput}
                onChange={e => setBuscarInput(e.target.value)}
                placeholder="Nombre o código..."
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">Buscar</Button>
            {buscar && <Button type="button" variant="ghost" size="sm" onClick={() => { setBuscar(''); setBuscarInput('') }}>Limpiar</Button>}
          </form>
        </div>
        <p className="text-sm text-gray-500">
          {!loading && `${estudiantes.length} estudiante${estudiantes.length !== 1 ? 's' : ''} encontrado${estudiantes.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-5 py-3">Código</th>
              <th className="px-5 py-3">Apellidos y Nombres</th>
              <th className="px-5 py-3">Paralelo</th>
              <th className="px-5 py-3">Tutor principal</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr><td colSpan={5} className="py-12 text-center"><Spinner /></td></tr>
            )}
            {!loading && estudiantes.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400">
                  No hay estudiantes con los filtros seleccionados.
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
                  <div className="flex items-center gap-2">
                    <span>{est.usuario.apellido}, {est.usuario.nombre}</span>
                    {est.becado && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                        BECA
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">{est.usuario.email}</div>
                </td>
                <td className="px-5 py-3 text-gray-600">{paralelo(est)}</td>
                <td className="px-5 py-3 text-gray-600">{tutor(est)}</td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`${basePath}/estudiante/${est.id}`)}
                    >
                      Ver perfil
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NuevoEstudianteModal
        isOpen={modal}
        onClose={() => setModal(false)}
        onSuccess={load}
      />
    </div>
  )
}
