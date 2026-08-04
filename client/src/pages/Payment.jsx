import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { CreditCard, LoaderCircle, ShieldCheck, XCircle } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { clearCart } from '../store/cartSlice'
import { ordersApi } from '../lib/api'
import { showToast } from '../lib/toast'

const appearance = {
  theme: 'stripe',
  variables: { colorPrimary: '#232321', borderRadius: '10px' },
}

function money(value, currency = 'USD') {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value || 0))
  } catch {
    return `$${Number(value || 0).toFixed(2)}`
  }
}

function PaymentForm({ order, onPaid }) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    if (!stripe || !elements || submitting) return

    setSubmitting(true)
    setError('')

    const { error: submitError } = await elements.submit()
    if (submitError) {
      const message = submitError.message || 'Please check your payment details.'
      setError(message)
      showToast(message, 'error', { title: 'Payment details need attention' })
      setSubmitting(false)
      return
    }

    const returnUrl = `${window.location.origin}/checkout/payment?order=${encodeURIComponent(order.id)}`
    const { error: paymentError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      // Redirect only when the selected method needs it (for example 3DS).
      redirect: 'if_required',
    })

    if (paymentError) {
      const message = paymentError.message || 'Payment could not be completed. Please try again.'
      setError(message)
      showToast(message, 'error', { title: 'Payment failed' })
      setSubmitting(false)
      return
    }

    if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
      onPaid()
      return
    }

    const message = 'Payment was not completed. You can safely try again.'
    setError(message)
    showToast(message, 'warning', { title: 'Payment incomplete' })
    setSubmitting(false)
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="w-full rounded-xl bg-[#232321] px-5 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-neutral-400"
      >
        {submitting ? 'Confirming payment…' : `Pay ${money(order.total, order.currency)}`}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-neutral-500">
        <ShieldCheck className="h-4 w-4" /> Payments are securely processed by Stripe.
      </p>
    </form>
  )
}

export default function Payment() {
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [searchParams] = useSearchParams()
  const { user, initialized } = useSelector((state) => state.auth)

  const stateOrder = location.state?.order
  const statePayment = location.state?.payment
  // Location state is lost on a full reload/3DS redirect. Keep the initial
  // values in a ref so the boot effect does not re-run after it sets state.
  const initialSession = useRef({ order: stateOrder, payment: statePayment })
  const orderId = stateOrder?.id || searchParams.get('order')
  const [order, setOrder] = useState(stateOrder || null)
  const [payment, setPayment] = useState(statePayment || null)
  const [loadError, setLoadError] = useState('')
  const [confirming, setConfirming] = useState(false)

  // A return from 3DS or a browser refresh has no React location state. The
  // server reuses the same Stripe PaymentIntent through its idempotency key.
  useEffect(() => {
    if (!initialized || !user) return
    if (!orderId) {
      setLoadError('No order was supplied for payment.')
      return
    }

    let active = true
    const session = initialSession.current
    Promise.all([
      session.order ? Promise.resolve({ data: session.order }) : ordersApi.getOne(orderId),
      session.payment?.clientSecret ? Promise.resolve({ data: session.payment }) : ordersApi.pay(orderId),
    ])
      .then(([orderResponse, paymentResponse]) => {
        if (!active) return
        setOrder(orderResponse.data)
        setPayment(paymentResponse.data)
      })
      .catch((err) => active && setLoadError(err.message || 'Unable to start secure payment.'))

    return () => { active = false }
  }, [initialized, user, orderId]) // deliberately load this payment session once

  const stripePromise = useMemo(
    () => payment?.publishableKey ? loadStripe(payment.publishableKey) : null,
    [payment?.publishableKey]
  )

  const waitForWebhook = useCallback(async () => {
    if (!order?.id || confirming) return
    setConfirming(true)
    setLoadError('')

    // The browser never marks an order paid. It waits for the signed Stripe
    // webhook to make the durable inventory/payment update on the backend.
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        const response = await ordersApi.paymentStatus(order.id)
        if (response.data?.paymentStatus === 'paid') {
          dispatch(clearCart())
          showToast(`Payment confirmed for order ${order.orderNumber || order.id}.`, 'order', {
            title: 'Payment successful',
          })
          navigate('/orders', {
            replace: true,
            state: { justPlaced: { ...order, ...response.data, paymentStatus: 'paid' } },
          })
          return
        }
        if (response.data?.paymentStatus === 'failed') {
          setLoadError('Stripe reported that this payment failed. Please try again.')
          setConfirming(false)
          return
        }
      } catch (err) {
        setLoadError(err.message || 'Unable to confirm the payment status.')
        setConfirming(false)
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    setLoadError('Your payment is still being confirmed. Do not pay again; check My Orders in a moment.')
    setConfirming(false)
  }, [confirming, dispatch, navigate, order])

  // On return from a redirect-based payment method, Stripe adds
  // payment_intent to the URL. Start safe webhook confirmation automatically.
  const returnedPaymentIntent = searchParams.get('payment_intent')
  useEffect(() => {
    if (returnedPaymentIntent && order?.id) waitForWebhook()
  }, [order?.id, returnedPaymentIntent, waitForWebhook])

  if (initialized && !user) {
    return (
      <section className="mx-auto max-w-lg px-5 py-20 text-center">
        <XCircle className="mx-auto h-12 w-12 text-red-500" />
        <h1 className="mt-4 text-2xl font-black">SIGN IN REQUIRED</h1>
        <p className="mt-2 text-neutral-600">Please sign in to securely complete this payment.</p>
        <button onClick={() => navigate('/login', { state: { redirect: location.pathname + location.search } })} className="mt-6 rounded-full bg-[#232321] px-6 py-3 font-bold text-white">Sign in</button>
      </section>
    )
  }

  if (loadError && !confirming) {
    return (
      <section className="mx-auto max-w-lg px-5 py-20 text-center">
        <XCircle className="mx-auto h-12 w-12 text-red-500" />
        <h1 className="mt-4 text-2xl font-black">PAYMENT UNAVAILABLE</h1>
        <p role="alert" className="mt-3 text-neutral-600">{loadError}</p>
        <button onClick={() => navigate('/cart')} className="mt-6 rounded-full bg-[#232321] px-6 py-3 font-bold text-white">Return to cart</button>
      </section>
    )
  }

  if (confirming) {
    return (
      <section className="mx-auto max-w-lg px-5 py-20 text-center">
        <LoaderCircle className="mx-auto h-12 w-12 animate-spin text-[#4A69E2]" />
        <h1 className="mt-4 text-2xl font-black">CONFIRMING PAYMENT</h1>
        <p className="mt-3 text-neutral-600">Your payment was received. We are securely confirming your order—please do not refresh or pay again.</p>
      </section>
    )
  }

  if (!order || !payment?.clientSecret || !stripePromise) {
    return (
      <section className="mx-auto max-w-lg px-5 py-20 text-center">
        <LoaderCircle className="mx-auto h-12 w-12 animate-spin text-[#4A69E2]" />
        <p className="mt-4 text-neutral-600">Preparing secure checkout…</p>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-7 flex items-start gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#EAE9E5]"><CreditCard className="h-6 w-6" /></span>
          <div>
            <p className="text-xs font-black tracking-[.16em] text-[#4A69E2]">SECURE CHECKOUT</p>
            <h1 className="mt-1 text-2xl font-black uppercase">Complete payment</h1>
            <p className="mt-1 text-sm text-neutral-600">Order {order.orderNumber || order.id} · {money(order.total, order.currency)}</p>
          </div>
        </div>
        <Elements stripe={stripePromise} options={{ clientSecret: payment.clientSecret, appearance }}>
          <PaymentForm order={order} onPaid={waitForWebhook} />
        </Elements>
      </div>
    </section>
  )
}
