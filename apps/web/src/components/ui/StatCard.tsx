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
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   icon: 'bg-blue-100'   },
  green:  { bg: 'bg-green-50',  text: 'text-green-600',  icon: 'bg-green-100'  },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', icon: 'bg-yellow-100' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', icon: 'bg-purple-100' },
  red:    { bg: 'bg-red-50',    text: 'text-red-600',    icon: 'bg-red-100'    },
}

export function StatCard({ label, value, sublabel, icon, color = 'blue' }: StatCardProps) {
  const c = colorMap[color]
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className={`mt-1 text-3xl font-bold ${c.text}`}>{value}</p>
          {sublabel && <p className="mt-1 text-xs text-gray-400">{sublabel}</p>}
        </div>
        <div className={`rounded-lg p-2.5 ${c.icon}`}>
          <NavIcon icon={icon} className={`h-6 w-6 ${c.text}`} />
        </div>
      </div>
    </div>
  )
}
