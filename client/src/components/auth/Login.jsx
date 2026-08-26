import React from 'react';

export default function Login({ onSwitchToSignup }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
      {/* LEFT COLUMN: LOGIN FORM */}
      <div className="lg:col-span-6 flex flex-col justify-between py-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Login</h1>
          <a
            href="#forgot"
            className="text-xs font-semibold underline text-gray-800 hover:text-black mb-6 inline-block"
          >
            Forgot your password?
          </a>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
            <span className="font-bold">Note:</span> Please use the Login page
            at the top level route. Use the "Join the Club" button to sign up.
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: PROMO CARD */}
      <div className="lg:col-span-6 bg-white rounded-[28px] p-8 sm:p-10 shadow-sm flex flex-col justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4 leading-tight">
            Join Kicks Club Get Rewarded Today.
          </h2>

          <p className="text-xs sm:text-sm text-gray-700 mb-4 leading-relaxed">
            As kicks club member you get rewarded with what you love for doing
            what you love. Sign up today and receive immediate access to these
            Level 1 benefits:
          </p>

          <ul className="text-xs sm:text-sm text-gray-700 space-y-1 mb-6">
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span> Free shipping
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span> A 15% off voucher for your
              next purchase
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span> Access to Members Only
              products and sales
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span> Access to adidas Running and
              Training apps
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span> Special offers and promotions
            </li>
          </ul>

          <p className="text-xs sm:text-sm text-gray-700 mb-8 leading-relaxed">
            Join now to start earning points, reach new levels and unlock more
            rewards and benefits from adiClub.
          </p>
        </div>

        {/* Switch to Signup */}
        <button
          onClick={onSwitchToSignup}
          className="w-full bg-[#1E1E1E] hover:bg-black text-white font-bold py-3.5 px-5 rounded-lg flex items-center justify-between text-xs tracking-wider uppercase transition-all duration-200 active:scale-[0.99]"
        >
          <span>JOIN THE CLUB</span>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
