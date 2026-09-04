import { z } from 'zod';

/** n8n and AI agents often send empty strings or null for unfilled parameters — normalise to undefined. */
const emptyToUndef = (v) => (v === '' || v == null ? undefined : v);
const str = (max) =>
  z.preprocess(emptyToUndef, z.string().trim().max(max).optional());
const num = z.preprocess(
  (v) => (v === '' || v == null ? undefined : Number(v)),
  z.number().min(0).max(10_000_000).optional()
);

/**
 * POST /api/whatsapp/search
 * The ONE unified product search schema for n8n / WhatsApp AI agents.
 */
export const agentSearchSchema = z.object({
  query: str(500),
  q: str(500),
  search: str(500),
  text: str(500),
  name: str(200),
  product_name: str(200),
  brand: str(100),
  category: str(100),
  gender: str(30),
  color: str(50),
  colour: str(50),
  size: str(20),
  material: str(100),
  price_range: str(100),
  min_price: num,
  max_price: num,
  price_min: num,
  price_max: num,
  sort: z.preprocess(
    emptyToUndef,
    z
      .enum(['popular', 'price_asc', 'price_desc', 'rating', 'newest'])
      .optional()
  ),
  product_id: str(100),
  slug: str(250),
  limit: z.preprocess(
    (v) => (v === '' || v == null ? 3 : Number(v)),
    z.number().int().min(1).max(10).default(3)
  ),
});
