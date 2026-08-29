// Service worker mínimo — su único trabajo hoy es habilitar "Instalar app" en el
// navegador y mostrar notificaciones del sistema (navigator.serviceWorker.ready
// .showNotification, requerido en Chrome/Android — Notification directa no
// funciona ahí). No cachea nada todavía: cada carga va directo a la red.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // sin estrategia de cache por ahora
})

// Al tocar una notificación del sistema, enfoca o abre la pestaña de la app.
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientsList => {
      for (const client of clientsList) {
        if ('focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow('/dashboard')
    }),
  )
})
