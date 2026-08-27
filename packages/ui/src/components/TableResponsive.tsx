import type { ReactNode } from 'react'

interface TableResponsiveProps {
  children: ReactNode
  className?: string
}

export function TableResponsive({ children, className = '' }: TableResponsiveProps) {
  return (
    <div className={`relative overflow-x-auto rounded-xl border border-border bg-surface shadow-sm ${className}`}>
      <div className="overflow-x-auto">
        {children}
      </div>
    </div>
  )
}
