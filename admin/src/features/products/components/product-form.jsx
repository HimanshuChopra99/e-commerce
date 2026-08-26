'use client'

import { useState } from 'react'
import { z } from 'zod'
import { useForm, useWatch } from 'react-hook-form'
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

const colorValue = z
  .string()
  .trim()
  .min(1, 'A colour is required.')
  .max(40, 'Colour must be 40 characters or fewer.')
  .regex(/^[a-zA-Z0-9#(),.%\s-]+$/, 'Use a valid CSS colour value.')

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
    colors: z.array(colorValue).min(1, 'Select at least one colour.').max(12),
    variants: z
      .array(
        z.object({
          size: z.string(),
          stock: z.coerce.number().int().min(0),
        })
      )
      .refine((v) => v.some((x) => x.stock > 0), {
        message: 'Add stock to at least one size.',
      }),
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

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]
const MAX_IMAGE_SIZE_MB = 5
const MAX_IMAGES_PER_COLOR = 8
const MAX_IMAGES_PER_PRODUCT = 48

function assetId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

function isValidImageUrl(value) {
  const url = value.trim()
  if (/^\/(?!\/)/.test(url)) return true
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol)
  } catch {
    return false
  }
}

function colorsFromProduct(row) {
  if (Array.isArray(row?.colors) && row.colors.length) return row.colors
  if (!Array.isArray(row?.variants)) return []
  return [
    ...new Set(row.variants.map((variant) => variant.color).filter(Boolean)),
  ]
}

function legacyImagesFromProduct(row) {
  if (Array.isArray(row?.images) && row.images.length) return row.images
  return row?.image ? [row.image] : []
}

/**
 * Older products only have a general gallery. Showing that gallery under each
 * colour keeps them editable and gives shoppers the same backwards-compatible
 * fallback until an admin replaces it with colour-specific photos.
 */
function buildColorMedia(row) {
  if (!row) return []
  const colors = colorsFromProduct(row)
  const saved = Array.isArray(row.colorImages) ? row.colorImages : []
  const legacy = legacyImagesFromProduct(row)

  return colors.map((color) => {
    const gallery = saved.find(
      (entry) => entry.color?.toLocaleLowerCase() === color.toLocaleLowerCase()
    )
    const images = gallery?.images?.length ? gallery.images : legacy
    return {
      color,
      assets: [...new Set(images)].map((url) => ({ id: assetId(), url })),
    }
  })
}

function assetsForColor(media, color) {
  return (
    media.find(
      (entry) => entry.color.toLocaleLowerCase() === color.toLocaleLowerCase()
    )?.assets ?? []
  )
}

function ColorMediaEditor({ color, assets, onFiles, onAddUrl, onRemove }) {
  const [url, setUrl] = useState('')
  const swatch = colorHex.get(color) ?? color
  const full = assets.length >= MAX_IMAGES_PER_COLOR

  const submitUrl = () => {
    if (onAddUrl(url)) setUrl('')
  }

  return (
    <div className='rounded-lg border bg-muted/10 p-4'>
      <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <span
            className='size-5 rounded-full border shadow-sm'
            style={{ backgroundColor: swatch }}
            aria-hidden
          />
          <div>
            <p className='text-sm font-semibold'>{color}</p>
            <p className='text-xs text-muted-foreground'>
              {assets.length}/{MAX_IMAGES_PER_COLOR} images
            </p>
          </div>
        </div>
        <label
          className={cn(
            'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium shadow-xs',
            'hover:bg-accent hover:text-accent-foreground focus-within:ring-2 focus-within:ring-ring',
            full && 'pointer-events-none opacity-50'
          )}
        >
          <ImagePlus className='size-4' />
          Upload files
          <input
            type='file'
            accept='image/jpeg,image/png,image/webp,image/avif'
            multiple
            disabled={full}
            onChange={(event) => onFiles(event)}
            className='sr-only'
          />
        </label>
      </div>

      {assets.length > 0 ? (
        <div className='mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4'>
          {assets.map((asset, index) => (
            <div key={asset.id} className='group relative'>
              <ProductImage
                src={asset.url}
                alt={`${color} product image ${index + 1}`}
                className='aspect-square w-full'
              />
              {index === 0 && (
                <Badge className='absolute start-1.5 top-1.5'>
                  Colour main
                </Badge>
              )}
              <Button
                type='button'
                size='icon'
                variant='destructive'
                onClick={() => onRemove(asset.id)}
                className='absolute end-1.5 top-1.5 size-7 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100'
                aria-label={`Remove ${color} image ${index + 1}`}
              >
                <X className='size-3.5' />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className='mb-3 flex min-h-24 items-center justify-center rounded-md border border-dashed text-center text-xs text-muted-foreground'>
          Add at least one image for {color}.
        </div>
      )}

      <div className='flex flex-col gap-2 sm:flex-row'>
        <Input
          value={url}
          disabled={full}
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              submitUrl()
            }
          }}
          placeholder='https://… or /products/image.png'
          aria-label={`Image URL for ${color}`}
        />
        <Button
          type='button'
          variant='outline'
          disabled={full || !url.trim()}
          onClick={submitUrl}
        >
          Add URL
        </Button>
      </div>
    </div>
  )
}

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
      variants: sizeRun.map((size) => ({ size, stock: 0 })),
      tags: [],
    }
  }

  const colors = colorsFromProduct(row)
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
      stock:
        variants.find((variant) => String(variant.size) === String(size))
          ?.stock ?? 0,
    })),
    tags,
  }
}

export function ProductForm({ currentRow }) {
  const isEdit = !!currentRow
  const navigate = useNavigate()
  const addProduct = useCatalogStore((s) => s.addProduct)
  const updateProduct = useCatalogStore((s) => s.updateProduct)
  const uploadProductImages = useCatalogStore((s) => s.uploadProductImages)
  const [saving, setSaving] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [customColor, setCustomColor] = useState('')
  const [colorMedia, setColorMedia] = useState(() =>
    buildColorMedia(currentRow)
  )

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: buildFormValues(currentRow),
  })

  const watchedVariants =
    useWatch({ control: form.control, name: 'variants' }) ?? []
  const watchedTags = useWatch({ control: form.control, name: 'tags' }) ?? []
  const watchedColors =
    useWatch({ control: form.control, name: 'colors' }) ?? []
  const watchedPrice = useWatch({ control: form.control, name: 'price' })
  const watchedCost = useWatch({ control: form.control, name: 'costPerItem' })

  const stockPerColor = watchedVariants.reduce(
    (sum, variant) => sum + (Number(variant?.stock) || 0),
    0
  )
  const totalStock = stockPerColor * watchedColors.length
  const imageCount = watchedColors.reduce(
    (sum, color) => sum + assetsForColor(colorMedia, color).length,
    0
  )

  const margin =
    watchedPrice && watchedCost
      ? ((watchedPrice - watchedCost) / watchedPrice) * 100
      : null

  const appendAssets = (color, assets) => {
    setColorMedia((current) => {
      const existing = current.find(
        (entry) => entry.color.toLocaleLowerCase() === color.toLocaleLowerCase()
      )
      if (!existing) return [...current, { color, assets }]
      return current.map((entry) =>
        entry === existing
          ? { ...entry, assets: [...entry.assets, ...assets] }
          : entry
      )
    })
  }

  const handleFileChange = (color, event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length) return

    const currentAssets = assetsForColor(colorMedia, color)
    const invalid = files.find(
      (file) =>
        !ALLOWED_IMAGE_TYPES.includes(file.type) ||
        file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024
    )
    if (invalid) {
      toast.error(
        `Only JPEG, PNG, WebP or AVIF files under ${MAX_IMAGE_SIZE_MB}MB are allowed.`
      )
      return
    }
    if (currentAssets.length + files.length > MAX_IMAGES_PER_COLOR) {
      toast.error(`${color} can have at most ${MAX_IMAGES_PER_COLOR} images.`)
      return
    }
    if (imageCount + files.length > MAX_IMAGES_PER_PRODUCT) {
      toast.error(
        `A product can have at most ${MAX_IMAGES_PER_PRODUCT} images.`
      )
      return
    }

    appendAssets(
      color,
      files.map((file) => ({
        id: assetId(),
        url: URL.createObjectURL(file),
        file,
      }))
    )
  }

  const handleAddImageUrl = (color, value) => {
    const url = value.trim()
    const currentAssets = assetsForColor(colorMedia, color)
    if (!isValidImageUrl(url)) {
      toast.error(
        'Use an http(s) image URL or an absolute site path beginning with /.'
      )
      return false
    }
    if (
      currentAssets.length >= MAX_IMAGES_PER_COLOR ||
      imageCount >= MAX_IMAGES_PER_PRODUCT
    ) {
      toast.error('The image limit for this product has been reached.')
      return false
    }
    if (currentAssets.some((asset) => asset.url === url)) {
      toast.info('That image is already in this colour gallery.')
      return false
    }
    appendAssets(color, [{ id: assetId(), url }])
    return true
  }

  const handleRemoveImage = (color, id) => {
    setColorMedia((current) =>
      current.map((entry) => {
        if (entry.color.toLocaleLowerCase() !== color.toLocaleLowerCase())
          return entry
        const removed = entry.assets.find((asset) => asset.id === id)
        if (removed?.file) URL.revokeObjectURL(removed.url)
        return {
          ...entry,
          assets: entry.assets.filter((asset) => asset.id !== id),
        }
      })
    )
  }

  const removeColorMedia = (color) => {
    setColorMedia((current) => {
      const removed = current.find(
        (entry) => entry.color.toLocaleLowerCase() === color.toLocaleLowerCase()
      )
      removed?.assets.forEach((asset) => {
        if (asset.file) URL.revokeObjectURL(asset.url)
      })
      return current.filter((entry) => entry !== removed)
    })
  }

  const onSubmit = async (values) => {
    let selectedMedia = values.colors.map((color) => ({
      color,
      assets: assetsForColor(colorMedia, color),
    }))
    const missingColor = selectedMedia.find(
      (entry) => entry.assets.length === 0
    )
    if (missingColor) {
      toast.error(`Add at least one image for ${missingColor.color}.`)
      return
    }

    setSaving(true)
    try {
      const pending = selectedMedia.flatMap((entry) =>
        entry.assets.filter((asset) => asset.file)
      )
      if (pending.length) {
        const uploadedUrls = await uploadProductImages(
          pending.map((asset) => asset.file)
        )
        if (uploadedUrls.length !== pending.length) {
          throw new Error(
            'Some images did not finish uploading. Please try again.'
          )
        }
        let uploadIndex = 0
        selectedMedia = selectedMedia.map((entry) => ({
          ...entry,
          assets: entry.assets.map((asset) => {
            if (!asset.file) return asset
            URL.revokeObjectURL(asset.url)
            return { id: asset.id, url: uploadedUrls[uploadIndex++] }
          }),
        }))
        // Keep successful uploads in the form if the following product request
        // fails, so retrying never uploads the same file twice.
        setColorMedia(selectedMedia)
      }

      const colorImages = selectedMedia.map((entry) => ({
        color: entry.color,
        images: entry.assets.map((asset) => asset.url),
      }))
      const images = [...new Set(colorImages.flatMap((entry) => entry.images))]
      const payload = {
        name: values.name.trim(),
        sku: values.sku.trim(),
        description: values.description.trim(),
        images,
        colorImages,
        categoryId: values.categoryId,
        gender: values.gender,
        brand: values.brand.trim(),
        price: Number(values.price),
        compareAtPrice: Number(values.compareAtPrice) || null,
        costPerItem: Number(values.costPerItem) || null,
        status: values.status,
        featured: values.featured,
        colors: values.colors,
        variants: values.variants.map((variant) => ({
          size: variant.size,
          stock: Number(variant.stock) || 0,
        })),
        material: values.material?.trim() || null,
        tags: values.tags,
      }

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

          {/* ------------------- Colour-specific media ------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>Colour images</CardTitle>
              <CardDescription>
                Add the exact gallery shoppers should see for every selected
                colour. The first image of the first colour is the catalogue
                thumbnail.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              {watchedColors.length === 0 ? (
                <div className='flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed px-4 text-center'>
                  <ImagePlus className='mb-2 size-7 text-muted-foreground' />
                  <p className='text-sm font-medium'>Select a colour first</p>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    A separate image uploader will appear here for each colour.
                  </p>
                </div>
              ) : (
                watchedColors.map((color) => (
                  <ColorMediaEditor
                    key={color}
                    color={color}
                    assets={assetsForColor(colorMedia, color)}
                    onFiles={(event) => handleFileChange(color, event)}
                    onAddUrl={(url) => handleAddImageUrl(color, url)}
                    onRemove={(id) => handleRemoveImage(color, id)}
                  />
                ))
              )}
              <p className='text-xs text-muted-foreground'>
                JPEG, PNG, WebP or AVIF · up to {MAX_IMAGE_SIZE_MB}MB each ·{' '}
                {MAX_IMAGES_PER_COLOR} per colour. Uploaded files are persisted
                by the backend and remain available after refresh.
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
                Set pairs per colour in each size. The same size run is created
                for every selected colour; leave 0 for sizes you don&apos;t
                stock.
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
                <span className='text-muted-foreground'>
                  Total across all colours
                </span>
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
                            const list = Array.isArray(field.value)
                              ? field.value
                              : []
                            const checked = list.includes(color.value)
                            return (
                              <FormItem className='flex items-center gap-2 space-y-0 rounded-md border p-2'>
                                <FormControl>
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(value) => {
                                      if (value && list.length >= 12) {
                                        toast.error(
                                          'A product can have at most 12 colours.'
                                        )
                                        return
                                      }
                                      const next = value
                                        ? [...list, color.value]
                                        : list.filter((v) => v !== color.value)
                                      if (!value) removeColorMedia(color.value)
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
                    const parsed = colorValue.safeParse(customColor)
                    if (!parsed.success) {
                      toast.error(
                        parsed.error.issues[0]?.message ||
                          'Use a valid colour value.'
                      )
                      return
                    }
                    const value = parsed.data
                    if (
                      watchedColors.some(
                        (color) =>
                          color.toLocaleLowerCase() ===
                          value.toLocaleLowerCase()
                      )
                    ) {
                      setCustomColor('')
                      return
                    }
                    if (watchedColors.length >= 12) {
                      toast.error('A product can have at most 12 colours.')
                      return
                    }
                    form.setValue('colors', [...watchedColors, value], {
                      shouldValidate: true,
                    })
                    setCustomColor('')
                  }}
                >
                  Add
                </Button>
              </div>
              {watchedColors.some(
                (color) =>
                  !colorOptions.some((option) => option.value === color)
              ) && (
                <div className='mt-3 flex flex-wrap gap-1.5'>
                  {watchedColors
                    .filter(
                      (color) =>
                        !colorOptions.some((option) => option.value === color)
                    )
                    .map((color) => (
                      <Badge key={color} variant='secondary' className='gap-1'>
                        <span
                          className='size-3 rounded-full border'
                          style={{ backgroundColor: color }}
                          aria-hidden
                        />
                        {color}
                        <button
                          type='button'
                          onClick={() => {
                            removeColorMedia(color)
                            form.setValue(
                              'colors',
                              watchedColors.filter((value) => value !== color),
                              { shouldValidate: true }
                            )
                          }}
                          aria-label={`Remove ${color}`}
                        >
                          <X className='size-3' />
                        </button>
                      </Badge>
                    ))}
                </div>
              )}
              {watchedColors.length > 0 && (
                <p className='mt-3 text-xs text-muted-foreground'>
                  {watchedColors.length} colour
                  {watchedColors.length > 1 ? 's' : ''} selected · add images in
                  the Colour images section
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
                <span className='text-muted-foreground'>Colour images</span>
                <span className='font-medium'>{imageCount}</span>
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
