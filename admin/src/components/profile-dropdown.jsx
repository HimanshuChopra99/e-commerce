import { useState } from 'react'
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

/** Avatar button in the top-right of every page. */
export function ProfileDropdown() {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
            <Avatar className='h-8 w-8'>
              <AvatarFallback>SA</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='w-56' align='end'>
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col gap-1.5'>
              <p className='text-sm leading-none font-medium'>Store Admin</p>
              <p className='text-xs leading-none text-muted-foreground'>
                {brand.supportEmail}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant='destructive'
            onClick={() => setConfirmOpen(true)}
          >
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title='Sign out'
        desc='Are you sure you want to sign out?'
        confirmText='Sign out'
        destructive
        className='sm:max-w-sm'
        // 👉 Hook this up to your real auth once you add a backend.
        handleConfirm={() => {
          setConfirmOpen(false)
          toast.success('Signed out.')
        }}
      />
    </>
  )
}
