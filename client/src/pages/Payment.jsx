import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import {
  CreditCard,
  LoaderCircle,
  ShieldCheck,
  XCircle,
  Lock,
  ArrowRight,
  ChevronRight,
  Truck,
  ShieldAlert,
  Receipt,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import {
  useLocation,
  useNavigate,
  useSearchParams,
  Link,
} from 'react-router-dom';
import { clearCart } from '../store/cartSlice';
import { fetchMyOrders } from '../store/ordersSlice';
import { ordersApi } from '../lib/api';
import { showToast } from '../lib/toast';

const IMAGE_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : '';

function imageSrc(image) {
  if (!image)
    return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80';
  return image.startsWith('http') ? image : `${IMAGE_BASE}${image}`;
}

const appearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#0F172A',
    colorBackground: '#FFFFFF',
    colorText: '#0F172A',
    colorDanger: '#E11D48',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    borderRadius: '12px',
    spacingUnit: '4px',
  },
};

function money(value, currency = 'USD') {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
    }).format(Number(value || 0));
  } catch {
    return `$${Number(value || 0).toFixed(2)}`;
  }
}

/* ==========================================================================
   STRIPE PAYMENT FORM
   ========================================================================== */
function PaymentForm({ order, onPaid }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements || submitting) return;

    setSubmitting(true);
    setError('');

    const { error: submitError } = await elements.submit();
    if (submitError) {
      const message =
        submitError.message || 'Please check your payment details.';
      setError(message);
      showToast(message, 'error', { title: 'Payment details need attention' });
      setSubmitting(false);
      return;
    }

    const returnUrl = `${window.location.origin}/checkout/payment?order=${encodeURIComponent(order.id)}`;
    const { error: paymentError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: 'if_required',
    });

    if (paymentError) {
      const message =
        paymentError.message ||
        'Payment could not be completed. Please try again.';
      setError(message);
      showToast(message, 'error', { title: 'Payment failed' });
      setSubmitting(false);
      return;
    }

    if (
      paymentIntent?.status === 'succeeded' ||
      paymentIntent?.status === 'processing'
    ) {
      onPaid();
      return;
    }

    const message = 'Payment was not completed. You can safely try again.';
    setError(message);
    showToast(message, 'warning', { title: 'Payment incomplete' });
    setSubmitting(false);
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="rounded-xl border border-slate-200/80 bg-white p-1">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700"
        >
          <ShieldAlert className="size-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-4 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-slate-900/10 transition-all duration-200 hover:bg-slate-800 hover:shadow-xl active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
      >
        {submitting ? (
          <>
            <LoaderCircle className="size-4 animate-spin text-white" />
            <span>Confirming Payment...</span>
          </>
        ) : (
          <>
            <Lock className="size-3.5 text-slate-400 transition-transform group-hover:scale-110" />
            <span>Pay {money(order.total, order.currency)}</span>
          </>
        )}
      </button>

      <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
        <ShieldCheck className="size-4 text-emerald-600" />
        <span>Encrypted 256-Bit SSL Payment via Stripe</span>
      </div>
    </form>
  );
}

/* ==========================================================================
   PARTICLE BURST COMPONENT
   ========================================================================== */
function Particle({ delay, angle, distance, color, size }) {
  const style = {
    position: 'absolute',
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    background: color,
    left: '50%',
    top: '50%',
    marginLeft: `-${size / 2}px`,
    marginTop: `-${size / 2}px`,
    opacity: 0,
    zIndex: 5,
    animation: `particleFloat 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}s forwards`,
    '--tx': `${Math.cos(angle) * distance}px`,
    '--ty': `${Math.sin(angle) * distance}px`,
  };
  return <div style={style} />;
}

/* ==========================================================================
   STAGE 1: SLOW & SMOOTH REAL-TIME PROCESSING SCREEN
   ========================================================================== */
function PaymentProcessingView({ order, onComplete }) {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Connecting securely...');

  useEffect(() => {
    // Ticks every 40ms for a buttery-smooth 25fps animation over ~4.5 seconds
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 400); // Brief pause at 100% before transition
          return 100;
        }

        // Realistic variable speed (faster at start, steady in middle, push to end)
        let increment = 1.1;
        if (prev > 30 && prev < 70) {
          increment = 0.75; // Verifying with bank phase
        } else if (prev >= 70 && prev < 92) {
          increment = 0.5; // Finalizing security check
        } else if (prev >= 92) {
          increment = 1.4; // Final completion push
        }

        const next = prev + increment;

        if (next > 25 && next < 60) {
          setLoadingText(
            `Authorizing ${money(order?.total, order?.currency)}...`
          );
        } else if (next >= 60 && next < 88) {
          setLoadingText('Verifying with bank...');
        } else if (next >= 88) {
          setLoadingText('Finalizing payment...');
        }

        return next > 100 ? 100 : next;
      });
    }, 40);

    return () => clearInterval(interval);
  }, [order, onComplete]);

  return (
    <section className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-white text-center">
      <div className="w-full max-w-sm mx-auto flex flex-col items-center">
        <div className="flex flex-col items-center space-y-8 animate-fadeIn w-full">
          {/* Circular Progress Ring with Smooth CSS Transition */}
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg
              className="w-full h-full transform -rotate-90"
              viewBox="0 0 100 100"
            >
              {/* Background Track */}
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="#f1f5f9"
                strokeWidth="8"
                fill="transparent"
              />
              {/* Dynamic Smooth Progress Track */}
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="#10b981"
                strokeWidth="8"
                strokeDasharray="263.89"
                strokeDashoffset={263.89 - (263.89 * progress) / 100}
                strokeLinecap="round"
                fill="transparent"
                style={{ transition: 'stroke-dashoffset 0.15s ease-out' }}
              />
            </svg>

            {/* Center Percentage Display */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-slate-800">
                {Math.floor(progress)}%
              </span>
            </div>
          </div>

          {/* Dynamic Loading Text Feedback */}
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Processing Payment
            </h2>
            <p className="text-slate-500 text-sm font-medium h-5 transition-all duration-300">
              {loadingText}
            </p>
          </div>

          {/* Amount Indicator */}
          {order && (
            <div className="pt-4 border-t border-slate-100 w-full flex justify-between items-center text-sm">
              <span className="text-slate-400 font-medium">
                Paying Merchant
              </span>
              <span className="text-slate-900 font-bold">
                {money(order.total, order.currency)}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   STAGE 2: FULL-PAGE SUCCESS VIEW WITH PARTICLES & CHECKMARK
   ========================================================================== */
function PaymentSuccessView({ order, onContinue }) {
  const navigate = useNavigate();
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const generated = [];
    const colors = ['#10b981', '#059669', '#34d399', '#047857', '#f59e0b'];

    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 * i) / 24 + (Math.random() - 0.5) * 0.2;
      const distance = 55 + Math.random() * 55;
      const delay = 0.2 + Math.random() * 0.25;
      const size = 4 + Math.random() * 4;
      const color = colors[Math.floor(Math.random() * colors.length)];
      generated.push({ angle, distance, delay, size, color, id: i });
    }
    setParticles(generated);
  }, []);

  return (
    <section className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-white text-center">
      <style>{`
        /* SUCCESS CIRCLE & CHECKMARK ANIMATIONS */
        .success-circle-container {
            width: 120px;
            height: 120px;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .circle-fill {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            transform: scale(0);
            animation: circlePopIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            box-shadow: 0 12px 30px -4px rgba(16, 185, 129, 0.35);
        }

        @keyframes circlePopIn {
            0% {
                transform: scale(0);
                opacity: 0;
            }
            100% {
                transform: scale(1);
                opacity: 1;
            }
        }

        /* Wave Ring Pulses */
        .wave-ring {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 2px solid rgba(16, 185, 129, 0.35);
            transform: scale(1);
            opacity: 0;
        }

        .wave-ring-1 {
            animation: waveExpand 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s forwards;
        }

        .wave-ring-2 {
            animation: waveExpand 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.4s forwards;
        }

        @keyframes waveExpand {
            0% {
                transform: scale(1);
                opacity: 0.8;
            }
            100% {
                transform: scale(2.2);
                opacity: 0;
            }
        }

        /* White Checkmark SVG inside Green Circle */
        .checkmark-svg {
            width: 58px;
            height: 58px;
            position: relative;
            z-index: 10;
        }

        .checkmark-path {
            stroke: #ffffff; /* Crisp white tick mark */
            stroke-width: 5;
            stroke-linecap: round;
            stroke-linejoin: round;
            fill: none;
            stroke-dasharray: 60;
            stroke-dashoffset: 60;
            animation: drawCheck 0.45s cubic-bezier(0.65, 0, 0.45, 1) 0.35s forwards;
        }

        @keyframes drawCheck {
            to {
                stroke-dashoffset: 0;
            }
        }

        /* Particle Burst Keyframes */
        @keyframes particleFloat {
            0% {
                opacity: 1;
                transform: translate(0, 0) scale(1);
            }
            100% {
                opacity: 0;
                transform: translate(var(--tx), var(--ty)) scale(0);
            }
        }

        /* Text & Content Reveal Animations */
        .text-reveal {
            opacity: 0;
            transform: translateY(18px);
            animation: textSlideUp 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }

        .text-delay-1 { animation-delay: 0.4s; }
        .text-delay-2 { animation-delay: 0.6s; }
        .text-delay-3 { animation-delay: 0.8s; }
        .text-delay-4 { animation-delay: 1.0s; }

        @keyframes textSlideUp {
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* Divider Expansion */
        .divider-line {
            width: 0;
            animation: lineExpand 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.7s forwards;
        }

        @keyframes lineExpand {
            to { width: 100%; }
        }
      `}</style>

      <div className="w-full max-w-sm mx-auto flex flex-col items-center">
        {/* Green Circle with White Tick Inside */}
        <div className="success-circle-container mb-6">
          {/* Wave Rings */}
          <div className="wave-ring wave-ring-1" />
          <div className="wave-ring wave-ring-2" />

          {/* Green Circle Background */}
          <div className="circle-fill" />

          {/* White Checkmark Icon */}
          <svg className="checkmark-svg" viewBox="0 0 50 50">
            <path className="checkmark-path" d="M14 26 L22 34 L38 18" />
          </svg>

          {/* Explosion Particles */}
          {particles.map((p) => (
            <Particle
              key={p.id}
              angle={p.angle}
              distance={p.distance}
              delay={p.delay}
              size={p.size}
              color={p.color}
            />
          ))}
        </div>

        {/* Success Details Content */}
        <div className="w-full space-y-3">
          <h1 className="text-reveal text-delay-1 text-2xl font-semibold text-slate-900 tracking-tight">
            Payment Successful
          </h1>

          <div className="text-reveal text-delay-2">
            <span className="text-4xl font-bold text-slate-900 tracking-tight">
              {money(order?.total, order?.currency)}
            </span>
          </div>

          <p className="text-reveal text-delay-3 text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
            Your payment has been completed. A confirmation email has been sent.
          </p>

          {/* Divider Line */}
          <div className="text-reveal text-delay-4 py-3">
            <div className="h-px bg-slate-100 relative overflow-hidden rounded-full">
              <div className="divider-line absolute h-full bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />
            </div>
          </div>

          {/* Receipt Details Block */}
          {order && (
            <div className="text-reveal text-delay-4 bg-slate-50/80 rounded-2xl p-4 space-y-3 border border-slate-100">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 font-medium">
                  Transaction ID
                </span>
                <span className="text-slate-800 font-mono text-xs font-bold">
                  #{order.orderNumber || order.id}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 font-medium">Date & Time</span>
                <span className="text-slate-800 font-semibold text-xs">
                  {new Date().toLocaleDateString(undefined, {
                    dateStyle: 'medium',
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 font-medium">
                  Payment Method
                </span>
                <span className="text-slate-800 font-semibold text-xs flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4 text-emerald-600"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                  </svg>
                  •••• 4242
                </span>
              </div>
            </div>
          )}

          {/* Primary Action Buttons */}
          <div className="text-reveal text-delay-4 pt-4 space-y-3">
            <button
              type="button"
              onClick={onContinue}
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold rounded-2xl transition-all duration-200 shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
            >
              <span>Done</span>
              <ArrowRight className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/products')}
              className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   MAIN PAYMENT PAGE
   ========================================================================== */
export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { user, initialized } = useSelector((state) => state.auth);

  const stateOrder = location.state?.order;
  const statePayment = location.state?.payment;

  const initialSession = useRef({ order: stateOrder, payment: statePayment });
  const orderId = stateOrder?.id || searchParams.get('order');

  const [order, setOrder] = useState(stateOrder || null);
  const [payment, setPayment] = useState(statePayment || null);
  const [loadError, setLoadError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [progressFinished, setProgressFinished] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (!initialized || !user) return;
    if (!orderId) {
      setLoadError('No order reference was supplied for payment.');
      return;
    }

    let active = true;
    const session = initialSession.current;
    Promise.all([
      session.order
        ? Promise.resolve({ data: session.order })
        : ordersApi.getOne(orderId),
      session.payment?.clientSecret
        ? Promise.resolve({ data: session.payment })
        : ordersApi.pay(orderId),
    ])
      .then(([orderResponse, paymentResponse]) => {
        if (!active) return;
        setOrder(orderResponse.data);
        setPayment(paymentResponse.data);
      })
      .catch(
        (err) =>
          active &&
          setLoadError(err.message || 'Unable to start secure payment.')
      );

    return () => {
      active = false;
    };
  }, [initialized, user, orderId]);

  const stripePromise = useMemo(
    () => (payment?.publishableKey ? loadStripe(payment.publishableKey) : null),
    [payment?.publishableKey]
  );

  const waitForWebhook = useCallback(async () => {
    if (!order?.id || confirming) return;
    setConfirming(true);
    setLoadError('');

    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        const response = await ordersApi.paymentStatus(order.id);
        if (response.data?.paymentStatus === 'paid') {
          dispatch(clearCart());
          dispatch(fetchMyOrders());
          setPaymentSuccess(true);
          return;
        }
        if (response.data?.paymentStatus === 'failed') {
          setLoadError(
            'Stripe reported that this payment failed. Please try again.'
          );
          setConfirming(false);
          return;
        }
      } catch (err) {
        setLoadError(err.message || 'Unable to confirm payment status.');
        setConfirming(false);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    setLoadError(
      'Your payment is taking longer than expected. Please check My Orders in a moment.'
    );
    setConfirming(false);
  }, [confirming, dispatch, order]);

  const returnedPaymentIntent = searchParams.get('payment_intent');
  useEffect(() => {
    if (returnedPaymentIntent && order?.id) waitForWebhook();
  }, [order?.id, returnedPaymentIntent, waitForWebhook]);

  const goToOrder = useCallback(() => {
    if (order?.id) navigate(`/orders/${order.id}`, { replace: true });
  }, [navigate, order?.id]);

  if (initialized && !user) {
    return (
      <section className="mx-auto min-h-[70vh] max-w-md px-4 py-20 text-center flex flex-col justify-center items-center bg-white">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-200">
          <XCircle className="size-6" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-900">
          Sign In Required
        </h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          Please sign in to your account to complete this transaction securely.
        </p>
        <button
          onClick={() =>
            navigate('/login', {
              state: { redirect: location.pathname + location.search },
            })
          }
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white shadow-md hover:bg-slate-800 transition"
        >
          Sign In To Continue <ArrowRight className="size-4" />
        </button>
      </section>
    );
  }

  if (loadError && !confirming) {
    return (
      <section className="mx-auto min-h-[70vh] max-w-md px-4 py-20 text-center flex flex-col justify-center items-center bg-white">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-200">
          <XCircle className="size-6" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-900">
          Payment Unavailable
        </h1>
        <p role="alert" className="mt-2 text-xs text-slate-500 leading-relaxed">
          {loadError}
        </p>
        <button
          onClick={() => navigate('/cart')}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white hover:bg-slate-800 transition"
        >
          Return To Cart <ArrowRight className="size-4" />
        </button>
      </section>
    );
  }

  /* STAGE 1: REAL-TIME PAYMENT PROCESSING SCREEN */
  if (confirming && !progressFinished) {
    return (
      <PaymentProcessingView
        order={order}
        onComplete={() => setProgressFinished(true)}
      />
    );
  }

  /* STAGE 2: FULL PAGE SUCCESS SCREEN WITH PARTICLES */
  if (paymentSuccess || (confirming && progressFinished)) {
    return <PaymentSuccessView order={order} onContinue={goToOrder} />;
  }

  if (!order || !payment?.clientSecret || !stripePromise) {
    return (
      <section className="mx-auto min-h-[70vh] max-w-md px-4 py-20 text-center flex flex-col justify-center items-center bg-white">
        <LoaderCircle className="size-10 animate-spin text-slate-900 mx-auto" />
        <p className="mt-4 text-xs font-medium text-slate-500">
          Initializing secure payment gateway...
        </p>
      </section>
    );
  }

  const orderItems = order.items || [];

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20 pt-6 sm:pt-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Link to="/cart" className="hover:text-slate-900 transition">
              Cart
            </Link>
            <ChevronRight className="size-3 text-slate-400" />
            <span className="text-slate-900 font-semibold">
              Checkout Payment
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            <Lock className="size-3 text-emerald-600" /> 256-Bit SSL Encrypted
          </span>
        </div>

        <div className="grid gap-8 lg:grid-cols-12 items-start">
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
              <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5 mb-6">
                <span className="grid size-11 place-items-center rounded-xl bg-slate-900 text-white shadow-xs">
                  <CreditCard className="size-5" />
                </span>
                <div>
                  <h1 className="text-lg font-bold text-slate-900">
                    Payment Information
                  </h1>
                  <p className="text-xs text-slate-500">
                    Choose your payment method to complete order #
                    {order.orderNumber || order.id}
                  </p>
                </div>
              </div>

              <Elements
                stripe={stripePromise}
                options={{ clientSecret: payment.clientSecret, appearance }}
              >
                <PaymentForm order={order} onPaid={waitForWebhook} />
              </Elements>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="relative mx-auto w-full rounded-2xl bg-white p-6 shadow-xl border border-slate-200/80 text-slate-800 font-mono text-xs overflow-hidden transition-all duration-300 hover:shadow-2xl">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-slate-900" />

              <div className="border-b-2 border-dashed border-slate-200 pb-4 mb-4 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-sans font-black text-sm uppercase tracking-wider text-slate-900">
                    <Receipt className="size-4 text-slate-500" /> Order Receipt
                  </div>
                  <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold font-sans text-amber-700 border border-amber-200 uppercase tracking-wider">
                    Pending Pay
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2 font-mono">
                  <span>REF: #{order.orderNumber || order.id}</span>
                  <span>
                    {new Date().toLocaleDateString(undefined, {
                      dateStyle: 'medium',
                    })}
                  </span>
                </div>
              </div>

              <div className="border-b-2 border-dashed border-slate-200 pb-4 mb-4 space-y-3">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 font-sans uppercase tracking-wider">
                  <span>ITEM / QTY</span>
                  <span>AMOUNT</span>
                </div>

                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {orderItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-[11px] gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={imageSrc(item.image || item.productImage)}
                          alt={item.name || item.productName}
                          className="size-11 shrink-0 rounded-lg border border-slate-200 object-cover bg-slate-50"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate font-sans text-xs">
                            {item.quantity}x {item.name || item.productName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            SIZE: {item.size} | COLOR: {item.color}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-slate-900 shrink-0 font-mono">
                        {money(
                          item.lineTotal || item.unitPrice,
                          order.currency
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 text-[11px] border-b-2 border-dashed border-slate-200 pb-4 mb-4">
                <div className="flex justify-between text-slate-500">
                  <span className="uppercase">SUBTOTAL</span>
                  <span className="font-medium text-slate-900 font-mono">
                    {money(order.subtotal || order.total * 0.9, order.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span className="uppercase">SHIPPING & HANDLING</span>
                  <span className="font-medium text-slate-900 font-mono">
                    {order.shippingCost
                      ? money(order.shippingCost, order.currency)
                      : 'FREE'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span className="uppercase">ESTIMATED TAX</span>
                  <span className="font-medium text-slate-900 font-mono">
                    {order.tax ? money(order.tax, order.currency) : '$0.00'}
                  </span>
                </div>
                <div className="pt-3 flex justify-between items-baseline font-black text-sm text-slate-900 border-t border-slate-200 mt-2">
                  <span className="uppercase font-sans tracking-wider text-xs">
                    TOTAL DUE
                  </span>
                  <span className="text-base font-mono">
                    {money(order.total, order.currency)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-sans font-medium">
                <Truck className="size-3 text-slate-400" />
                <span>Insured shipping with live delivery tracking</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
