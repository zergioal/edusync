import type { HTMLAttributes } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement>

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div
      className={['rounded-xl border border-gray-200 bg-white shadow-sm', className].join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className = '', children, ...props }: CardProps) {
  return (
    <div className={['border-b border-gray-100 px-6 py-4', className].join(' ')} {...props}>
      {children}
    </div>
  )
}

export function CardContent({ className = '', children, ...props }: CardProps) {
  return (
    <div className={['px-6 py-4', className].join(' ')} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className = '', children, ...props }: CardProps) {
  return (
    <div
      className={['border-t border-gray-100 px-6 py-4', className].join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}
