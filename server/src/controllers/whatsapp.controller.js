import { asyncHandler } from '../utils/async-handler.js';
import { ok } from '../utils/api-response.js';
import * as agentSearch from '../services/agent-search.service.js';

/**
 * POST /api/whatsapp/search (and POST /api/whatsapp)
 *
 * The ONE single endpoint for the WhatsApp / n8n AI Agent.
 * Accepts structured JSON:
 *   { query, name, brand, category, gender, color, size, price_range, min_price, max_price, sort, limit }
 *
 * Returns:
 *   - mode: 'exact' (when exact or 80-90%+ match found) -> full product details with in-stock sizes, colours, rating, image
 *   - mode: 'list' (broad browse/recommendations) -> top 2-3 products
 *   - mode: 'none' (no matches found)
 *   In all modes, includes a ready-to-send formatted WhatsApp `message`.
 */
export const search = asyncHandler(async (req, res) => {
  const payload = { ...req.query, ...req.body };
  const result = await agentSearch.searchStructured(payload);
  ok(res, result);
});

/**
 * GET /api/whatsapp/search (and GET /api/whatsapp)
 * Quick connectivity & health check for n8n webhook setup.
 */
export const info = asyncHandler(async (_req, res) => {
  ok(res, {
    status: 'online',
    endpoint: 'POST /api/whatsapp/search',
    description:
      'Unified product search for WhatsApp / n8n AI shopping assistant',
    acceptedFields: [
      'query',
      'name',
      'brand',
      'category',
      'gender',
      'color',
      'size',
      'material',
      'price_range',
      'min_price',
      'max_price',
      'sort',
      'limit',
    ],
  });
});
