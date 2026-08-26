'use client'

import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useDispatch } from 'react-redux'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createAdminDeliveryPartner,
  updateAdminDeliveryPartner,
  fetchAdminDeliveryPartners,
} from '@/store/adminDeliveryPartnersSlice'
import { vehicleTypes } from '../delivery-partners-data'

const baseSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.').max(60),
  lastName: z.string().trim().min(1, 'Last name is required.').max(60),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter a valid email address.')
    .max(160),
  phone: z.string().trim().max(24).optional().or(z.literal('')),
  vehicleType: z.enum(['bike', 'scooter', 'car']).default('bike'),
})

const createSchema = baseSchema.extend({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(72),
})

const editSchema = baseSchema.extend({
  password: z
    .string()
    .max(72)
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || v.length >= 8, {
      message: 'Password must be at least 8 characters.',
    }),
  status: z.enum(['active', 'blocked']).optional(),
})

export function DeliveryPartnerFormDialog({ open, onOpenChange, currentRow }) {
  const isEdit = !!currentRow
  const dispatch = useDispatch()

  const form = useForm({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      vehicleType: 'bike',
      password: '',
      status: 'active',
    },
  })

  // Re-seed the form whenever the dialog opens for a different row.
  useEffect(() => {
    if (!open) return
    form.reset(
      currentRow
        ? {
            firstName: currentRow.firstName || '',
            lastName: currentRow.lastName || '',
            email: currentRow.email || '',
            phone: currentRow.phone || '',
            vehicleType: currentRow.vehicleType || 'bike',
            password: '',
            status: currentRow.status || 'active',
          }
        : {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            vehicleType: 'bike',
            password: '',
            status: 'active',
          }
    )
  }, [open, currentRow, form])

  const onSubmit = async (values) => {
    const payload = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone || null,
      vehicleType: values.vehicleType,
    }

    try {
      if (isEdit && currentRow) {
        const updatePayload = { ...payload, status: values.status }
        if (values.password) updatePayload.password = values.password
        await dispatch(
          updateAdminDeliveryPartner({
            id: currentRow.id,
            payload: updatePayload,
          })
        ).unwrap()
        toast.success(
          `${values.firstName} ${values.lastName} has been updated.`
        )
      } else {
        await dispatch(
          createAdminDeliveryPartner({ ...payload, password: values.password })
        ).unwrap()
        toast.success(
          `${values.firstName} ${values.lastName} registered as a delivery partner.`
        )
      }
      dispatch(fetchAdminDeliveryPartners({ limit: 100 }))
      onOpenChange(false)
    } catch (error) {
      toast.error(error || 'Unable to save this delivery partner.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle>
            {isEdit ? 'Edit Delivery Partner' : 'Register Delivery Partner'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the delivery partner details.'
              : 'Add a new rider to your delivery fleet.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id='delivery-partner-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4'
          >
            <div className='grid gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='firstName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='e.g. John'
                        autoComplete='off'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='lastName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='e.g. Rider'
                        autoComplete='off'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='partner@example.com'
                      type='email'
                      autoComplete='off'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='phone'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='+1 555-0000'
                      autoComplete='off'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='vehicleType'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Select vehicle' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehicleTypes.map((v) => (
                          <SelectItem key={v.value} value={v.value}>
                            <span className='flex items-center gap-2 capitalize'>
                              {v.icon && <v.icon className='size-3.5' />}
                              {v.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isEdit && (
                <FormField
                  control={form.control}
                  name='status'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Select status' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='active'>Active</SelectItem>
                          <SelectItem value='blocked'>Blocked</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name='password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {isEdit ? 'Reset password (optional)' : 'Password'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        isEdit
                          ? 'Leave blank to keep current password'
                          : 'At least 8 characters'
                      }
                      type='password'
                      autoComplete='new-password'
                      {...field}
                    />
                  </FormControl>
                  {isEdit && (
                    <FormDescription>
                      Only fill this in if you want to change the password.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type='submit' form='delivery-partner-form'>
            {isEdit ? 'Save changes' : 'Register partner'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
