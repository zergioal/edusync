import { useNavigate } from 'react-router-dom'

interface Props {
  deuda:       number
  qrUrl:       string | null
  whatsapp:    string | null
  nombreHijo?: string
  onVolver?:   () => void
}

function fmtBs(n: number) {
  return new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export function PensionBlockModal({ deuda, qrUrl, whatsapp, nombreHijo, onVolver }: Props) {
  const navigate = useNavigate()

  function handleVolver() {
    if (onVolver) onVolver()
    else navigate(-1)
  }

  const waLink = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, quisiera consultar sobre el estado de la pensión escolar.')}`
    : null

  return (
    <div className="flex items-start justify-center pt-8 pb-12">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md border border-amber-100 overflow-hidden">

        {/* Franja superior */}
        <div className="h-1.5 bg-gradient-to-r from-amber-300 to-amber-400" />

        <div className="px-7 py-7 text-center space-y-5">

          {/* Icono */}
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 border border-amber-200">
            <svg className="h-7 w-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>

          {/* Títulos */}
          <div>
            <h2 className="text-base font-semibold text-gray-800">Pensión pendiente de pago</h2>
            {nombreHijo && (
              <p className="mt-0.5 text-sm text-amber-600">{nombreHijo}</p>
            )}
          </div>

          {/* Mensaje */}
          <p className="text-sm text-gray-500 leading-relaxed">
            Para consultar la información académica es necesario estar al día con el pago de pensiones.
            Por favor, comunícate con la administración.
          </p>

          {/* Monto */}
          {deuda > 0 && (
            <p className="text-xs text-gray-400">
              Saldo pendiente:{' '}
              <span className="font-semibold text-gray-600">Bs. {fmtBs(deuda)}</span>
            </p>
          )}

          {/* QR de pago */}
          {qrUrl && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="mb-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Pago por QR</p>
              <img
                src={qrUrl}
                alt="Código QR de pago"
                className="mx-auto h-40 w-40 object-contain rounded-lg"
              />
            </div>
          )}

          {/* Acciones */}
          <div className="space-y-2 pt-1">
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-600 transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Contactar por WhatsApp
              </a>
            )}
            <button
              onClick={handleVolver}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Volver
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
