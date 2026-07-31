import { Link, useLocation } from 'react-router-dom'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

/**
 * One labelled group of links in the sidebar.
 * Items come from `src/components/layout/sidebar-data.js`.
 */
export function NavGroup({ title, items }) {
  const { pathname } = useLocation()
  const { setOpenMobile } = useSidebar()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton
              asChild
              isActive={isActive(pathname, item.url)}
              tooltip={item.title}
            >
              {/* Close the mobile drawer after tapping a link */}
              <Link to={item.url} onClick={() => setOpenMobile(false)}>
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

/** Highlights "Products" while you're on /products/PRD-1/edit too. */
function isActive(pathname, url) {
  if (url === '/') return pathname === '/'
  return pathname === url || pathname.startsWith(`${url}/`)
}
