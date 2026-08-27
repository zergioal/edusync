import {
  createContext, useContext, useState, useEffect,
  useCallback, useMemo, type ReactNode,
} from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  preference: ThemePreference
  resolved:   'light' | 'dark'
  setPreference: (p: ThemePreference) => void
  toggle: () => void
}

const STORAGE_KEY = 'edusync-theme'
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function readStored(): ThemePreference {
  const v = localStorage.getItem(STORAGE_KEY)
  return v === 'light' || v === 'dark' ? v : 'system'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStored)
  const [resolved, setResolved] = useState<'light' | 'dark'>(() =>
    preference === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : preference
  )

  useEffect(() => {
    const next = preference === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : preference
    setResolved(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
  }, [preference])

  // Sigue el cambio del sistema mientras la preferencia sea 'system'
  useEffect(() => {
    if (preference !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const next = mq.matches ? 'dark' : 'light'
      setResolved(next)
      document.documentElement.classList.toggle('dark', next === 'dark')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [preference])

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p)
    if (p === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, p)
  }, [])

  const toggle = useCallback(() => {
    setPreference(resolved === 'dark' ? 'light' : 'dark')
  }, [resolved, setPreference])

  const value = useMemo(
    () => ({ preference, resolved, setPreference, toggle }),
    [preference, resolved, setPreference, toggle]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider')
  return ctx
}
