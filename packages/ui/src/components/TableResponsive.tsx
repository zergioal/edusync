import type { ReactNode } from 'react'

interface TableResponsiveProps {
  children: ReactNode
  className?: string
}

export function TableResponsive({ children, className = '' }: TableResponsiveProps) {
  return (
    <div className={`relative overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>
      {/* Sombra derecha como indicador de scroll */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white/80 to-transparent z-10 hidden"
        aria-hidden="true"
      />
      <div className="overflow-x-auto">
        {children}
      </div>
    </div>
  )
}
