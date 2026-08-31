import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { ChevronsUpDown, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { brand } from '@/config/brand'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { logoutAdmin } from '@/store/adminAuthSlice'

/** The signed-in admin shown at the bottom of the sidebar. */
export function NavUser() {
  const { isMobile } = useSidebar()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.adminAuth || {})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const displayName = user?.name || user?.fullName || 'Store Admin'
  const displayEmail = user?.email || brand.supportEmail
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'SA'

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await dispatch(logoutAdmin()).unwrap()
    } catch {
      // Token is cleared regardless of network/server response
    } finally {
      setIsLoggingOut(false)
      setConfirmOpen(false)
      toast.success('Signed out successfully.')
      navigate('/login', { replace: true })
    }
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size='lg'
                className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
              >
                <Avatar className='h-8 w-8 rounded-lg'>
                  <AvatarFallback className='rounded-lg bg-primary/10 text-primary font-medium text-xs'>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className='grid flex-1 text-start text-sm leading-tight'>
                  <span className='truncate font-semibold'>{displayName}</span>
                  <span className='truncate text-xs'>{displayEmail}</span>
                </div>
                <ChevronsUpDown className='ms-auto size-4' />
              </SidebarMenuButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
              side={isMobile ? 'bottom' : 'right'}
              align='end'
              sideOffset={4}
            >
              <DropdownMenuLabel className='p-0 font-normal'>
                <div className='flex items-center gap-2 px-1 py-1.5 text-start text-sm'>
                  <Avatar className='h-8 w-8 rounded-lg'>
                    <AvatarFallback className='rounded-lg bg-primary/10 text-primary font-medium text-xs'>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className='grid flex-1 text-start text-sm leading-tight'>
                    <span className='truncate font-semibold'>
                      {displayName}
                    </span>
                    <span className='truncate text-xs'>{displayEmail}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant='destructive'
                onClick={() => setConfirmOpen(true)}
              >
                <LogOut className='mr-2 h-4 w-4' />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title='Sign out'
        desc='Are you sure you want to sign out from the admin panel?'
        confirmText={isLoggingOut ? 'Signing out...' : 'Sign out'}
        destructive
        isLoading={isLoggingOut}
        className='sm:max-w-sm'
        handleConfirm={handleLogout}
      />
    </>
  )
}
