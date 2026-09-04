/**
 * ─────────────────────────────────────────────────────────────────────────────
 * KICKS — Unified Lean Product Search Service for WhatsApp / n8n
 * ─────────────────────────────────────────────────────────────────────────────
 * Optimized for minimal payload size and low LLM token consumption in n8n.
 * Returns only essential product data and formatted WhatsApp messages.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import Fuse from 'fuse.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import * as voiceSearch from './voice-search.service.js';
import * as productModel from '../models/product.model.js';
import * as variantModel from '../models/variant.model.js';

const DEFAULT_LIMIT = 3;
const MAX_LIMIT = 5;

const GENDER_MAP = {
  men: 'men',
  man: 'men',
  male: 'men',
  "men's": 'men',
  males: 'men',
  guys: 'men',
  boys: 'men',
  gentleman: 'men',
  women: 'women',
  woman: 'women',
  female: 'women',
  "women's": 'women',
  ladies: 'women',
  girls: 'women',
  girl: 'women',
  unisex: 'unisex',
  kids: 'kids',
  kid: 'kids',
  children: 'kids',
  child: 'kids',
  youth: 'kids',
  toddler: 'kids',
};

function sizeCandidates(rawSize) {
  if (rawSize == null || rawSize === '') return [];
  const s = String(rawSize).trim().toLowerCase().replace(/\s+/g, ' ');
  const m = s.match(/(\d+(?:\.\d+)?)/);
  if (!m) return [s];
  const n = parseFloat(m[1]);
  const candidates = [String(n)];
  if (n >= 5 && n <= 14 && n < 35) {
    candidates.push(String(n + 33));
    candidates.push(String(n + 34));
    candidates.push(String(Math.round(n + 33.5)));
  }
  return [...new Set(candidates)];
}

function isVariantBuyable(variant) {
  if (!variant) return false;
  if (variant.inStock !== undefined) return Boolean(variant.inStock);
  const avail =
    variant.available !== undefined
      ? Number(variant.available)
      : Number(variant.stock ?? 0) - Number(variant.reserved ?? 0);
  return avail > 0;
}

function toNum(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function capitalize(token) {
  return token ? token.charAt(0).toUpperCase() + token.slice(1) : token;
}

function formatPrice(price, currency = env.currency || 'USD') {
  const sym =
    currency === 'INR' ? '₹' : currency === 'USD' ? '$' : `${currency} `;
  return `${sym}${Number(price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/* ───────────────────────── Field normalisation ─────────────────────────── */

function normaliseBrand(inputBrand, text) {
  const direct = String(inputBrand || '').trim();
  if (direct) {
    const map = voiceSearch.getCatalogueBrands();
    return (
      map.get(direct.toLowerCase()) ||
      map.get(direct.toLowerCase().replace(/s$/, '')) ||
      capitalize(direct)
    );
  }
  return voiceSearch.extractBrand(text) || null;
}

function normaliseCategory(inputCategory, text) {
  const direct = String(inputCategory || '').trim();
  if (direct) {
    const map = voiceSearch.getCatalogueCategories();
    return (
      map.get(direct.toLowerCase()) ||
      map.get(direct.toLowerCase().replace(/s$/, '')) || {
        slug: direct.toLowerCase().replace(/\s+/g, '-'),
        name: capitalize(direct),
      }
    );
  }
  return voiceSearch.extractCategory(text) || null;
}

function normaliseGender(inputGender, text) {
  const direct = String(inputGender || '')
    .trim()
    .toLowerCase();
  if (direct)
    return GENDER_MAP[direct] || voiceSearch.extractGender(direct) || null;
  return voiceSearch.extractGender(text) || null;
}

function normaliseColour(inputColour, text) {
  const direct = String(inputColour || '').trim();
  if (direct) {
    const map = voiceSearch.getCatalogueColors();
    return (
      map.get(direct.toLowerCase()) ||
      map.get(direct.toLowerCase().replace(/s$/, '')) ||
      capitalize(direct)
    );
  }
  const haystack = String(text || '').toLowerCase();
  const map = voiceSearch.getCatalogueColors();
  for (const [key, original] of map) {
    if (
      new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(
        haystack
      )
    ) {
      return original;
    }
  }
  const COMMON = [
    'black',
    'white',
    'grey',
    'gray',
    'navy',
    'red',
    'blue',
    'green',
    'brown',
    'tan',
    'beige',
    'pink',
    'yellow',
    'orange',
    'purple',
    'teal',
    'olive',
  ];
  for (const c of COMMON) {
    if (new RegExp(`\\b${c}\\b`).test(haystack)) return capitalize(c);
  }
  return null;
}

/* ─────────────────────── Lean Product Enrichment ───────────────────────── */

async function enrichLeanProduct(product) {
  if (!product) return null;

  let variants = Array.isArray(product.variants) ? product.variants : null;
  if (!variants || !variants.length) {
    try {
      variants = await variantModel.findByProduct(
        product.internalId || product.id,
        { activeOnly: true }
      );
    } catch (err) {
      logger.warn(
        { err: err.message, product: product.slug },
        '[AgentSearch] variant lookup failed'
      );
      variants = [];
    }
  }

  // Filter ONLY available in-stock sizes
  const availableSizes = [
    ...new Set(variants.filter(isVariantBuyable).map((v) => String(v.size))),
  ].sort((a, b) => Number(a) - Number(b));

  const colours = [...new Set(variants.map((v) => v.color).filter(Boolean))];
  const inStock =
    product.inStock !== undefined
      ? Boolean(product.inStock)
      : availableSizes.length > 0;
  const priceNum = Number(product.price);
  const currency = env.currency || 'USD';

  // Only return clean, essential fields
  return {
    id: product.id || product.publicId,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    price: priceNum,
    formatted_price: formatPrice(priceNum, currency),
    in_stock: inStock,
    sizes: availableSizes, // Only in-stock sizes (no out-of-stock clutter)
    colors: colours,
    image: product.image || product.images?.[0] || null,
    // rating: product.rating ? Number(product.rating) : null,
    // description: product.description
    //   ? product.description.length > 100
    //     ? `${product.description.slice(0, 97)}...`
    //     : product.description
    //   : null,
  };
}

/* ──────────────────────── Format WhatsApp Messages ──────────────────────── */

function formatExactMatchMessage(product) {
  const stockText = product.in_stock
    ? '✅ In Stock'
    : '⚠️ Currently out of stock';
  const sizeText = product.sizes?.length
    ? `Available sizes: ${product.sizes.join(', ')}`
    : 'No sizes available right now';
  const colorText = product.colors?.length
    ? `Colors: ${product.colors.join(', ')}`
    : '';
  const ratingText = product.rating ? `⭐ ${product.rating} / 5` : '';

  const lines = [
    `👟 *${product.name}*`,
    `Brand: ${product.brand} | ${product.formatted_price}`,
    [ratingText, stockText].filter(Boolean).join(' | '),
    '',
    sizeText,
  ];

  if (colorText) lines.push(colorText);
  if (product.description) lines.push(`_${product.description}_`);

  lines.push('', 'Would you like to check out or view a specific size?');
  return lines.join('\n');
}

function formatListMessage(products) {
  if (!products.length) {
    return "I couldn't find any shoes matching your search. Try asking for a different brand, category, or color!";
  }

  const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
  const lines = ['*Here are the top picks for you:*', ''];

  products.forEach((p, idx) => {
    const emoji = numberEmojis[idx] || `${idx + 1}.`;
    const sizes = p.sizes?.length
      ? `Sizes: ${p.sizes.slice(0, 6).join(', ')}${p.sizes.length > 6 ? '...' : ''}`
      : 'Out of stock';
    const colors = p.colors?.length ? `Colors: ${p.colors.join(', ')}` : '';
    const details = [sizes, colors].filter(Boolean).join(' | ');

    lines.push(`${emoji} *${p.name}* — ${p.formatted_price}`);
    if (details) lines.push(`   ${details}`);
    lines.push('');
  });

  lines.push('Reply with the shoe name or number to see full details! 👆');
  return lines.join('\n');
}

/* ────────────────────────────── Main entry ─────────────────────────────── */

export async function searchStructured(input = {}) {
  try {
    const rawQuery = String(
      input.query || input.q || input.search || input.text || ''
    ).trim();
    const name = String(input.name || input.product_name || '').trim();
    const text = [rawQuery, name].filter(Boolean).join(' ');

    // 1. Direct ID / Slug lookup
    const productId = String(input.product_id || '').trim();
    const slug = String(input.slug || '').trim();
    if ((productId || slug) && !rawQuery) {
      const direct = productId
        ? await productModel.findByPublicId(productId)
        : await productModel.findBySlug(slug);

      if (direct) {
        const enriched = await enrichLeanProduct(direct);
        return {
          success: true,
          mode: 'exact',
          product: enriched,
          message: formatExactMatchMessage(enriched),
        };
      }
      return {
        success: true,
        mode: 'none',
        total: 0,
        products: [],
        message: `No product found for "${productId || slug}".`,
      };
    }

    // 2. Normalisation
    const brand = normaliseBrand(input.brand, text);
    const categoryDef = normaliseCategory(input.category, text);
    const gender = normaliseGender(input.gender, text);
    const colour = normaliseColour(input.color ?? input.colour, text);

    let minPrice = toNum(input.min_price ?? input.price_min);
    let maxPrice = toNum(input.max_price ?? input.price_max);

    if (input.price_range && typeof input.price_range === 'string') {
      const pr = voiceSearch.extractPriceIntent(input.price_range);
      if (minPrice == null && pr.minPrice != null) minPrice = pr.minPrice;
      if (maxPrice == null && pr.maxPrice != null) maxPrice = pr.maxPrice;
    }

    const sizeRaw = String(input.size || '').trim() || null;
    const requestedLimit = Number(input.limit);
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, MAX_LIMIT)
        : DEFAULT_LIMIT;

    const sort = [
      'popular',
      'price_asc',
      'price_desc',
      'rating',
      'newest',
    ].includes(input.sort)
      ? input.sort
      : undefined;

    const engineInput = {
      query: rawQuery || name || brand || '',
      brand: brand || undefined,
      category: categoryDef?.slug || undefined,
      gender: gender || undefined,
      color: colour || undefined,
      size: sizeCandidates(sizeRaw)[0] || undefined,
      min_price: minPrice ?? undefined,
      max_price: maxPrice ?? undefined,
      sort,
    };

    let result = await voiceSearch.search(engineInput);

    // 3. Relax filters if 0 results
    if (result.type === 'not_found' || result.type === 'error') {
      const fallbackOrder = [
        { color: undefined },
        { size: undefined },
        { category: undefined, gender: undefined },
        { brand: undefined },
      ];
      for (const drop of fallbackOrder) {
        const retry = await voiceSearch.search({ ...engineInput, ...drop });
        if (retry.type === 'multiple' || retry.type === 'exact') {
          result = retry;
          break;
        }
      }

      if (result.type === 'not_found' || result.type === 'error') {
        return {
          success: true,
          mode: 'none',
          total: 0,
          products: [],
          message:
            "I couldn't find any products matching your search. Try asking for a different brand, color, or category!",
        };
      }
    }

    // 4. Score matches
    let pool = (result.products || []).filter(Boolean);
    if (!pool.length && result.product) pool = [result.product];

    const nameQuery = name || rawQuery;
    let exactCandidate = null;
    let highestScore = 0;

    if (nameQuery) {
      const cleanName =
        nameQuery
          .replace(
            /\b(show me|show|find|search|i want|i need|need|the|a|an|of|please|give me|tell me about)\b/gi,
            ' '
          )
          .replace(/\s+/g, ' ')
          .trim() || nameQuery;

      for (const candidate of pool) {
        const score = voiceSearch.calculateNameSimilarity(cleanName, candidate);
        if (score > highestScore) {
          highestScore = score;
          exactCandidate = candidate;
        }
      }
    }

    const matchConfidence = Math.round(highestScore * 100);

    // 5. Exact Match Return
    if (result.type === 'exact' || (exactCandidate && matchConfidence >= 80)) {
      const matchedProduct = exactCandidate || result.product || pool[0];
      const enriched = await enrichLeanProduct(matchedProduct);

      return {
        success: true,
        mode: 'exact',
        product: enriched,
        message: formatExactMatchMessage(enriched),
      };
    }

    // 5b. Relevance check for generic input
    const hasAnyFilter = Boolean(
      brand ||
      categoryDef ||
      gender ||
      colour ||
      minPrice != null ||
      maxPrice != null ||
      sizeRaw
    );
    if (!hasAnyFilter && nameQuery) {
      const probe = new Fuse(pool, {
        keys: ['name', 'brand', 'category.name', 'tags'],
        threshold: 0.45,
        minMatchCharLength: 2,
      });
      const hits = probe.search(nameQuery);
      if (!hits.length && highestScore < 0.6) {
        return {
          success: true,
          mode: 'none',
          total: 0,
          products: [],
          message:
            "I couldn't find any products matching your search. Try asking for a brand (Nike, Adidas, Puma), color, or category!",
        };
      }
    }

    // 6. List Mode Return (Lean)
    const enrichedList = [];
    for (const p of pool.slice(0, 10)) {
      enrichedList.push(await enrichLeanProduct(p));
    }

    // Prioritize in-stock items
    enrichedList.sort((a, b) => {
      const aInStock = a.in_stock && a.sizes?.length > 0 ? 1 : 0;
      const bInStock = b.in_stock && b.sizes?.length > 0 ? 1 : 0;
      return bInStock - aInStock;
    });

    // If size was specified, prioritize items having that size in stock
    let finalList = enrichedList;
    if (sizeRaw) {
      const candidates = sizeCandidates(sizeRaw);
      const withSize = enrichedList.filter((p) =>
        p.sizes?.some((s) => candidates.includes(s))
      );
      if (withSize.length) finalList = withSize;
    }

    const topProducts = finalList.slice(0, limit);

    return {
      success: true,
      mode: 'list',
      total: result.total ?? pool.length,
      products: topProducts,
      message: formatListMessage(topProducts),
    };
  } catch (err) {
    logger.error({ err: err.message }, '[AgentSearch] searchStructured failed');
    return {
      success: false,
      mode: 'error',
      message:
        'Product search encountered an error. Please try again with different keywords.',
    };
  }
}
