import { useNavigate } from 'react-router-dom'
import { Icon } from './Icon'

interface Props {
  to?:        string
  label?:     string
  className?: string
}

/**
 * Botón de "volver" grande y de alto contraste — pensado para que docentes con
 * dificultad visual lo ubiquen y naveguen sin esfuerzo (a diferencia de un link de texto pequeño).
 */
export function BackButton({ to, label = 'Volver', className = '' }: Props) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => (to ? navigate(to) : navigate(-1))}
      className={`inline-flex items-center gap-2 rounded-xl border-2 border-indigo-600 bg-indigo-600 px-4 py-2.5 text-base font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 hover:border-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 ${className}`}
    >
      <Icon name="arrow-left" className="h-6 w-6" />
      {label}
    </button>
  )
}
