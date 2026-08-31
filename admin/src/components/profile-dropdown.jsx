import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { brand } from '@/config/brand'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { logoutAdmin } from '@/store/adminAuthSlice'

/** Avatar button in the top-right of every page. */
export function ProfileDropdown() {
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
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
            <Avatar className='h-8 w-8'>
              <AvatarFallback className='bg-primary/10 text-primary font-medium text-xs'>
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='w-56' align='end'>
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col gap-1.5'>
              <p className='text-sm leading-none font-medium truncate'>
                {displayName}
              </p>
              <p className='text-xs leading-none text-muted-foreground truncate'>
                {displayEmail}
              </p>
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
