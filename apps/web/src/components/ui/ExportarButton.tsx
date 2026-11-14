import { useState, useRef, useEffect } from 'react'
import { Icon, type IconName } from './Icon'
import { Spinner } from '@edusync/ui'

export interface ExportOpcion<T extends string = string> {
  value:        T
  label:        string
  icon:         IconName
  iconColor?:   string
  description?: string
}

const OPCIONES_DEFECTO: ExportOpcion<'pdf' | 'xlsx'>[] = [
  { value: 'pdf',  label: 'PDF',   icon: 'file-pdf',   iconColor: 'text-red-600' },
  { value: 'xlsx', label: 'Excel', icon: 'file-excel', iconColor: 'text-green-600' },
]

interface Props<T extends string> {
  disabled?:  boolean
  /** 'idle' cuando no se está exportando, o el `value` de la opción en curso. */
  dlState:    T | 'idle'
  onExport:   (tipo: T) => void
  className?: string
  /** Lado desde el que se ancla el menú desplegado — 'left' (por defecto) o 'right' si el botón queda pegado al borde derecho. */
  align?:     'left' | 'right'
  /** Por defecto PDF + Excel. Pasar una lista propia para agregar variantes (ej. "Excel — resumen"). */
  opciones?:  ExportOpcion<T>[]
}

/** Un solo botón "Exportar" que despliega la elección de formato, en vez de varios botones sueltos. */
export function ExportarButton<T extends string = 'pdf' | 'xlsx'>({
  disabled, dlState, onExport, className = '', align = 'left',
  opciones = OPCIONES_DEFECTO as unknown as ExportOpcion<T>[],
}: Props<T>) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const exporting = dlState !== 'idle'

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={disabled || exporting}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-fg-muted shadow-sm transition-all hover:border-brand/40 hover:bg-surface-2 hover:text-fg hover:shadow disabled:opacity-50 disabled:shadow-none"
      >
        {exporting ? (
          <><Spinner size="sm" className="h-3.5 w-3.5" /> Generando…</>
        ) : (
          <><Icon name="download" className="h-4 w-4" /> Exportar</>
        )}
      </button>
      {open && (
        <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full z-30 mt-1.5 w-60 overflow-hidden rounded-xl border border-border bg-surface shadow-lg`}>
          {opciones.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { setOpen(false); onExport(o.value) }}
              className="flex w-full items-start gap-2.5 border-b border-border/60 px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-surface-2"
            >
              <Icon name={o.icon} className={`mt-0.5 h-4 w-4 flex-shrink-0 ${o.iconColor ?? 'text-fg-muted'}`} />
              <span>
                <span className="block text-sm font-medium text-fg">{o.label}</span>
                {o.description && <span className="block text-xs text-fg-muted">{o.description}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
