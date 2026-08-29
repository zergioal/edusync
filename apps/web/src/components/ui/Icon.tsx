interface Props {
  name:      IconName
  className?: string
}

export type IconName =
  | 'trophy' | 'grid' | 'clipboard-check' | 'folder' | 'graduation-cap' | 'notebook'
  | 'document-list' | 'id-card' | 'user-check' | 'trending-up' | 'calendar-check'
  | 'award' | 'users'
  | 'document-x' | 'user-x' | 'door-exit' | 'clipboard-x' | 'mail' | 'alert-triangle' | 'pencil' | 'user-minus'

// Set minimalista de línea, mismo lenguaje visual que components/ui/NavIcon.tsx
// (viewBox 24x24, trazo redondeado) — para tarjetas de reportes y botones de acción.
const PATHS: Record<IconName, string[]> = {
  trophy: [
    'M8 21h8',
    'M12 17v4',
    'M17 4H7v4a5 5 0 0010 0V4z',
    'M7 4H4.5a2.5 2.5 0 000 5H7',
    'M17 4h2.5a2.5 2.5 0 010 5H17',
  ],
  grid: [
    'M4 4h7v7H4z',
    'M13 4h7v7h-7z',
    'M4 13h7v7H4z',
    'M13 13h7v7h-7z',
  ],
  'clipboard-check': [
    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2',
    'M9 3.5A1.5 1.5 0 0110.5 2h3A1.5 1.5 0 0115 3.5V6H9V3.5z',
    'M8.5 13l2.5 2.5 4.5-5',
  ],
  folder: [
    'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z',
  ],
  'graduation-cap': [
    'M12 3L2 8l10 5 10-5-10-5z',
    'M6 10.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-5.5',
    'M22 8v6',
  ],
  notebook: [
    'M6 3h12a1 1 0 011 1v16a1 1 0 01-1 1H6a2 2 0 01-2-2V5a2 2 0 012-2z',
    'M4 7h2', 'M4 11.5h2', 'M4 16h2',
    'M9 8h7', 'M9 12h7', 'M9 16h4',
  ],
  'document-list': [
    'M7 3h7l4 4v14a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z',
    'M14 3v4h4',
    'M9 9h3', 'M9 12.5h6', 'M9 16h6',
  ],
  'id-card': [
    'M3 6h18a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V7a1 1 0 011-1z',
    'M7.5 12a2 2 0 100-4 2 2 0 000 4z',
    'M5 16c.4-1.4 1.6-2 2.5-2s2.1.6 2.5 2',
    'M14 10h6', 'M14 14h4',
  ],
  'user-check': [
    'M9 11a4 4 0 100-8 4 4 0 000 8z',
    'M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2',
    'M17 11l2 2 4-4',
  ],
  'trending-up': [
    'M3 17l6-6 4 4 8-8',
    'M15 7h6v6',
  ],
  'calendar-check': [
    'M8 2v4M16 2v4M3 9h18',
    'M4 5h16a1 1 0 011 1v13a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z',
    'M9 15l2 2 4-4',
  ],
  award: [
    'M12 15a6 6 0 100-12 6 6 0 000 12z',
    'M9 14l-2 7 5-3 5 3-2-7',
  ],
  users: [
    'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2',
    'M23 21v-2a4 4 0 00-3-3.87',
    'M16 3.13a4 4 0 010 7.75',
    'M9 11a4 4 0 100-8 4 4 0 000 8z',
  ],
  'document-x': [
    'M7 3h7l4 4v14a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z',
    'M14 3v4h4',
    'M9.5 12.5l4 4', 'M13.5 12.5l-4 4',
  ],
  'user-x': [
    'M9 11a4 4 0 100-8 4 4 0 000 8z',
    'M3 21v-2a4 4 0 014-4h2.5',
    'M16 13l4 4', 'M20 13l-4 4',
  ],
  'door-exit': [
    'M11 4H6a1 1 0 00-1 1v14a1 1 0 001 1h5',
    'M14 12h7', 'M18 8.5l3 3.5-3 3.5',
    'M11 4v16',
  ],
  'clipboard-x': [
    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2',
    'M9 3.5A1.5 1.5 0 0110.5 2h3A1.5 1.5 0 0115 3.5V6H9V3.5z',
    'M9.5 12.5l4 4', 'M13.5 12.5l-4 4',
  ],
  mail: [
    'M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1z',
    'M3.5 7l8.5 6 8.5-6',
  ],
  'alert-triangle': [
    'M12 3L2 20h20L12 3z',
    'M12 10v4', 'M12 17h.01',
  ],
  pencil: [
    'M16.5 4.5l3 3L7 20l-4 1 1-4L16.5 4.5z',
    'M15 6l3 3',
  ],
  'user-minus': [
    'M9 11a4 4 0 100-8 4 4 0 000 8z',
    'M3 21v-2a4 4 0 014-4h2.5',
    'M15 15h6',
  ],
}

export function Icon({ name, className = 'h-5 w-5' }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.6}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name].map((d, i) => (
        <path key={i} d={d} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  )
}
