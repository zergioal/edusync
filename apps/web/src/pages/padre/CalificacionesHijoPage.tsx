import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { PensionBlockModal } from '../../components/ui/PensionBlockModal'
import MisCalificacionesPage from '../estudiante/MisCalificacionesPage'

export default function CalificacionesHijoPage() {
  const { estadoFinanciero } = useAuth()
  const hijos = estadoFinanciero?.hijos ?? []
  const [hijoId, setHijoId] = useState(hijos[0]?.id ?? '')

  if (hijos.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
        No hay hijos registrados en tu cuenta.
      </div>
    )
  }

  const activeId  = hijoId || hijos[0]!.id
  const hijoData  = hijos.find(h => h.id === activeId)
  const bloqueado = hijoData?.bloqueado ?? false

  return (
    <div className="space-y-5">
      {hijos.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500">Hijo/a:</span>
          {hijos.map(h => (
            <button
              key={h.id}
              onClick={() => setHijoId(h.id)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${hijoId === h.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {h.nombre} {h.apellido}
            </button>
          ))}
        </div>
      )}

      {bloqueado ? (
        <PensionBlockModal
          deuda={hijoData?.monto_pendiente ?? 0}
          qrUrl={estadoFinanciero?.qr_pago_url ?? null}
          whatsapp={estadoFinanciero?.whatsapp ?? null}
          nombreHijo={`${hijoData?.nombre} ${hijoData?.apellido}`}

        />
      ) : (
        <MisCalificacionesPage estudianteId={activeId} />
      )}
    </div>
  )
}
