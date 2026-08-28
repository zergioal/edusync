import { Link } from 'react-router-dom'
import type { NavIcon as NavIconType } from '../../lib/roleRoutes'
import { NavIcon } from './NavIcon'

interface QuickAccessCardProps {
  to:    string
  icon:  NavIconType
  label: string
  color?: 'blue' | 'green' | 'yellow' | 'purple' | 'red'
}

const colorMap = {
  blue:   'from-blue-400 to-blue-600',
  green:  'from-emerald-400 to-emerald-600',
  yellow: 'from-amber-400 to-amber-600',
  purple: 'from-purple-400 to-purple-600',
  red:    'from-red-400 to-red-600',
}

/** Tarjeta de "acceso rápido" — ícono real con efecto de neón + dibujado al pasar el mouse o tocar. */
export function QuickAccessCard({ to, icon, label, color = 'blue' }: QuickAccessCardProps) {
  return (
    <Link
      to={to}
      className="glow-card group flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-3 sm:p-4 md:p-5 text-center transition-transform hover:-translate-y-0.5"
    >
      <div className={`flex h-11 w-11 md:h-16 md:w-16 items-center justify-center rounded-xl bg-gradient-to-br ${colorMap[color]} shadow-sm`}>
        <NavIcon icon={icon} className="h-6 w-6 md:h-8 md:w-8 text-white" />
      </div>
      <span className="text-sm md:text-base font-semibold text-fg">{label}</span>
    </Link>
  )
}
