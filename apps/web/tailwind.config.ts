import type { Config } from 'tailwindcss'

function withOpacity(variable: string) {
  return `rgb(var(${variable}) / <alpha-value>)`
}

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      keyframes: {
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(1rem)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'logout-fade': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'logout-pop': {
          '0%':   { opacity: '0', transform: 'scale(0.75)' },
          '60%':  { opacity: '1', transform: 'scale(1.05)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'electric-pulse': {
          '0%, 100%': { opacity: '0.55', boxShadow: '0 0 4px 0 rgb(129 140 248 / 0.5)' },
          '50%':      { opacity: '1',    boxShadow: '0 0 10px 2px rgb(129 140 248 / 0.85)' },
        },
      },
      animation: {
        'slide-in':      'slide-in 0.2s ease-out',
        'electric-pulse': 'electric-pulse 1.8s ease-in-out infinite',
      },
      colors: {
        // Tokens semánticos — cambian de valor entre :root y .dark (ver index.css),
        // así el modo oscuro es un cambio de variables, no de clases por componente.
        bg:         withOpacity('--color-bg'),
        surface:    withOpacity('--color-surface'),
        'surface-2': withOpacity('--color-surface-2'),
        border:     withOpacity('--color-border'),
        fg:         withOpacity('--color-fg'),
        'fg-muted':  withOpacity('--color-fg-muted'),
        brand: {
          DEFAULT: withOpacity('--color-primary'),
          hover:   withOpacity('--color-primary-hover'),
          fg:      withOpacity('--color-primary-fg'),
          50:  '#eef2ff',
          100: '#e0e7ff',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          900: '#312e81',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
