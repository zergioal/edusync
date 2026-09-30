import { useState, useEffect, useCallback } from 'react'

/**
 * Estado de un lightbox/modal que se integra con el historial del navegador:
 * al abrirlo se empuja una entrada de historial, así el botón "atrás" del
 * celular (o del navegador) cierra el modal en vez de salir de la página.
 * Cerrarlo manualmente también pasa por history.back() para no dejar esa
 * entrada fantasma colgando (evita tener que presionar "atrás" dos veces).
 */
export function useLightbox<T>() {
  const [item, setItem] = useState<T | null>(null)

  useEffect(() => {
    if (!item) return
    window.history.pushState({ lightbox: true }, '')
    const onPopState = () => setItem(null)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(item)])

  const abrir  = useCallback((v: T) => setItem(v), [])
  const cerrar = useCallback(() => { window.history.back() }, [])

  return { item, abrir, cerrar }
}
