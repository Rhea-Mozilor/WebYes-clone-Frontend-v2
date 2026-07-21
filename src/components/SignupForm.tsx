import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { signup, login, getMe } from '../api/auth'
import { startTrial } from '../api/billing'
import { useAuthStore } from '../store/authStore'
import Login1 from './svgicons/login/login1.png'
import Login2 from './svgicons/login/login2.png'
import Login3 from './svgicons/login/login3.png'
import Login4 from './svgicons/login/login4.png'
import WebYesLogo from './svgicons/Webyes-logo.svg'

export function SignupForm({
  plan,
  heading,
  subtitle,
  submitLabel,
}: {
  plan: 'free' | 'pro' | 'enterprise'
  heading: string
  subtitle: string | null
  submitLabel: string
}) {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agreed) {
      toast.error('Please agree to the Terms and Conditions')
      return
    }
    setLoading(true)
    try {
      const username = `${firstName}${lastName}`.toLowerCase()
      await signup(email, username, password)
      const tokens = await login(email, password)
      localStorage.setItem('access_token', tokens.access_token)
      const user = await getMe()
      setAuth(user, tokens.access_token)
      try { await startTrial(plan) } catch { /* non-fatal — user can still pick a plan from /pricing later */ }
      navigate({ to: '/onboarding' })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Could not create account'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-white">

      {/* ── Left panel — identical to login ────────────────────────────── */}
      <div className="hidden lg:block relative overflow-hidden flex-none" style={{ width: '53.68%' }}>
        <img src={Login4} alt="" className="absolute inset-0 w-full h-full object-cover" />

        {/* Issues-per-page card */}
        <img
          src={Login1}
          alt=""
          className="absolute rounded-[12px] shadow-[0px_0px_20px_0px_rgba(0,0,0,0.35)]"
          style={{ left: '10.87%', top: '22.28%', width: '46.83%' }}
        />

        {/* Level-A/AA/AAA card */}
        <img
          src={Login2}
          alt=""
          className="absolute shadow-[-3px_0px_16px_0px_rgba(22,43,149,0.1)]"
          style={{ left: '39.46%', top: '38.21%', width: '36.35%' }}
        />

        {/* Toast card */}
        <img
          src={Login3}
          alt=""
          className="absolute rounded-[7px] shadow-[-3.5px_2.6px_12px_0px_rgba(16,6,57,0.12)]"
          style={{ left: '48.25%', top: '18.51%', width: '36.74%' }}
        />

        {/* Bottom text */}
        <div
          className="absolute text-center"
          style={{ left: '31.05%', top: '71.37%', width: '35.71%' }}
        >
          <p className="text-white font-medium text-[28px] leading-[41px]">
            Get ready to explore our intuitive dashboard
          </p>
          <p className="text-white text-[14px] leading-[21px] mt-[10px] mb-[8px]">
            Unlock the full potential of your website with our comprehensive audits.
          </p>
          <div className="flex items-center justify-center gap-[8px] mt-[4px]">
            <div className="h-[7px] w-[20px] rounded-[16px] bg-[#0b66e4]" />
            <div className="size-[7px] rounded-full bg-[#d9d9d9]" />
            <div className="size-[7px] rounded-full bg-[#d9d9d9]" />
          </div>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────────── */}
      <div className="flex flex-col justify-center items-center flex-1 bg-white py-10">
        <div style={{ width: '430px' }}>

          {/* Logo */}
          <div className="flex justify-center mb-[16px]">
            <img src={WebYesLogo} alt="WebYes" style={{ height: '52.973px' }} />
          </div>

          {/* Heading */}
          <h1 className="font-bold text-[#2e3240] text-center" style={{ fontSize: '28px', lineHeight: 'normal', marginBottom: '8px' }}>
            {heading}
          </h1>

          {/* Subtitle */}
          {subtitle && (
            <p className="text-center text-black/60" style={{ fontSize: '14px', lineHeight: 'normal', marginBottom: '32px' }}>
              {subtitle}
            </p>
          )}

          <form onSubmit={handleSubmit} style={!subtitle ? { marginTop: '32px' } : undefined}>
            {/* First name + Last name */}
            <div className="flex gap-[14px]" style={{ marginBottom: '16px' }}>
              <div className="flex-1">
                <label className="block font-medium text-black" style={{ fontSize: '14px', marginBottom: '6px' }}>
                  First name<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full border border-black/20 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-black/30"
                  style={{ height: '51px', paddingLeft: '16px', paddingRight: '16px', fontSize: '13px', borderRadius: '4px' }}
                />
              </div>
              <div className="flex-1">
                <label className="block font-medium text-black" style={{ fontSize: '14px', marginBottom: '6px' }}>
                  Last name<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full border border-black/20 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-black/30"
                  style={{ height: '51px', paddingLeft: '16px', paddingRight: '16px', fontSize: '13px', borderRadius: '4px' }}
                />
              </div>
            </div>

            {/* Business email */}
            <div style={{ marginBottom: '16px' }}>
              <label className="block font-medium text-black" style={{ fontSize: '14px', marginBottom: '6px' }}>
                Business email<span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-black/20 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-black/30"
                style={{ height: '51px', paddingLeft: '16px', paddingRight: '16px', fontSize: '13px', borderRadius: '4px' }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '20px' }}>
              <label className="block font-medium text-black" style={{ fontSize: '14px', marginBottom: '6px' }}>
                Password<span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full border border-black/20 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-black/30"
                  style={{ height: '51px', paddingLeft: '16px', paddingRight: '48px', fontSize: '13px', borderRadius: '4px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-[14px] top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPass ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="flex items-center gap-[10px]" style={{ marginBottom: '20px' }}>
              <div
                className={`shrink-0 flex items-center justify-center border rounded cursor-pointer transition-colors ${agreed ? 'bg-[#0b66e4] border-[#0b66e4]' : 'bg-white border-[#aeaeb2]'}`}
                style={{ width: '15px', height: '15px', borderRadius: '2px' }}
                onClick={() => setAgreed(!agreed)}
              >
                {agreed && (
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8.5l3.5 3.5 7-7" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span style={{ fontSize: '13px', color: '#000' }}>
                I agree to the{' '}
                <a href="#" className="text-[#0b66e4] underline hover:opacity-80">Terms and Conditions</a>
                {' '}&amp;{' '}
                <a href="#" className="text-[#0b66e4] underline hover:opacity-80">Privacy Policy</a>
              </span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !agreed}
              className="w-full bg-[#0b66e4] hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded transition-colors"
              style={{ fontSize: '16px', paddingTop: '16px', paddingBottom: '16px', borderRadius: '4px', marginBottom: '20px' }}
            >
              {loading ? 'Creating account…' : submitLabel}
            </button>
          </form>

          {/* Login link */}
          <p className="text-center font-medium" style={{ fontSize: '13px', color: '#333' }}>
            Already have an account?{' '}
            <Link to="/login" className="text-[#2b69d4] font-medium underline hover:opacity-80">
              Log in
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}
