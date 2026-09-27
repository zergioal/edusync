import { Icon } from './Icon'
import { esCelularBoliviano, limpiarNumero } from '../../lib/telefono'

interface Props {
  numero:  string | null | undefined
  mensaje: string
  label?:  string
}

/** Abre WhatsApp Web/App con un mensaje precargado (editable por quien lo envía) al número dado.
 *  Se deshabilita si el número no es un celular boliviano válido (empieza con 6 o 7 y tiene 8 dígitos). */
export function WhatsAppButton({ numero, mensaje, label = 'WhatsApp' }: Props) {
  const habilitado = esCelularBoliviano(numero)

  if (!habilitado) {
    return (
      <span
        title="No disponible — número fijo o sin registrar"
        className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-fg-muted opacity-50"
      >
        <Icon name="whatsapp" className="h-3.5 w-3.5" /> {label}
      </span>
    )
  }

  const href = `https://wa.me/591${limpiarNumero(numero!)}?text=${encodeURIComponent(mensaje)}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-green-700"
    >
      <Icon name="whatsapp" className="h-3.5 w-3.5" /> {label}
    </a>
  )
}
