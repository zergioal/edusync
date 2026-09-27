import { useState, useRef, useEffect } from 'react'
import { Icon } from '../ui/Icon'

interface Props {
  disabled?:  boolean
  dlState:    'idle' | 'pdf' | 'xlsx'
  onExport:   (tipo: 'pdf' | 'xlsx') => void
  className?: string
}

/** Un solo botón "Exportar" que despliega la elección de formato, en vez de dos botones PDF/Excel separados. */
export function ExportarButton({ disabled, dlState, onExport, className = '' }: Props) {
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
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg disabled:opacity-50 transition-colors"
      >
        {exporting ? '…' : <><Icon name="download" className="h-4 w-4" /> Exportar</>}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 w-36 rounded-lg border border-border bg-surface shadow-lg overflow-hidden">
          <button
            type="button"
            onClick={() => { setOpen(false); onExport('pdf') }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-fg hover:bg-surface-2 transition-colors"
          >
            <Icon name="file-pdf" className="h-4 w-4 text-red-600" /> PDF
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); onExport('xlsx') }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-fg hover:bg-surface-2 transition-colors"
          >
            <Icon name="file-excel" className="h-4 w-4 text-green-600" /> Excel
          </button>
        </div>
      )}
    </div>
  )
}
