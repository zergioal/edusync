import {
  createContext, useContext, useReducer, useCallback,
  useEffect, type ReactNode,
} from 'react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id:      string
  message: string
  type:    ToastType
}

interface ToastApi {
  success: (msg: string) => void
  error:   (msg: string) => void
  info:    (msg: string) => void
  warning: (msg: string) => void
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastApi | null>(null)

type Action =
  | { type: 'ADD';    toast: Toast }
  | { type: 'REMOVE'; id: string }

function reducer(state: Toast[], action: Action): Toast[] {
  if (action.type === 'ADD')    return [...state, action.toast]
  if (action.type === 'REMOVE') return state.filter(t => t.id !== action.id)
  return state
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(reducer, [])

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = crypto.randomUUID()
    dispatch({ type: 'ADD', toast: { id, message, type } })
    setTimeout(() => dispatch({ type: 'REMOVE', id }), 4000)
  }, [])

  const api: ToastApi = {
    success: (msg) => addToast(msg, 'success'),
    error:   (msg) => addToast(msg, 'error'),
    info:    (msg) => addToast(msg, 'info'),
    warning: (msg) => addToast(msg, 'warning'),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastContainer toasts={toasts} onRemove={(id) => dispatch({ type: 'REMOVE', id })} />
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}

// ─── Componentes visuales ────────────────────────────────────────────────────

const STYLES: Record<ToastType, { bar: string; bg: string; icon: string; text: string }> = {
  success: { bar: 'bg-green-500',  bg: 'bg-green-50 border-green-200',  icon: '✓', text: 'text-green-800' },
  error:   { bar: 'bg-red-500',    bg: 'bg-red-50 border-red-200',      icon: '✕', text: 'text-red-800'   },
  info:    { bar: 'bg-blue-500',   bg: 'bg-blue-50 border-blue-200',    icon: 'ℹ', text: 'text-blue-800'  },
  warning: { bar: 'bg-yellow-500', bg: 'bg-yellow-50 border-yellow-200',icon: '⚠', text: 'text-yellow-800' },
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const s = STYLES[toast.type]

  useEffect(() => {
    const t = setTimeout(onRemove, 4000)
    return () => clearTimeout(t)
  }, [onRemove])

  return (
    <div
      className={`flex items-start gap-3 overflow-hidden rounded-lg border shadow-lg ${s.bg} animate-slide-in`}
      role="alert"
    >
      <div className={`w-1 self-stretch flex-shrink-0 ${s.bar}`} />
      <div className="flex flex-1 items-center gap-2 py-3 pr-3">
        <span className={`text-base font-bold ${s.text}`}>{s.icon}</span>
        <p className={`text-sm font-medium ${s.text}`}>{toast.message}</p>
      </div>
      <button
        onClick={onRemove}
        className={`self-center pr-3 text-lg leading-none ${s.text} opacity-50 hover:opacity-100`}
      >
        ×
      </button>
    </div>
  )
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex w-80 flex-col gap-2">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={() => onRemove(t.id)} />
      ))}
    </div>
  )
}
