import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-fg">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'rounded-lg border bg-surface px-3 py-2 text-sm text-fg shadow-sm transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-brand',
            error
              ? 'border-red-400 focus:ring-red-400'
              : 'border-border focus:border-brand',
            'disabled:bg-surface-2 disabled:text-fg-muted',
            className,
          ].join(' ')}
          {...props}
        />
        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
        {hint && !error && <p className="text-xs text-fg-muted">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
