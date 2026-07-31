import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  selectCartItems,
  selectCartTotal,
  updateQuantity,
  removeFromCart,
  clearCart,
} from '../../store/cartSlice';
import { placeOrder } from '../../store/ordersSlice';

export default function ShoppingCart() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const cartItems = useSelector(selectCartItems);
  const subtotal = useSelector(selectCartTotal);
  const { user } = useSelector((state) => state.auth);

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  const delivery = cartItems.length > 0 ? 6.99 : 0.0;
  const total = subtotal + delivery;
  const totalItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    if (!user) {
      navigate('/login?redirect=/cart');
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const orderData = {
        items: cartItems.map((item) => ({
          productId: item.productId,
          productPublicId: item.productId,
          productName: item.name,
          productSlug: item.slug || 'product',
          productImage: item.image,
          color: item.color || 'Default',
          size: item.size || 'M',
          unitPrice: item.price,
          quantity: item.quantity,
        })),
        shippingAddress: {
          line1: '123 Fashion Blvd',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
        },
      };

      const result = await dispatch(placeOrder(orderData)).unwrap();
      dispatch(clearCart());
      navigate('/orders');
    } catch (err) {
      setCheckoutError(err.message || err || 'Failed to place order');
    } finally {
      setCheckoutLoading(false);
    }
  };

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
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-2xl font-bold mb-1">Your Bag</h2>
            <p className="text-xs text-gray-500 mb-6">
              Items in your bag not reserved- check out now to make them yours.
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
                          className="w-full h-full object-contain mix-blend-multiply"
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
                                onChange={(e) =>
                                  dispatch(
                                    updateQuantity({
                                      variantId: item.variantId,
                                      quantity: Number(e.target.value),
                                    })
                                  )
                                }
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

          <div className="lg:col-span-5 pt-2">
            <h2 className="text-2xl font-bold mb-6">Order Summary</h2>

            <div className="space-y-3 text-sm sm:text-base">
              <div className="flex justify-between text-gray-800">
                <span className="uppercase font-medium text-xs tracking-wider">
                  {totalItemCount} {totalItemCount === 1 ? 'ITEM' : 'ITEMS'}
                </span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-gray-800">
                <span>Delivery</span>
                <span className="font-medium">
                  {subtotal > 0 ? `$${delivery.toFixed(2)}` : '$0.00'}
                </span>
              </div>

              <div className="flex justify-between text-base sm:text-lg font-bold pt-2 text-black border-t">
                <span>Total</span>
                <span>${subtotal > 0 ? total.toFixed(2) : '0.00'}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={checkoutLoading || cartItems.length === 0}
              className="w-full bg-[#1E1E1E] hover:bg-black disabled:bg-gray-400 text-white font-bold py-3.5 px-4 rounded-xl mt-6 uppercase tracking-wider text-xs sm:text-sm transition-all duration-200 active:scale-[0.99]"
            >
              {checkoutLoading ? 'Processing Order...' : 'Checkout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
