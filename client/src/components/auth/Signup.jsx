import React from 'react';

export default function Signup({ onSwitchToLogin }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
      {/* LEFT COLUMN: SIGNUP FORM */}
      <div className="lg:col-span-6 flex flex-col justify-between py-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">
            Create Account
          </h1>
          <p className="text-xs font-semibold text-gray-600 mb-6">
            Join the club to get points and exclusive rewards.
          </p>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="First Name"
                className="w-full px-4 py-3 bg-[#E2E0D9] border border-[#A3A097] rounded-lg text-sm text-black placeholder-gray-500 focus:outline-none focus:border-black focus:bg-transparent transition-all"
                required
              />
              <input
                type="text"
                placeholder="Last Name"
                className="w-full px-4 py-3 bg-[#E2E0D9] border border-[#A3A097] rounded-lg text-sm text-black placeholder-gray-500 focus:outline-none focus:border-black focus:bg-transparent transition-all"
                required
              />
            </div>

            <input
              type="email"
              placeholder="Email address"
              className="w-full px-4 py-3 bg-[#E2E0D9] border border-[#A3A097] rounded-lg text-sm text-black placeholder-gray-500 focus:outline-none focus:border-black focus:bg-transparent transition-all"
              required
            />

            <input
              type="password"
              placeholder="Password"
              className="w-full px-4 py-3 bg-[#E2E0D9] border border-[#A3A097] rounded-lg text-sm text-black placeholder-gray-500 focus:outline-none focus:border-black focus:bg-transparent transition-all"
              required
            />

            <div className="pt-1 pb-2">
              <label className="flex items-start gap-2.5 text-xs text-gray-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="mt-0.5 w-4 h-4 rounded border-gray-500 text-black accent-black focus:ring-0 cursor-pointer"
                />
                <span>
                  Sign up for emails to get exclusive sales, product drops, and
                  news.
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full bg-[#1E1E1E] hover:bg-black text-white font-bold py-3.5 px-5 rounded-lg flex items-center justify-between text-xs tracking-wider uppercase transition-all duration-200 active:scale-[0.99]"
            >
              <span>REGISTER ACCOUNT</span>
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
          </form>

          <p className="text-[11px] leading-relaxed text-gray-800 font-medium mt-6">
            By registering you agree to our{' '}
            <a href="#terms" className="underline font-bold hover:text-black">
              KicksClub Terms & Conditions
            </a>
            .
          </p>
        </div>
      </div>

      {/* RIGHT COLUMN: PROMO CARD */}
      <div className="lg:col-span-6 bg-white rounded-[28px] p-8 sm:p-10 shadow-sm flex flex-col justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4 leading-tight">
            Already Have An Account?
          </h2>

          <p className="text-xs sm:text-sm text-gray-700 mb-6 leading-relaxed">
            Welcome back! Log in to access your orders, saved items, member
            rewards, and personal preferences.
          </p>

          <div className="bg-[#ECEAE5] p-5 rounded-2xl mb-8">
            <h3 className="font-bold text-sm mb-1">Fast Checkout</h3>
            <p className="text-xs text-gray-600">
              Saved details make checking out effortless.
            </p>
          </div>
        </div>

        {/* Switch to Login */}
        <button
          onClick={onSwitchToLogin}
          className="w-full bg-[#1E1E1E] hover:bg-black text-white font-bold py-3.5 px-5 rounded-lg flex items-center justify-between text-xs tracking-wider uppercase transition-all duration-200 active:scale-[0.99]"
        >
          <span>LOG IN</span>
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
