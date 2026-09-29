// Helpers de presentación de curso/paralelo compartidos entre las vistas en
// grilla de cursos (Estudiantes, Registros) — mismo lenguaje visual por nivel.

const ORDINAL_MAP: Record<string, string> = {
  primer: '1°', primero: '1°',
  segundo: '2°', segunda: '2°',
  tercer: '3°', tercero: '3°',
  cuarto: '4°', cuarta: '4°',
}

export function abbreviateGrado(gradoNombre: string, letra: string): string {
  // "5° de Secundaria" → "5° A"
  const numMatch = gradoNombre.match(/^(\d+°)/)
  if (numMatch) return `${numMatch[1]} ${letra}`
  // "Primer año de Escolaridad" → "1° A"
  const first = gradoNombre.toLowerCase().split(' ')[0] ?? ''
  const num = ORDINAL_MAP[first]
  if (num) return `${num} ${letra}`
  return `${gradoNombre.slice(0, 4)} ${letra}`
}

export const NIVEL_STYLES: Record<string, {
  bg: string; border: string; hover: string
  badge: string; num: string; label: string
}> = {
  INICIAL: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800/60',
    hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-emerald-100 dark:hover:shadow-none',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400', num: 'text-emerald-700 dark:text-emerald-400', label: 'Inicial',
  },
  PRIMARIA: {
    bg: 'bg-sky-50 dark:bg-sky-950/40', border: 'border-sky-200 dark:border-sky-800/60',
    hover: 'hover:bg-sky-100 dark:hover:bg-sky-900/50 hover:border-sky-400 dark:hover:border-sky-600 hover:shadow-sky-100 dark:hover:shadow-none',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400', num: 'text-sky-700 dark:text-sky-400', label: 'Primaria',
  },
  SECUNDARIA: {
    bg: 'bg-violet-50 dark:bg-violet-950/40', border: 'border-violet-200 dark:border-violet-800/60',
    hover: 'hover:bg-violet-100 dark:hover:bg-violet-900/50 hover:border-violet-400 dark:hover:border-violet-600 hover:shadow-violet-100 dark:hover:shadow-none',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400', num: 'text-violet-800 dark:text-violet-300', label: 'Secundaria',
  },
}

export const NIVEL_FALLBACK = {
  bg: 'bg-bg', border: 'border-border',
  hover: 'hover:bg-surface-2 hover:border-fg-muted hover:shadow-none',
  badge: 'bg-surface-2 text-fg-muted', num: 'text-fg', label: '',
}
