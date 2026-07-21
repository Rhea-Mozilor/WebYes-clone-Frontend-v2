import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { login, getMe } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import Login1 from '../components/svgicons/login/login1.png'
import Login2 from '../components/svgicons/login/login2.png'
import Login3 from '../components/svgicons/login/login3.png'
import Login4 from '../components/svgicons/login/login4.png'
import WebYesLogo from '../components/svgicons/Webyes-logo.svg'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const tokens = await login(email, password)
      localStorage.setItem('access_token', tokens.access_token)
      const user = await getMe()
      setAuth(user, tokens.access_token)
      navigate({ to: '/dashboard' })
    } catch {
      setError('Incorrect email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-white">

      {/* ── Left panel ─────────────────────────────────────────────────── */}
      {/* Figma: 773px of 1440px frame = 53.68% */}
      <div className="hidden lg:block relative overflow-hidden flex-none" style={{ width: '53.68%' }}>

        {/* Background image */}
        <img src={Login4} alt="" className="absolute inset-0 w-full h-full object-cover" />

        {/* Issues-per-page card  (imgImage1: left=84, top=207, w=362, h=344 in 773×929) */}
        <img
          src={Login1}
          alt=""
          className="absolute rounded-[12px] shadow-[0px_0px_20px_0px_rgba(0,0,0,0.35)]"
          style={{ left: '10.87%', top: '22.28%', width: '46.83%' }}
        />

        {/* Level-A/AA/AAA card  (imgImage2: left=305, top=355, w=281, h=258) */}
        <img
          src={Login2}
          alt=""
          className="absolute shadow-[-3px_0px_16px_0px_rgba(22,43,149,0.1)]"
          style={{ left: '39.46%', top: '38.21%', width: '36.35%' }}
        />

        {/* Toast card  (left=373, top=172, w=284) */}
        <img
          src={Login3}
          alt=""
          className="absolute rounded-[7px] shadow-[-3.5px_2.6px_12px_0px_rgba(16,6,57,0.12)]"
          style={{ left: '48.25%', top: '18.51%', width: '36.74%' }}
        />

        {/* Bottom text  (left=240, top=663, w=276, h=181 in 773×929) */}
        <div
          className="absolute text-center"
          style={{ left: '31.05%', top: '71.37%', width: '35.71%' }}
        >
          {/* Heading — font 28px, medium, line-height 41px */}
          <p className="text-white font-medium text-[28px] leading-[41px] mb-0">
            Get ready to explore our intuitive dashboard
          </p>
          {/* Subtitle — font 14px, regular, line-height 21px */}
          <p className="text-white text-[14px] leading-[21px] mt-[10px] mb-[8px]">
            Unlock the full potential of your website with our comprehensive audits.
          </p>
          {/* Pagination dots */}
          <div className="flex items-center justify-center gap-[8px] mt-[4px]">
            <div className="h-[7px] w-[20px] rounded-[16px] bg-[#0b66e4]" />
            <div className="size-[7px] rounded-full bg-[#d9d9d9]" />
            <div className="size-[7px] rounded-full bg-[#d9d9d9]" />
          </div>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────────── */}
      <div className="flex flex-col justify-center items-center flex-1 bg-white">
        {/* Form container — Figma: 382px wide */}
        <div style={{ width: '382px' }}>

          {/* Logo — Figma node 501-63561: w=140px, h=52.97px, centered */}
          <div className="flex justify-center mb-[8px]">
            <img src={WebYesLogo} alt="WebYes" style={{ height: '52.973px' }} />
          </div>

          {/* Welcome back — font 28px bold, top=218 (8px below logo bottom 210) */}
          <h1
            className="font-bold text-[#2e3240] text-center"
            style={{ fontSize: '28px', lineHeight: 'normal', marginBottom: '10px' }}
          >
            Welcome back !
          </h1>

          {/* Subtitle — font 14px, top=262 */}
          <p
            className="text-center text-black/60"
            style={{ fontSize: '14px', lineHeight: 'normal', marginBottom: error ? '16px' : '63px' }}
          >
            Log in to continue
          </p>

          {error && (
            <p className="text-red-600 font-medium" style={{ fontSize: '14px', marginBottom: '24px' }}>
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email — label top=345, input top=368 h=51 */}
            <div style={{ marginBottom: '45px' }}>
              <label
                className="block font-medium text-black"
                style={{ fontSize: '14px', marginBottom: '6px' }}
              >
                Email
              </label>
              <input
                type="email"
                placeholder="name@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-black/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-[rgba(36,36,36,0.4)]"
                style={{ height: '51px', paddingLeft: '21px', paddingRight: '21px', fontSize: '13px', borderRadius: '4px' }}
              />
            </div>

            {/* Password — label top=464, input top=486 h=51 */}
            <div style={{ marginBottom: '23px' }}>
              <label
                className="block font-medium text-black"
                style={{ fontSize: '14px', marginBottom: '6px' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full border border-black/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-black/40"
                  style={{ height: '51px', paddingLeft: '21px', paddingRight: '48px', fontSize: '13px', borderRadius: '4px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-[14px] top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPass ? <EyeOff className="w-[18.75px] h-[12.5px]" /> : <Eye className="w-[18.75px] h-[12.5px]" />}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot password — top=560 */}
            <div className="flex items-center justify-between" style={{ marginBottom: '63px' }}>
              <label className="flex items-center gap-[10px] cursor-pointer select-none">
                <div className="relative" style={{ width: '15px', height: '15px' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`absolute inset-0 rounded-[2px] border border-[#aeaeb2] flex items-center justify-center transition-colors ${rememberMe ? 'bg-[#0b66e4] border-[#0b66e4]' : 'bg-white'}`}
                    onClick={() => setRememberMe(!rememberMe)}
                  >
                    {rememberMe && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: '13px', color: '#000' }}>Remember me</span>
              </label>
              <button
                type="button"
                className="underline text-black hover:text-gray-600"
                style={{ fontSize: '13px' }}
              >
                Forgot password?
              </button>
            </div>

            {/* Login button — top=638, py=16px */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0b66e4] hover:bg-blue-700 disabled:opacity-60 text-white font-medium rounded transition-colors"
              style={{ fontSize: '16px', paddingTop: '16px', paddingBottom: '16px', borderRadius: '4px', marginBottom: '39px' }}
            >
              {loading ? 'Signing in…' : 'Login'}
            </button>
          </form>

          {/* New to WebYes — top=725 */}
          <p className="text-center font-medium" style={{ fontSize: '13px', color: '#333' }}>
            New to WebYes?{' '}
            <Link to="/signup" className="text-[#2b69d4] font-medium underline hover:opacity-80">
              Create an account
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}
