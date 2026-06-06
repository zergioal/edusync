import { Suspense, type ReactNode } from 'react'
import { AppShell } from './AppShell'

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
    </div>
  )
}

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AppShell>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </AppShell>
  )
}
