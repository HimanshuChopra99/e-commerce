import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  selectCartItems,
  selectCartTotal,
  updateQuantity,
  removeFromCart,
  clearCart,
} from '../../store/cartSlice'
import { placeOrder } from '../../store/ordersSlice'
import { ordersApi } from '../../lib/api'

export default function ShoppingCart() {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const cartItems = useSelector(selectCartItems)
  const subtotal = useSelector(selectCartTotal)
  const { user } = useSelector((state) => state.auth)

  const [quote, setQuote] = useState(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState(null)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [shippingAddress, setShippingAddress] = useState({
    name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
    phone: user?.phone || '',
    line1: user?.address?.line1 || '',
    line2: user?.address?.line2 || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    postalCode: user?.address?.postalCode || '',
    country: user?.address?.country || 'USA',
  })

  useEffect(() => {
    if (cartItems.length === 0) {
      setQuote(null)
      return
    }
    setQuoteLoading(true)
    ordersApi
      .quote({ items: cartItems.map((i) => ({ variantId: i.variantId, quantity: i.quantity })) })
      .then((res) => {
        setQuote(res.data)
        const unavailable = (res.data?.lines || []).filter((l) => !l.available)
        if (unavailable.length > 0) {
          unavailable.forEach((l) => dispatch(removeFromCart(l.variantId)))
          window.dispatchEvent(
            new CustomEvent('kick:toast', {
              detail: `${unavailable.length} item(s) removed — no longer available.`,
            })
          )
        }
      })
      .catch(() => setQuote(null))
      .finally(() => setQuoteLoading(false))
  }, [cartItems, dispatch])

  const totalItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0)

  const handleAddressChange = (field, value) => {
    setShippingAddress((prev) => ({ ...prev, [field]: value }))
  }

  const isAddressValid = () => {
    return (
      Boolean(shippingAddress.name.trim()) &&
      Boolean(shippingAddress.line1.trim()) &&
      Boolean(shippingAddress.city.trim()) &&
      Boolean(shippingAddress.state.trim()) &&
      Boolean(shippingAddress.postalCode.trim()) &&
      Boolean(shippingAddress.country.trim())
    )
  }

  const handleCheckout = async () => {
    if (cartItems.length === 0) return

    if (!user) {
      navigate('/login?redirect=/cart')
      return
    }

    if (!showAddressForm && !isAddressValid()) {
      setShowAddressForm(true)
      return
    }

    if (!isAddressValid()) {
      setCheckoutError('Please fill in all required shipping address fields.')
      return
    }

    setCheckoutLoading(true)
    setCheckoutError(null)

    try {
      const orderData = {
        items: cartItems.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
        shippingAddress: {
          name: shippingAddress.name,
          phone: shippingAddress.phone || undefined,
          line1: shippingAddress.line1,
          line2: shippingAddress.line2 || undefined,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postalCode: shippingAddress.postalCode,
          country: shippingAddress.country,
        },
        paymentMethod,
      }

      const result = await dispatch(placeOrder(orderData)).unwrap()
      dispatch(clearCart())
      navigate('/orders', { state: { justPlaced: result.order || result } })
    } catch (err) {
      setCheckoutError(err.message || err || 'Failed to place order')
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handleQuickCheckout = async () => {
    if (!user) {
      navigate('/login?redirect=/cart')
      return
    }

    const savedAddress = user.address
      ? {
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          phone: user.phone || undefined,
          line1: user.address.line1 || '',
          line2: user.address.line2 || undefined,
          city: user.address.city || '',
          state: user.address.state || '',
          postalCode: user.address.postalCode || '',
          country: user.address.country || '',
        }
      : null

    const isValid =
      savedAddress &&
      savedAddress.name.trim() &&
      savedAddress.line1.trim() &&
      savedAddress.city.trim() &&
      savedAddress.state.trim() &&
      savedAddress.postalCode.trim() &&
      savedAddress.country.trim()

    if (!isValid) {
      setShowAddressForm(true)
      return
    }

    setCheckoutLoading(true)
    setCheckoutError(null)

    try {
      const orderData = {
        items: cartItems.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
        shippingAddress: savedAddress,
        paymentMethod,
      }

      const result = await dispatch(placeOrder(orderData)).unwrap()
      dispatch(clearCart())
      navigate('/orders', { state: { justPlaced: result.order || result } })
    } catch (err) {
      setCheckoutError(err.message || err || 'Failed to place order')
    } finally {
      setCheckoutLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#ECEAE5] text-[#111111] font-sans p-4 sm:p-8 md:p-12 lg:p-16 flex justify-center items-start">
      <div className="w-full max-w-6xl">
        <div className="mb-8 max-w-2xl">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">
            Saving to celebrate
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            Enjoy up to 60% off thousands of styles during the End of Year sale - while supplies last. No code needed.{' '}
            {!user && (
              <>
                <a href="/login" className="underline font-medium hover:text-black">Sign-in</a> or{' '}
                <a href="/signup" className="underline font-medium hover:text-black">Create Account</a>
              </>
            )}
          </p>
        </div>

        {checkoutError && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-xl text-sm font-semibold">
            {checkoutError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Cart Items */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-2xl font-bold mb-1">Your Bag</h2>
            <p className="text-xs text-gray-500 mb-6">
              Items in your bag not reserved - check out now to make them yours.
            </p>

            <div className="max-h-[460px] overflow-y-auto pr-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              {cartItems.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500 mb-4">Your bag is empty.</p>
                  <button
                    onClick={() => navigate('/products')}
                    className="bg-black text-white px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition"
                  >
                    Shop Collection
                  </button>
                </div>
              ) : (
                cartItems.map((item, index) => (
                  <div key={item.variantId || index}>
                    {index > 0 && <div className="border-t border-gray-100 my-6" />}
                    <div className="flex gap-4 sm:gap-6">
                      <div className="w-28 h-28 sm:w-36 sm:h-36 bg-[#F2F1ED] rounded-2xl flex-shrink-0 p-2 flex items-center justify-center overflow-hidden">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="font-bold text-sm sm:text-base tracking-wide uppercase">
                              {item.name}
                            </h3>
                            <span className="font-bold text-blue-600 text-sm sm:text-base whitespace-nowrap">
                              ${(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>

                          <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            Color: {item.color}
                          </p>

                          <div className="flex items-center gap-6 mt-3 text-xs sm:text-sm">
                            <div className="flex items-center gap-1">
                              <span className="text-gray-700 font-semibold">Size:</span>
                              <span className="font-bold">{item.size}</span>
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="text-gray-700 font-semibold">Quantity</span>
                              <select
                                value={item.quantity}
                                onChange={(e) => {
                                  const requested = Number(e.target.value)
                                  if (requested > 10) {
                                    window.dispatchEvent(
                                      new CustomEvent('kick:toast', { detail: 'Maximum 10 per item.' })
                                    )
                                  }
                                  dispatch(
                                    updateQuantity({
                                      variantId: item.variantId,
                                      quantity: Math.min(requested, 10),
                                    })
                                  )
                                }}
                                className="bg-transparent font-medium cursor-pointer border-none focus:ring-0 p-0 pr-4 text-gray-800"
                              >
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((q) => (
                                  <option key={q} value={q}>
                                    {q}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-4 pt-1">
                          <button
                            onClick={() => dispatch(removeFromCart(item.variantId))}
                            className="text-red-500 hover:text-red-700 text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-5 pt-2">
            <h2 className="text-2xl font-bold mb-6">Order Summary</h2>

            {quoteLoading ? (
              <div className="p-6 text-center text-sm text-gray-500 font-medium">Calculating totals...</div>
            ) : (
              <div className="space-y-3 text-sm sm:text-base">
                <div className="flex justify-between text-gray-800">
                  <span className="uppercase font-medium text-xs tracking-wider">
                    {totalItemCount} {totalItemCount === 1 ? 'ITEM' : 'ITEMS'} (SUBTOTAL)
                  </span>
                  <span className="font-medium">
                    ${Number(quote?.subtotal ?? subtotal).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-gray-800">
                  <span>Delivery</span>
                  <span className="font-medium">
                    {quote ? (
                      quote.shipping === 0 ? (
                        <span className="text-green-600 font-bold">FREE</span>
                      ) : (
                        `$${Number(quote.shipping).toFixed(2)}`
                      )
                    ) : (
                      '$0.00'
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-gray-800">
                  <span>Tax (8%)</span>
                  <span className="font-medium">
                    ${Number(quote?.tax ?? 0).toFixed(2)}
                  </span>
                </div>

                {quote && quote.shipping > 0 && (
                  <div className="text-xs text-amber-600 font-medium">
                    Free shipping on orders over $150
                  </div>
                )}

                <div className="flex justify-between text-base sm:text-lg font-bold pt-2 text-black border-t">
                  <span>Total</span>
                  <span>${Number(quote?.total ?? subtotal).toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="mt-6 p-4 bg-gray-50 rounded-xl space-y-2">
              <h3 className="font-bold text-sm">Payment Method</h3>
              {[
                { value: 'card', label: '💳 Credit / Debit Card (Stripe)' },
                { value: 'cod', label: '💵 Cash on Delivery' },
              ].map((method) => (
                <label key={method.value} className="flex items-center gap-3 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.value}
                    checked={paymentMethod === method.value}
                    onChange={() => setPaymentMethod(method.value)}
                    className="accent-black"
                  />
                  {method.label}
                </label>
              ))}
            </div>

            {/* Shipping Address Form */}
            {showAddressForm && cartItems.length > 0 && (
              <div className="mt-6 p-4 bg-gray-50 rounded-xl space-y-3">
                <h3 className="font-bold text-sm">Shipping Address</h3>
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={shippingAddress.name}
                  onChange={(e) => handleAddressChange('name', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                />
                <input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={shippingAddress.phone}
                  onChange={(e) => handleAddressChange('phone', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                />
                <input
                  type="text"
                  placeholder="Address Line 1 *"
                  value={shippingAddress.line1}
                  onChange={(e) => handleAddressChange('line1', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                />
                <input
                  type="text"
                  placeholder="Address Line 2"
                  value={shippingAddress.line2}
                  onChange={(e) => handleAddressChange('line2', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="City *"
                    value={shippingAddress.city}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                  />
                  <input
                    type="text"
                    placeholder="State *"
                    value={shippingAddress.state}
                    onChange={(e) => handleAddressChange('state', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Postal Code *"
                    value={shippingAddress.postalCode}
                    onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                  />
                  <input
                    type="text"
                    placeholder="Country *"
                    value={shippingAddress.country}
                    onChange={(e) => handleAddressChange('country', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={checkoutLoading || quoteLoading || cartItems.length === 0}
              className="w-full bg-[#1E1E1E] hover:bg-black disabled:bg-gray-400 text-white font-bold py-3.5 px-4 rounded-xl mt-4 uppercase tracking-wider text-xs sm:text-sm transition-all duration-200 active:scale-[0.99]"
            >
              {checkoutLoading
                ? 'Processing Order...'
                : showAddressForm
                ? 'Place Order'
                : 'Proceed to Checkout'}
            </button>

            {showAddressForm && (
              <button
                onClick={() => setShowAddressForm(false)}
                className="w-full border border-gray-300 hover:border-gray-500 text-gray-700 font-medium py-2.5 px-4 rounded-xl mt-2 text-xs transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
