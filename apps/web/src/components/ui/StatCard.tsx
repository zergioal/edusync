import type { NavIcon as NavIconType } from '../../lib/roleRoutes'
import { NavIcon } from './NavIcon'

interface StatCardProps {
  label:    string
  value:    string | number
  sublabel?: string
  icon:     NavIconType
  color?:   'blue' | 'green' | 'yellow' | 'purple' | 'red'
}

const colorMap = {
  blue:   { text: 'text-blue-600 dark:text-blue-400',     grad: 'from-blue-400 to-blue-600',       ring: 'ring-blue-200 dark:ring-blue-900/60'       },
  green:  { text: 'text-emerald-600 dark:text-emerald-400', grad: 'from-emerald-400 to-emerald-600', ring: 'ring-emerald-200 dark:ring-emerald-900/60' },
  yellow: { text: 'text-amber-600 dark:text-amber-400',    grad: 'from-amber-400 to-amber-600',     ring: 'ring-amber-200 dark:ring-amber-900/60'     },
  purple: { text: 'text-purple-600 dark:text-purple-400',  grad: 'from-purple-400 to-purple-600',   ring: 'ring-purple-200 dark:ring-purple-900/60'   },
  red:    { text: 'text-red-600 dark:text-red-400',        grad: 'from-red-400 to-red-600',         ring: 'ring-red-200 dark:ring-red-900/60'         },
}

export function StatCard({ label, value, sublabel, icon, color = 'blue' }: StatCardProps) {
  const c = colorMap[color]
  return (
    <div className="group rounded-xl border border-border bg-surface p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-medium text-fg-muted truncate">{label}</p>
          <p className={`mt-0.5 text-xl sm:text-2xl font-bold ${c.text}`}>{value}</p>
          {sublabel && <p className="mt-0.5 text-xs text-fg-muted truncate">{sublabel}</p>}
        </div>
        <div className={`flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${c.grad} ring-2 ${c.ring} shadow-sm`}>
          <NavIcon icon={icon} className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  )
}
