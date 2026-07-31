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

          <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
            {/* Email Input */}
            <div>
              <input
                type="email"
                placeholder="Email"
                className="w-full px-4 py-3 bg-[#E2E0D9] border border-[#A3A097] rounded-lg text-sm text-black placeholder-gray-500 focus:outline-none focus:border-black focus:bg-transparent transition-all"
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <input
                type="password"
                placeholder="Password"
                className="w-full px-4 py-3 bg-[#E2E0D9] border border-[#A3A097] rounded-lg text-sm text-black placeholder-gray-500 focus:outline-none focus:border-black focus:bg-transparent transition-all"
                required
              />
            </div>

            {/* Keep Logged In Checkbox */}
            <div className="pt-1 pb-2">
              <label className="flex items-start gap-2.5 text-xs text-gray-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="mt-0.5 w-4 h-4 rounded border-gray-500 text-black accent-black focus:ring-0 cursor-pointer"
                />
                <span>
                  Keep me logged in - applies to all log in options below.{' '}
                  <a href="#more-info" className="underline font-semibold hover:text-black">
                    More info
                  </a>
                </span>
              </label>
            </div>

            {/* Email Login Button */}
            <button
              type="submit"
              className="w-full bg-[#1E1E1E] hover:bg-black text-white font-bold py-3.5 px-5 rounded-lg flex items-center justify-between text-xs tracking-wider uppercase transition-all duration-200 active:scale-[0.99]"
            >
              <span>EMAIL LOGIN</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </form>

          {/* Social Logins */}
          <div className="grid grid-cols-3 gap-3 my-5">
            {/* Google */}
            <button className="border border-[#A3A097] rounded-lg py-3 flex justify-center items-center hover:border-black transition-all bg-transparent">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            </button>

            {/* Apple */}
            <button className="border border-[#A3A097] rounded-lg py-3 flex justify-center items-center hover:border-black transition-all bg-transparent">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.96.04-2.12.64-2.8 1.44-.61.71-1.14 1.86-1 2.97 1.08.08 2.16-.57 2.81-1.37z" />
              </svg>
            </button>

            {/* Facebook */}
            <button className="border border-[#A3A097] rounded-lg py-3 flex justify-center items-center hover:border-black transition-all bg-transparent">
              <svg className="w-5 h-5 fill-[#1877F2]" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </button>
          </div>

          {/* Terms Disclaimer */}
          <p className="text-[11px] leading-relaxed text-gray-800 font-medium">
            By clicking 'Log In' you agree to our website{' '}
            <a href="#terms" className="underline font-bold hover:text-black">
              KicksClub Terms & Conditions
            </a>
            ,{' '}
            <a href="#privacy" className="underline font-bold hover:text-black">
              Kicks Privacy Notice
            </a>{' '}
            and{' '}
            <a href="#terms2" className="underline font-bold hover:text-black">
              Terms & Conditions
            </a>
            .
          </p>
        </div>
      </div>

      {/* RIGHT COLUMN: PROMO CARD */}
      <div className="lg:col-span-6 bg-white rounded-[28px] p-8 sm:p-10 shadow-sm flex flex-col justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4 leading-tight">
            Join Kicks Club Get Rewarded Today.
          </h2>

          <p className="text-xs sm:text-sm text-gray-700 mb-4 leading-relaxed">
            As kicks club member you get rewarded with what you love for doing what you love. Sign up today and receive immediate access to these Level 1 benefits:
          </p>

          <ul className="text-xs sm:text-sm text-gray-700 space-y-1 mb-6">
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span> Free shipping
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span> A 15% off voucher for your next purchase
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span> Access to Members Only products and sales
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span> Access to adidas Running and Training apps
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span> Special offers and promotions
            </li>
          </ul>

          <p className="text-xs sm:text-sm text-gray-700 mb-8 leading-relaxed">
            Join now to start earning points, reach new levels and unlock more rewards and benefits from adiClub.
          </p>
        </div>

        {/* Switch to Signup */}
        <button
          onClick={onSwitchToSignup}
          className="w-full bg-[#1E1E1E] hover:bg-black text-white font-bold py-3.5 px-5 rounded-lg flex items-center justify-between text-xs tracking-wider uppercase transition-all duration-200 active:scale-[0.99]"
        >
          <span>JOIN THE CLUB</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}