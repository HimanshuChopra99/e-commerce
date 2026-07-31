import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loginUser, clearError } from '../store/authSlice'

export default function Login() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  const { loading, error, user } = useSelector((state) => state.auth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    dispatch(clearError())
    try {
      const res = await dispatch(loginUser({ email, password })).unwrap()
      // Redirect based on role
      if (res?.user?.role === 'admin') {
        // Admins go to admin panel - use relative path
        window.location.href = '/admin'
      } else {
        navigate(redirect, { replace: true })
      }
    } catch {
      // Error handled in slice state
    }
  }

  const errorMessage = typeof error === 'object' && error !== null
    ? (error.message || error.error || JSON.stringify(error))
    : error

  return (
    <div className="min-h-screen bg-[#ECEAE5] text-[#111111] font-sans flex items-center justify-center p-4 sm:p-8 md:p-12 animate-fade-in">
      <div className="w-full max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between py-2">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-1">Login</h1>
              <a
                href="#forgot"
                className="text-xs font-semibold underline text-gray-800 hover:text-black mb-6 inline-block"
              >
                Forgot your password?
              </a>

              {errorMessage && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-xs font-semibold">
                  {String(errorMessage)}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full px-4 py-3 bg-[#E2E0D9] border border-[#A3A097] rounded-lg text-sm text-black placeholder-gray-500 focus:outline-none focus:border-black focus:bg-transparent transition-all"
                    required
                  />
                </div>

                <div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full px-4 py-3 bg-[#E2E0D9] border border-[#A3A097] rounded-lg text-sm text-black placeholder-gray-500 focus:outline-none focus:border-black focus:bg-transparent transition-all"
                    required
                  />
                </div>

                <div className="pt-1 pb-2">
                  <label className="flex items-start gap-2.5 text-xs text-gray-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="mt-0.5 w-4 h-4 rounded border-gray-500 text-black accent-black focus:ring-0 cursor-pointer"
                    />
                    <span>Keep me logged in - applies to all log in options below.</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1E1E1E] hover:bg-black text-white font-bold py-3.5 px-5 rounded-lg flex items-center justify-between text-xs tracking-wider uppercase transition-all duration-200 active:scale-[0.99] disabled:bg-gray-400"
                >
                  <span>{loading ? 'LOGGING IN...' : 'EMAIL LOGIN'}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white rounded-[28px] p-8 sm:p-10 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4 leading-tight">
                Join Kicks Club Get Rewarded Today.
              </h2>
              <p className="text-xs sm:text-sm text-gray-700 mb-4 leading-relaxed">
                As kicks club member you get rewarded with what you love for doing what you love. Sign up today!
              </p>
              <ul className="text-xs sm:text-sm text-gray-700 space-y-1 mb-6">
                <li className="flex items-start gap-2"><span className="font-bold">•</span> Free shipping</li>
                <li className="flex items-start gap-2"><span className="font-bold">•</span> 15% off voucher</li>
                <li className="flex items-start gap-2"><span className="font-bold">•</span> Members-only drops</li>
              </ul>
            </div>

            <Link
              to="/signup"
              className="w-full bg-[#1E1E1E] hover:bg-black text-white font-bold py-3.5 px-5 rounded-lg flex items-center justify-between text-xs tracking-wider uppercase transition-all duration-200 active:scale-[0.99]"
            >
              <span>JOIN THE CLUB</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
