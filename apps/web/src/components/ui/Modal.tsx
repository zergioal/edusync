import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  isOpen:    boolean
  onClose:   () => void
  title:     string
  children:  ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
  footer?:   ReactNode
}

const widthMap = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-3xl' }

export function Modal({ isOpen, onClose, title, children, maxWidth = 'md', footer }: ModalProps) {
  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Bloquear scroll del body
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop — click no cierra el modal intencionalmente */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`relative w-full ${widthMap[maxWidth]} rounded-2xl bg-white shadow-2xl`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 id="modal-title" className="text-base font-semibold text-gray-900">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">{children}</div>

        {/* Footer opcional */}
        {footer && (
          <div className="border-t border-gray-100 px-6 py-4">{footer}</div>
        )}
      </div>
    </div>
  )
}
