import { Outlet } from 'react-router-dom'
import { getCookie } from '@/lib/cookies'
import { cn } from '@/lib/utils'
import { LayoutProvider } from '@/context/layout-provider'
import { SearchProvider } from '@/context/search-provider'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { SkipToMain } from '@/components/skip-to-main'
import { Toaster } from '@/components/ui/sonner'
import { LiveTrackerIndicator } from '@/components/live-tracker-indicator'

/**
 * The shell every page renders inside: sidebar on the left, page in <Outlet />.
 */
export function AppLayout() {
  // Remember whether the sidebar was open last time.
  const defaultOpen = getCookie('sidebar_state') !== 'false'

  return (
    <SearchProvider>
      <LayoutProvider>
        <SidebarProvider defaultOpen={defaultOpen}>
          <SkipToMain />
          <AppSidebar />
          <SidebarInset
            className={cn(
              // Enables container queries for the page content
              '@container/content',
              // Keep a fixed layout from overflowing the viewport
              'has-data-[layout=fixed]:h-svh',
              'peer-data-[variant=inset]:has-data-[layout=fixed]:h-[calc(100svh-(var(--spacing)*4))]'
            )}
          >
            <Outlet />
          </SidebarInset>
        </SidebarProvider>
        <LiveTrackerIndicator />
        <Toaster duration={5000} />
      </LayoutProvider>
    </SearchProvider>
  )
}
