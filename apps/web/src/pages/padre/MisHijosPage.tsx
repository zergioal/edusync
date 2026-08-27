import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Badge } from '@edusync/ui'

export default function MisHijosPage() {
  const navigate = useNavigate()
  const { estadoFinanciero } = useAuth()
  const hijos = estadoFinanciero?.hijos ?? []

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-fg">Mis Hijos</h1>

      {hijos.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border bg-surface p-10 text-center text-sm text-fg-muted">
          No hay hijos registrados en tu cuenta.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {hijos.map(h => (
            <div
              key={h.id}
              onClick={() => navigate(`/dashboard/padre/hijo/${h.id}`)}
              className="cursor-pointer rounded-xl border border-border bg-surface p-5 shadow-sm hover:border-blue-300 transition"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold">
                  {h.nombre[0]}{h.apellido[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-fg truncate">{h.apellido}, {h.nombre}</p>
                  {h.becado
                    ? <Badge variant="info">Becado</Badge>
                    : h.bloqueado
                      ? <Badge variant="danger">Pensión pendiente</Badge>
                      : <Badge variant="success">Al día</Badge>}
                </div>
              </div>
              <p className="mt-3 text-xs text-blue-600 font-medium">Ver notas y asistencia →</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
