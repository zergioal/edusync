import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const MES_NOMBRES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function BloqueoScreen() {
  const { estadoFinanciero, user, logout } = useAuth()
  const ef = estadoFinanciero

  if (!ef?.bloqueado) return null

  const mes = MES_NOMBRES[(ef.mes_activo ?? 1) - 1] ?? ''
  const whatsappUrl = ef.whatsapp
    ? `https://wa.me/${ef.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, adjunto mi comprobante de pago de pensión.')}`
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header rojo */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6 text-white text-center">
          {/* Candado animado */}
          <div className="flex justify-center mb-3">
            <div className="relative">
              <svg
                className="w-16 h-16 text-white"
                style={{ animation: 'lockPulse 2s ease-in-out infinite' }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold">Acceso Restringido</h1>
          <p className="text-red-100 text-sm mt-1">Sistema académico bloqueado</p>
        </div>

        {/* Cuerpo */}
        <div className="px-8 py-6 space-y-5">
          <p className="text-gray-700 text-center">
            Para acceder a la información académica de{' '}
            <span className="font-semibold">{user?.nombre} {user?.apellido}</span>,
            es necesario estar al día con el pago de pensiones.
          </p>

          {/* Deuda */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-sm text-red-600 font-medium">Monto pendiente — {mes}</p>
            <p className="text-3xl font-bold text-red-700 mt-1">
              Bs. {ef.deuda_pendiente.toFixed(2)}
            </p>
          </div>

          {/* Hijos (si padre con múltiples) */}
          {ef.hijos.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Estado por estudiante</p>
              {ef.hijos.map(h => (
                <div key={h.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span className="text-sm text-gray-800">{h.apellido} {h.nombre}</span>
                  {h.becado ? (
                    <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      BECADO
                    </span>
                  ) : h.bloqueado ? (
                    <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                      Bs. {h.monto_pendiente.toFixed(2)} pendiente
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      Al día
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* QR */}
          {ef.qr_pago_url && (
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-gray-700">Paga escaneando el código QR</p>
              <img
                src={ef.qr_pago_url}
                alt="QR de pago"
                className="mx-auto w-36 h-36 rounded-xl border-2 border-gray-200 object-contain"
                style={{ animation: 'qrPulse 3s ease-in-out infinite' }}
              />
            </div>
          )}

          {/* Botones */}
          <div className="flex flex-col gap-2 pt-1">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl py-3 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Enviar comprobante por WhatsApp
              </a>
            )}
            <button
              onClick={logout}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors py-2"
            >
              Cerrar sesión
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center">
            ¿Ya pagaste? Comunícate con la institución para que registren tu pago.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes lockPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes qrPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
          50% { box-shadow: 0 0 0 8px rgba(59,130,246,0.15); }
        }
      `}</style>
    </div>
  )
}
