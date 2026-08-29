// Notificaciones "nativas" del sistema operativo: vibración, notificación del
// SO y número en el ícono de la app instalada (como WhatsApp). Funcionan
// mientras la app/pestaña esté abierta (primer o segundo plano). Para que
// avisen con el celular bloqueado o la app cerrada del todo hace falta Web
// Push real (Service Worker + VAPID + backend) — un paso aparte, más grande.

const ICONO = '/icons/icon-192.png'

export function permisoDisponible(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

/** Pide permiso de notificaciones — llamar solo desde un gesto del usuario (clic). */
export async function pedirPermiso(): Promise<boolean> {
  if (!permisoDisponible()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try {
    const resultado = await Notification.requestPermission()
    return resultado === 'granted'
  } catch {
    return false
  }
}

/** Vibra y muestra una notificación del sistema (si hay permiso). */
export async function avisar(titulo: string, cuerpo: string): Promise<void> {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([200, 100, 200])
  }

  if (!permisoDisponible() || Notification.permission !== 'granted') return

  const opciones = {
    body: cuerpo,
    icon: ICONO,
    badge: ICONO,
    vibrate: [200, 100, 200],
    tag: 'edusync-notificacion',
  } as NotificationOptions

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready
      await reg.showNotification(titulo, opciones)
      return
    }
    new Notification(titulo, opciones)
  } catch {
    /* silencioso */
  }
}

/** Número en el ícono de la app instalada — Android/desktop Chrome; iOS aún no lo soporta bien. */
export function actualizarBadge(cantidad: number): void {
  const nav = navigator as Navigator & {
    setAppBadge?:   (n: number) => Promise<void>
    clearAppBadge?: () => Promise<void>
  }
  if (!nav.setAppBadge || !nav.clearAppBadge) return
  try {
    if (cantidad > 0) nav.setAppBadge(cantidad).catch(() => {})
    else nav.clearAppBadge().catch(() => {})
  } catch {
    /* silencioso */
  }
}
