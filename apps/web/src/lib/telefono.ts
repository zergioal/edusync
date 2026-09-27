/** Un celular boliviano válido para WhatsApp: 8 dígitos que empiezan con 6 o 7. */
export function esCelularBoliviano(numero: string | null | undefined): boolean {
  if (!numero) return false
  return /^[67]\d{7}$/.test(numero.replace(/\D/g, ''))
}

export function limpiarNumero(numero: string): string {
  return numero.replace(/\D/g, '')
}
