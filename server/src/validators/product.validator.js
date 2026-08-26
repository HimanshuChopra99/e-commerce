import { z } from 'zod';
import {
  GENDERS,
  SIZES,
  PRODUCT_STATUS,
  CATEGORY_COLORS,
} from '../utils/constants.js';

/** Turns ?status=a,b or ?status=a&status=b into ['a','b']. */
const csvArray = (values) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      const list = Array.isArray(v) ? v : String(v).split(',');
      return list.map((s) => s.trim()).filter((s) => values.includes(s));
    })
    .transform((v) => (v && v.length ? v : undefined));

const colorValue = z
  .string()
  .trim()
  .min(1, 'A colour is required.')
  .max(40, 'Colour must be 40 characters or fewer.')
  // Accept common CSS colour names, hex, rgb(), hsl(), etc. The client uses
  // the exact stored value for the product swatch.
  .regex(/^[a-zA-Z0-9#(),.%\s-]+$/, 'Use a valid CSS colour value.');

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().trim().max(140).optional(),
  gender: csvArray(GENDERS),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
  size: z.string().trim().max(10).optional(),
  color: colorValue.optional(),
  q: z.string().trim().max(120).optional(),
  featured: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  inStock: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  sort: z
    .enum([
      'newest',
      'oldest',
      'price_asc',
      'price_desc',
      'popular',
      'rating',
      'name_asc',
      'name_desc',
      'stock_asc',
      'stock_desc',
    ])
    .default('newest'),
});

export const adminProductQuerySchema = productQuerySchema.extend({
  status: csvArray(PRODUCT_STATUS),
});

const variantSchema = z.object({
  size: z.enum(SIZES),
  stock: z.coerce
    .number()
    .int()
    .min(0, 'Stock cannot be negative.')
    .max(100000),
});

const imageValue = z
  .string()
  .trim()
  .min(1, 'Image URL is required.')
  .max(500, 'Image URL is too long.')
  .refine(
    (value) => /^https?:\/\//i.test(value) || /^\/(?!\/)/.test(value),
    'Use an http(s) image URL or an absolute site path.'
  );

const colorImagesSchema = z
  .array(
    z.object({
      color: colorValue,
      images: z
        .array(imageValue)
        .min(1, 'Add at least one image for this colour.')
        .max(8),
    })
  )
  .max(12)
  .superRefine((entries, ctx) => {
    const seen = new Set();
    let imageCount = 0;
    entries.forEach((entry, index) => {
      const key = entry.color.toLocaleLowerCase();
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, 'color'],
          message: 'Each colour can only have one image gallery.',
        });
      }
      seen.add(key);
      imageCount += entry.images.length;
    });
    if (imageCount > 48) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A product can have at most 48 colour images in total.',
      });
    }
  });

function validateColorImageAssignments(data, ctx) {
  if (!data.colorImages?.length || !data.colors) return;
  const selected = new Set(
    data.colors.map((color) => color.toLocaleLowerCase())
  );
  const assigned = new Set(
    data.colorImages.map((entry) => entry.color.toLocaleLowerCase())
  );

  data.colorImages.forEach((entry, index) => {
    if (!selected.has(entry.color.toLocaleLowerCase())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['colorImages', index, 'color'],
        message: `Colour "${entry.color}" is not selected for this product.`,
      });
    }
  });

  data.colors.forEach((color) => {
    if (!assigned.has(color.toLocaleLowerCase())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['colorImages'],
        message: `Add at least one image for ${color}.`,
      });
    }
  });
}

export const createProductSchema = z
  .object({
    name: z.string().trim().min(2, 'Product name is required.').max(200),
    sku: z
      .string()
      .trim()
      .min(3, 'SKU is required.')
      .max(60)
      .regex(
        /^[A-Za-z0-9_-]+$/,
        'Use letters, numbers, dashes and underscores only.'
      ),
    description: z
      .string()
      .trim()
      .min(20, 'Write at least 20 characters so shoppers know what this is.')
      .max(20000),
    categoryId: z.string().trim().min(1, 'Pick a category.'),
    gender: z.enum(GENDERS, {
      errorMap: () => ({ message: 'Pick who this is for.' }),
    }),
    brand: z.string().trim().min(1, 'Brand is required.').max(80),
    material: z.string().trim().max(80).optional().nullable(),
    price: z.coerce
      .number()
      .positive('Price must be greater than 0.')
      .max(1000000),
    compareAtPrice: z.coerce.number().min(0).max(1000000).optional().nullable(),
    costPerItem: z.coerce.number().min(0).max(1000000).optional().nullable(),
    status: z.enum(PRODUCT_STATUS).default('draft'),
    featured: z.boolean().default(false),
    colors: z.array(colorValue).min(1, 'Select at least one colour.').max(12),
    variants: z
      .array(variantSchema)
      .min(1, 'Add at least one size.')
      .refine(
        (v) => v.some((x) => x.stock > 0),
        'Add stock to at least one size.'
      ),
    images: z.array(imageValue).max(48).default([]),
    colorImages: colorImagesSchema.default([]),
    tags: z.array(z.string().trim().max(40)).max(20).default([]),
  })
  .refine(
    (d) =>
      !d.compareAtPrice || d.compareAtPrice === 0 || d.compareAtPrice > d.price,
    {
      message: 'Compare-at price must be higher than the selling price.',
      path: ['compareAtPrice'],
    }
  )
  .superRefine(validateColorImageAssignments);

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    sku: z
      .string()
      .trim()
      .min(3)
      .max(60)
      .regex(/^[A-Za-z0-9_-]+$/)
      .optional(),
    description: z.string().trim().min(20).max(20000).optional(),
    categoryId: z.string().trim().nullable().optional(),
    gender: z.enum(GENDERS).optional(),
    brand: z.string().trim().min(1).max(80).optional(),
    material: z.string().trim().max(80).nullable().optional(),
    price: z.coerce.number().positive().max(1000000).optional(),
    compareAtPrice: z.coerce.number().min(0).max(1000000).nullable().optional(),
    costPerItem: z.coerce.number().min(0).max(1000000).nullable().optional(),
    status: z.enum(PRODUCT_STATUS).optional(),
    featured: z.boolean().optional(),
    colors: z.array(colorValue).min(1).max(12).optional(),
    variants: z.array(variantSchema).optional(),
    images: z.array(imageValue).max(48).optional(),
    colorImages: colorImagesSchema.optional(),
    tags: z.array(z.string().trim().max(40)).max(20).optional(),
  })
  .refine(
    (d) =>
      d.compareAtPrice === undefined ||
      d.compareAtPrice === null ||
      d.compareAtPrice === 0 ||
      d.price === undefined ||
      d.compareAtPrice > d.price,
    {
      message: 'Compare-at price must be higher than the selling price.',
      path: ['compareAtPrice'],
    }
  )
  .superRefine(validateColorImageAssignments);

export const updateVariantsSchema = z.object({
  variants: z
    .array(
      z.object({
        size: z.enum(SIZES),
        color: colorValue.optional(),
        stock: z.coerce.number().int().min(0).max(100000),
      })
    )
    .min(1, 'Send at least one size.'),
});

export const bulkStatusSchema = z.object({
  productIds: z
    .array(z.string().trim().min(1))
    .min(1, 'Select at least one product.')
    .max(200),
  status: z.enum(PRODUCT_STATUS),
});

export const bulkDeleteSchema = z.object({
  productIds: z
    .array(z.string().trim().min(1))
    .min(1, 'Select at least one product.')
    .max(200),
});

/* ------------------------------ Categories ----------------------------- */

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, 'Category name is required.').max(120),
  description: z.string().trim().max(300).optional().nullable(),
  color: z.enum(CATEGORY_COLORS).default('slate'),
  image: z.string().trim().max(500).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(300).nullable().optional(),
  color: z.enum(CATEGORY_COLORS).optional(),
  image: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

export const assignProductsSchema = z.object({
  productIds: z
    .array(z.string().trim().min(1))
    .min(1, 'Select at least one product.')
    .max(200),
});
