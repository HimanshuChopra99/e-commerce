/**
 * Reports which page, filters, product details, and cart state the customer is currently viewing
 * to the server over the socket (`page:update`).
 */
import { getSocket } from './socket';
import { store } from '../store';

let lastEmitted = null;

function extractFilters(params) {
  const filters = {};
  if (params.get('category')) filters.category = params.get('category');
  if (params.get('gender')) filters.gender = params.get('gender');
  if (params.get('color')) filters.color = params.get('color');
  if (params.get('size')) filters.size = params.get('size');
  if (params.get('minPrice')) filters.minPrice = params.get('minPrice');
  if (params.get('maxPrice')) filters.maxPrice = params.get('maxPrice');
  if (params.get('sort')) filters.sort = params.get('sort');
  return Object.keys(filters).length ? filters : null;
}

function summarizeCart(cartItems = []) {
  if (!Array.isArray(cartItems))
    return { totalItems: 0, totalPrice: 0, items: [] };
  const totalItems = cartItems.reduce(
    (sum, item) => sum + (item.quantity || 1),
    0
  );
  const totalPrice = cartItems.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (item.quantity || 1),
    0
  );
  const items = cartItems.map((item) => ({
    name: item.name,
    price: Number(item.price) || 0,
    quantity: item.quantity || 1,
    size: item.size || null,
    color: item.color || null,
  }));
  return { totalItems, totalPrice, items };
}

function parseLocation() {
  const path = window.location.pathname;
  const search = window.location.search;
  const params = new URLSearchParams(search);
  const filters = extractFilters(params);

  // /product/{slug} — product detail page
  const productMatch = path.match(/^\/product\/([^/]+)/);
  if (productMatch) {
    return {
      path: path + search,
      type: 'product',
      slug: decodeURIComponent(productMatch[1]),
      color: params.get('color') || null,
      size: params.get('size') || null,
      filters,
    };
  }

  // /products — catalog page (filters live in query string)
  if (path.startsWith('/products')) {
    return {
      path: path + search,
      type: 'catalog',
      slug: null,
      color: params.get('color') || null,
      size: params.get('size') || null,
      filters,
    };
  }

  return {
    path: path + search,
    type: 'page',
    slug: null,
    color: null,
    size: null,
    filters,
  };
}

/** Build the current page snapshot, merging Redux selection, active product, and cart summary. */
export function buildPageInfo(selection = null, activeProduct = null) {
  const base = parseLocation();
  const state = store.getState();
  const cartItems = state?.cart?.items || [];
  const cartSummary = summarizeCart(cartItems);

  const productDetails =
    activeProduct ||
    (selection?.slug === base.slug ? selection.productDetails : null);

  const info = {
    ...base,
    color: selection?.color || base.color,
    size: selection?.size || base.size,
    filters: base.filters,
    productDetails: productDetails
      ? {
          name: productDetails.name || productDetails.title || base.slug,
          price: productDetails.price || 0,
          colors:
            productDetails.colors ||
            (productDetails.variants
              ? [
                  ...new Set(
                    productDetails.variants.map((v) => v.color).filter(Boolean)
                  ),
                ]
              : []),
          sizes:
            productDetails.sizes ||
            (productDetails.variants
              ? [
                  ...new Set(
                    productDetails.variants.map((v) => v.size).filter(Boolean)
                  ),
                ]
              : []),
          inStock:
            productDetails.inStock !== undefined
              ? productDetails.inStock
              : true,
        }
      : null,
    cartSummary,
    lastAction: `Navigated to ${base.type === 'product' ? `product page (${base.slug})` : base.type === 'catalog' ? 'catalog page' : base.path}`,
  };

  return info;
}

/** Send the snapshot if the socket exists and nothing identical was sent. */
export function emitPageUpdate(info) {
  const socket = getSocket();
  if (!socket) return;
  const snapshot = JSON.stringify(info);
  if (snapshot === lastEmitted) return;
  lastEmitted = snapshot;
  socket.emit('page:update', info);
}

/** Force a fresh report (used when a voice call starts). */
export function emitCurrentPage() {
  lastEmitted = null;
  const selection = store.getState()?.productView || null;
  emitPageUpdate(buildPageInfo(selection));
}
