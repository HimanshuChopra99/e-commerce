'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { ImagePlus, Loader2, Save, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { currency, formatCurrency } from '@/config/brand'
import { cn } from '@/lib/utils'
import { useCatalogStore } from '@/stores/catalog-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ProductImage } from '@/components/product-image'
import {
  colorHex,
  colorOptions,
  genders,
  materials,
  productStatuses,
  sizeRun,
} from '../products-data'
import { CategorySelect } from './category-select'

/* ------------------------------ Form schema ------------------------------ */

const formSchema = z
  .object({
    name: z.string().min(2, 'Product name is required.'),
    sku: z
      .string()
      .min(3, 'SKU is required.')
      .regex(/^[A-Za-z0-9-_]+$/, 'Use letters, numbers, dashes only.'),
    description: z
      .string()
      .min(20, 'Write at least 20 characters so shoppers know what this is.'),
    categoryId: z.string().min(1, 'Pick a category.'),
    gender: z.string().min(1, 'Pick who this is for.'),
    brand: z.string().min(1, 'Brand is required.'),
    material: z.string().optional(),
    price: z.coerce.number().positive('Price must be greater than 0.'),
    compareAtPrice: z.coerce.number().min(0).optional(),
    costPerItem: z.coerce.number().min(0).optional(),
    status: z.string().min(1, 'Pick a status.'),
    featured: z.boolean(),
    colors: z.array(z.string()).min(1, 'Select at least one colour.'),
    variants: z
      .array(
        z.object({
          size: z.string(),
          stock: z.coerce.number().min(0),
        })
      )
      .refine((v) => v.some((x) => x.stock > 0), {
        message: 'Add stock to at least one size.',
      }),
    images: z.array(z.string()),
    tags: z.array(z.string()),
  })
  .refine(
    (d) =>
      !d.compareAtPrice || d.compareAtPrice === 0 || d.compareAtPrice > d.price,
    {
      message: 'Compare-at price should be higher than the selling price.',
      path: ['compareAtPrice'],
    }
  )

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

function buildFormValues(row) {
  if (!row) {
    return {
      name: '',
      sku: '',
      description: '',
      categoryId: '',
      gender: '',
      brand: 'Kick',
      material: '',
      price: 0,
      compareAtPrice: 0,
      costPerItem: 0,
      status: 'draft',
      featured: false,
      colors: [],
      variants: sizeRun.map((size) => ({
        size,
        stock: 0,
      })),
      images: [],
      tags: [],
    }
  }

  const images = Array.isArray(row.images) && row.images.length > 0
    ? row.images
    : row.image
    ? [row.image]
    : []

  const colors = Array.isArray(row.colors) ? row.colors : []
  const tags = Array.isArray(row.tags) ? row.tags : []
  const variants = Array.isArray(row.variants) ? row.variants : []

  return {
    name: row.name ?? '',
    sku: row.sku ?? '',
    description: row.description ?? '',
    categoryId: row.categoryId ?? '',
    gender: row.gender ?? '',
    brand: row.brand ?? 'Kick',
    material: row.material ?? '',
    price: row.price ?? 0,
    compareAtPrice: row.compareAtPrice ?? 0,
    costPerItem: row.costPerItem ?? 0,
    status: row.status ?? 'draft',
    featured: row.featured ?? false,
    colors,
    variants: sizeRun.map((size) => ({
      size,
      stock: variants.find((v) => String(v.size) === String(size))?.stock ?? 0,
    })),
    images,
    tags,
  }
}

export function ProductForm({ currentRow }) {
  const isEdit = !!currentRow
  const navigate = useNavigate()
  const addProduct = useCatalogStore((s) => s.addProduct)
  const updateProduct = useCatalogStore((s) => s.updateProduct)
  const [saving, setSaving] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [customColor, setCustomColor] = useState('')

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: buildFormValues(currentRow),
  })

  // Reset form whenever currentRow updates asynchronously after fetching details
  useEffect(() => {
    if (currentRow) {
      form.reset(buildFormValues(currentRow))
    }
  }, [currentRow, form])

  const watchedVariants = form.watch('variants') ?? []
  const watchedImages   = form.watch('images') ?? []
  const watchedTags     = form.watch('tags') ?? []
  const watchedColors   = form.watch('colors') ?? []
  const watchedPrice    = form.watch('price')
  const watchedCost     = form.watch('costPerItem')

  const totalStock = watchedVariants.reduce(
    (sum, v) => sum + (Number(v?.stock) || 0),
    0
  )

  const margin =
    watchedPrice && watchedCost
      ? ((watchedPrice - watchedCost) / watchedPrice) * 100
      : null

  const onSubmit = async (values) => {
    setSaving(true)
    const payload = {
      name: values.name.trim(),
      slug: slugify(values.name),
      sku: values.sku.trim(),
      description: values.description.trim(),
      image: values.images[0] ?? '',
      images: values.images,
      categoryId: values.categoryId,
      gender: values.gender,
      brand: values.brand.trim(),
      price: Number(values.price),
      compareAtPrice: Number(values.compareAtPrice) || null,
      costPerItem: Number(values.costPerItem) || null,
      status: values.status,
      featured: values.featured,
      colors: values.colors,
      variants: values.variants.map((v) => ({
        size: v.size,
        stock: Number(v.stock) || 0,
      })),
      totalStock,
      material: values.material,
      tags: values.tags,
    }

    try {
      if (isEdit && currentRow) {
        await updateProduct(currentRow.id, payload)
      } else {
        await addProduct(payload)
      }
      toast.success(
        isEdit
          ? `"${values.name}" has been updated.`
          : `"${values.name}" has been added to your store.`
      )
      navigate('/products')
    } catch (error) {
      toast.error(error.message || 'Unable to save this product.')
    } finally {
      setSaving(false)
    }
  }

  const onInvalid = () => {
    toast.error('Please fix the highlighted fields before saving.')
  }

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  const MAX_SIZE_MB = 5

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const invalid = files.filter(
      (f) => !ALLOWED_TYPES.includes(f.type) || f.size > MAX_SIZE_MB * 1024 * 1024
    )
    if (invalid.length > 0) {
      toast.error(`Invalid file(s): only JPEG/PNG/WebP/GIF under ${MAX_SIZE_MB}MB are allowed.`)
      e.target.value = ''
      return
    }
    // Convert to object URLs or paths for demo preview
    const newUrls = files.map((f) => URL.createObjectURL(f))
    form.setValue('images', [...watchedImages, ...newUrls], { shouldValidate: true })
  }

  const handleAddImage = () => {
    const url = window.prompt(
      'Paste an image URL or a path from /public (e.g. /products/sneaker-01.png)'
    )
    if (!url) return
    form.setValue('images', [...watchedImages, url.trim()], {
      shouldValidate: true,
    })
  }

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (!tag) return
    if (watchedTags.includes(tag)) {
      setTagInput('')
      return
    }
    form.setValue('tags', [...watchedTags, tag])
    setTagInput('')
  }

  return (
    <Form {...form}>
      <form
        id='product-form'
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        className='grid grid-cols-1 gap-6 lg:grid-cols-3'
      >
        {/* ------------------------- Main column ------------------------- */}
        <div className='flex flex-col gap-6 lg:col-span-2'>
          <Card>
            <CardHeader>
              <CardTitle>Basic information</CardTitle>
              <CardDescription>
                The name and description shoppers see on the product page.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='e.g. Aero Runner 2.0'
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
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Describe the fit, materials and what makes this shoe worth buying...'
                        className='min-h-32 resize-y'
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {field.value?.length ?? 0} characters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='grid gap-4 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='sku'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input placeholder='SS-RUN-0001' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='brand'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <FormControl>
                        <Input placeholder='Kick' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* ----------------------- Media ----------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>Media</CardTitle>
              <CardDescription>
                The first image is used as the main thumbnail.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                {watchedImages.map((src, idx) => (
                  <div key={`${src}-${idx}`} className='group relative'>
                    <ProductImage
                      src={src}
                      alt={`Product image ${idx + 1}`}
                      className='aspect-square w-full'
                    />
                    {idx === 0 && (
                      <Badge className='absolute start-1.5 top-1.5'>Main</Badge>
                    )}
                    <Button
                      type='button'
                      size='icon'
                      variant='destructive'
                      onClick={() =>
                        form.setValue(
                          'images',
                          watchedImages.filter((_, i) => i !== idx)
                        )
                      }
                      className='absolute end-1.5 top-1.5 size-6 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100'
                      aria-label={`Remove image ${idx + 1}`}
                    >
                      <X className='size-3' />
                    </Button>
                  </div>
                ))}

                <button
                  type='button'
                  onClick={handleAddImage}
                  className={cn(
                    'flex aspect-square flex-col items-center justify-center gap-1.5 rounded-md border border-dashed',
                    'text-muted-foreground transition-colors hover:border-primary hover:text-primary',
                    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                  )}
                >
                  <ImagePlus className='size-6' />
                  <span className='text-xs font-medium'>Add image</span>
                </button>
              </div>
              <p className='mt-3 text-xs text-muted-foreground'>
                Demo mode accepts an image URL or a path from{' '}
                <code className='rounded bg-muted px-1'>/public</code>. Wire
                this to your uploader (S3, Cloudinary, UploadThing) in
                production.
              </p>
            </CardContent>
          </Card>

          {/* --------------------- Pricing --------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
              <CardDescription>All amounts in {currency.code}.</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid gap-4 sm:grid-cols-3'>
                <FormField
                  control={form.control}
                  name='price'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Selling price</FormLabel>
                      <FormControl>
                        <div className='relative'>
                          <span className='absolute inset-y-0 start-3 flex items-center text-sm text-muted-foreground'>
                            {currency.symbol}
                          </span>
                          <Input
                            type='number'
                            step='0.01'
                            min='0'
                            className='ps-7'
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='compareAtPrice'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Compare-at price</FormLabel>
                      <FormControl>
                        <div className='relative'>
                          <span className='absolute inset-y-0 start-3 flex items-center text-sm text-muted-foreground'>
                            {currency.symbol}
                          </span>
                          <Input
                            type='number'
                            step='0.01'
                            min='0'
                            className='ps-7'
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>Shown struck-through</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='costPerItem'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost per item</FormLabel>
                      <FormControl>
                        <div className='relative'>
                          <span className='absolute inset-y-0 start-3 flex items-center text-sm text-muted-foreground'>
                            {currency.symbol}
                          </span>
                          <Input
                            type='number'
                            step='0.01'
                            min='0'
                            className='ps-7'
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        {margin !== null && margin > 0
                          ? `${margin.toFixed(0)}% margin`
                          : 'For profit tracking'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* --------------- Sizes & stock (variant matrix) --------------- */}
          <Card>
            <CardHeader>
              <CardTitle>Sizes &amp; stock</CardTitle>
              <CardDescription>
                Set how many pairs you hold in each size. Leave 0 for sizes you
                don&apos;t stock.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4'>
                {watchedVariants.map((variant, index) => (
                  <FormField
                    key={variant.size}
                    control={form.control}
                    name={`variants.${index}.stock`}
                    render={({ field }) => (
                      <FormItem className='rounded-md border p-3'>
                        <FormLabel className='flex items-center justify-between text-xs text-muted-foreground'>
                          <span>UK {variant.size}</span>
                          {Number(field.value) > 0 && (
                            <span className='size-1.5 rounded-full bg-teal-500' />
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            min='0'
                            className='h-8'
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              {form.formState.errors.variants?.root && (
                <p className='mt-3 text-sm text-destructive'>
                  {form.formState.errors.variants.root.message}
                </p>
              )}
              <Separator className='my-4' />
              <div className='flex items-center justify-between text-sm'>
                <span className='text-muted-foreground'>Total stock</span>
                <span className='font-semibold'>{totalStock} pairs</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ------------------------- Side column ------------------------- */}
        <div className='flex flex-col gap-6'>
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <FormField
                control={form.control}
                name='status'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visibility</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Select status' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {productStatuses.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Only <strong>Active</strong> products appear on your site.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='featured'
                render={({ field }) => (
                  <FormItem className='flex items-center justify-between rounded-md border p-3'>
                    <div className='space-y-0.5'>
                      <FormLabel>Featured</FormLabel>
                      <FormDescription className='text-xs'>
                        Show on the homepage
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organisation</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <FormField
                control={form.control}
                name='categoryId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <CategorySelect
                      value={field.value}
                      onChange={field.onChange}
                    />
                    <FormDescription>
                      Manage your categories on the Categories page.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='gender'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Made for</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Select audience' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {genders.map((g) => (
                          <SelectItem key={g.value} value={g.value}>
                            {g.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='material'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Material</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Select material' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {materials.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ------------------------ Colours ------------------------ */}
          <Card>
            <CardHeader>
              <CardTitle>Colours</CardTitle>
              <CardDescription>
                Pick every colourway this listing covers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name='colors'
                render={() => (
                  <FormItem>
                    <div className='grid grid-cols-2 gap-2'>
                      {colorOptions.map((color) => (
                        <FormField
                          key={color.value}
                          control={form.control}
                          name='colors'
                          render={({ field }) => {
                            const list = Array.isArray(field.value) ? field.value : []
                            const checked = list.includes(color.value)
                            return (
                              <FormItem className='flex items-center gap-2 space-y-0 rounded-md border p-2'>
                                <FormControl>
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(value) => {
                                      const next = value
                                        ? [...list, color.value]
                                        : list.filter((v) => v !== color.value)
                                      field.onChange(next)
                                    }}
                                  />
                                </FormControl>
                                <span
                                  className='size-4 shrink-0 rounded-full border shadow-sm'
                                  style={{
                                    backgroundColor: colorHex.get(color.value),
                                  }}
                                />
                                <FormLabel className='cursor-pointer text-sm font-normal'>
                                  {color.label}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage className='mt-2' />
                  </FormItem>
                )}
              />
              <div className='mt-3 flex gap-2'>
                <Input
                  value={customColor}
                  onChange={(event) => setCustomColor(event.target.value)}
                  placeholder='Custom colour: e.g. indigo or #4A69E2'
                  aria-label='Custom product colour'
                />
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => {
                    const value = customColor.trim()
                    if (!value) return
                    if (watchedColors.includes(value)) {
                      setCustomColor('')
                      return
                    }
                    form.setValue('colors', [...watchedColors, value], { shouldValidate: true })
                    setCustomColor('')
                  }}
                >
                  Add
                </Button>
              </div>
              {watchedColors.length > 0 && (
                <p className='mt-3 text-xs text-muted-foreground'>
                  {watchedColors.length} colour
                  {watchedColors.length > 1 ? 's' : ''} selected
                </p>
              )}
            </CardContent>
          </Card>

          {/* -------------------------- Tags -------------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
              <CardDescription>
                Helps shoppers find this shoe through search and filters.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div className='flex gap-2'>
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                  placeholder='e.g. waterproof'
                />
                <Button type='button' variant='outline' onClick={handleAddTag}>
                  Add
                </Button>
              </div>
              {watchedTags.length > 0 && (
                <div className='flex flex-wrap gap-1.5'>
                  {watchedTags.map((tag) => (
                    <Badge key={tag} variant='secondary' className='gap-1'>
                      {tag}
                      <button
                        type='button'
                        onClick={() =>
                          form.setValue(
                            'tags',
                            watchedTags.filter((t) => t !== tag)
                          )
                        }
                        aria-label={`Remove ${tag}`}
                        className='text-muted-foreground hover:text-foreground'
                      >
                        <X className='size-3' />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ------------------------ Summary ------------------------ */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className='space-y-2 text-sm'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Price</span>
                <span className='font-medium'>
                  {formatCurrency(Number(watchedPrice) || 0)}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Total stock</span>
                <span className='font-medium'>{totalStock}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Images</span>
                <span className='font-medium'>{watchedImages.length}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Stock value</span>
                <span className='font-medium'>
                  {formatCurrency((Number(watchedPrice) || 0) * totalStock)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* ------------------------- Actions ------------------------- */}
          <div className='flex flex-col gap-2'>
            <Button type='submit' disabled={saving} className='w-full'>
              {saving ? (
                <>
                  <Loader2 className='animate-spin' /> Saving...
                </>
              ) : (
                <>
                  <Save /> {isEdit ? 'Save changes' : 'Publish product'}
                </>
              )}
            </Button>
            <Button
              type='button'
              variant='outline'
              className='w-full'
              onClick={() => navigate('/products')}
            >
              Cancel
            </Button>
            {isEdit && (
              <Button
                type='button'
                variant='ghost'
                className='w-full text-destructive hover:text-destructive'
                onClick={() =>
                  toast.info('Open the Products list to delete this product.')
                }
              >
                <Trash2 /> Delete product
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  )
}