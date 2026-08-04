import { asyncHandler } from '../utils/async-handler.js'
import { ok } from '../utils/api-response.js'
import * as cartService from '../services/cart.service.js'
import * as favouriteService from '../services/favourite.service.js'

export const getCart = asyncHandler(async (req, res) => {
  ok(res, { items: await cartService.get(req.user.id) })
})

export const addCartItem = asyncHandler(async (req, res) => {
  ok(res, { items: await cartService.addItem(req.user.id, req.body) })
})

export const setCartItem = asyncHandler(async (req, res) => {
  ok(res, { items: await cartService.setItem(req.user.id, req.body) })
})

export const syncCart = asyncHandler(async (req, res) => {
  ok(res, { items: await cartService.sync(req.user.id, req.body.items) })
})

export const removeCartItem = asyncHandler(async (req, res) => {
  ok(res, { items: await cartService.removeItem(req.user.id, req.params.variantId) })
})

export const clearCart = asyncHandler(async (req, res) => {
  ok(res, { items: await cartService.clear(req.user.id) })
})

export const getFavourites = asyncHandler(async (req, res) => {
  ok(res, { products: await favouriteService.get(req.user.id) })
})

export const addFavourite = asyncHandler(async (req, res) => {
  ok(res, { products: await favouriteService.add(req.user.id, req.params.productId) })
})

export const removeFavourite = asyncHandler(async (req, res) => {
  ok(res, { products: await favouriteService.remove(req.user.id, req.params.productId) })
})

export const syncFavourites = asyncHandler(async (req, res) => {
  ok(res, { products: await favouriteService.sync(req.user.id, req.body.productIds) })
})
