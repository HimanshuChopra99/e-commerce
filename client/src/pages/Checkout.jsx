import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { useDispatch } from 'react-redux'
import { clearCart } from '../store/cartSlice'
import { ordersApi } from '../lib/api'

// Load Stripe outside of render to avoid re-creating on every render.
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

// ─── Inner form (must be inside <Elements>) ───────────────────────────────────

function CheckoutForm({ order, orderId }) {
  const stripe = useStripe()
  const elements = useElements()
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setMessage(null)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required', // Stay on the same page if possible
    })

    if (error) {
      setMessage(error.message || 'Payment failed. Please try again.')
      setLoading(false)
      return
    }

    if (paymentIntent?.status === 'succeeded') {
      dispatch(clearCart())
      navigate('/orders', {
        state: { justPlaced: order, paid: true },
        replace: true,
      })
      return
    }

    // For other statuses (requires_action etc) — poll for a moment
    let attempts = 0
    const poll = setInterval(async () => {
      attempts++
      try {
        const res = await ordersApi.paymentStatus(orderId)
        if (res.data?.paymentStatus === 'paid') {
          clearInterval(poll)
          dispatch(clearCart())
          navigate('/orders', {
            state: { justPlaced: order, paid: true },
            replace: true,
          })
        }
      } catch {
        // ignore poll errors
      }
      if (attempts >= 8) {
        clearInterval(poll)
        setMessage('Payment processing. Check your orders page in a moment.')
        setLoading(false)
      }
    }, 1500)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Order summary header */}
      <div className="bg-gray-50 rounded-2xl p-5 space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Order</span>
          <span className="font-mono font-bold text-black">#{order?.orderNumber || orderId}</span>
        </div>
        <div className="flex justify-between font-black text-lg text-black border-t pt-2 mt-2">
          <span>Total</span>
          <span>${Number(order?.grandTotal || order?.total || 0).toFixed(2)}</span>
        </div>
      </div>

      {/* Stripe Payment Element — renders card, Apple Pay, etc. */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {message && (
        <div className={`text-sm font-medium px-4 py-3 rounded-xl ${
          message.includes('processing')
            ? 'bg-blue-50 text-blue-700'
            : 'bg-red-50 text-red-700'
        }`}>
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || loading}
        className="w-full bg-[#1E1E1E] hover:bg-black disabled:bg-gray-400 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-sm transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-3"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Processing...
          </>
        ) : (
          <>
            🔒 Pay ${Number(order?.grandTotal || order?.total || 0).toFixed(2)}
          </>
        )}
      </button>

      <p className="text-center text-xs text-gray-400">
        Secured by{' '}
        <span className="font-bold text-gray-600">Stripe</span>
        {' '}— your card details are never stored on our servers.
      </p>
    </form>
  )
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const location = useLocation()
  const navigate = useNavigate()

  // Data passed from the cart page after order creation
  const { clientSecret, order, orderId } = location.state || {}

  useEffect(() => {
    // If someone navigates directly here without going through cart, bounce them.
    if (!clientSecret || !orderId) {
      navigate('/cart', { replace: true })
    }
  }, [clientSecret, orderId, navigate])

  if (!clientSecret || !orderId) return null

  const appearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#1E1E1E',
      colorBackground: '#ffffff',
      colorText: '#1E1E1E',
      colorDanger: '#ef4444',
      fontFamily: 'Rubik, system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '12px',
    },
  }

  return (
    <div
      className="min-h-screen bg-[#EAE9E5] flex items-start justify-center px-4 py-12"
      style={{ fontFamily: "'Rubik', sans-serif" }}
    >
      <div className="w-full max-w-md">
        {/* Back link */}
        <button
          onClick={() => navigate('/cart')}
          className="mb-6 flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-black transition-colors"
        >
          ← Back to cart
        </button>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <h1 className="text-2xl font-black uppercase tracking-tight mb-2">
            Complete Payment
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            Review your total and enter your payment details below.
          </p>

          <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
            <CheckoutForm order={order} orderId={orderId} />
          </Elements>
        </div>

        {/* Trust badges */}
        <div className="flex justify-center items-center gap-6 mt-6 text-xs text-gray-400">
          <span>🔒 SSL Encrypted</span>
          <span>✓ PCI Compliant</span>
          <span>🛡 Fraud Protected</span>
        </div>
      </div>
    </div>
  )
}
