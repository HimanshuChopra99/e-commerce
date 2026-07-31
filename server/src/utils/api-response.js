/**
 * Every response uses the same envelope so the frontend can rely on its shape.
 *
 *   { success: true,  data: ... , meta?: ... }
 *   { success: false, error: { code, message, details? } }
 */

export function ok(res, data, meta = null) {
  const body = { success: true, data }
  if (meta) body.meta = meta
  return res.status(200).json(body)
}

export function created(res, data) {
  return res.status(201).json({ success: true, data })
}

export function noContent(res) {
  return res.status(204).send()
}

export function paginated(res, items, meta) {
  return res.status(200).json({ success: true, data: items, meta })
}
