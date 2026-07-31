import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

/**
 * The top bar shown on every page:
 * search box, theme toggle, layout settings and the profile menu.
 */
export function PageHeader({ children }) {
  return (
    <Header fixed>
      {children ?? <Search className='me-auto' />}
      <ThemeSwitch />
      <ConfigDrawer />
      <ProfileDropdown />
    </Header>
  )
}
