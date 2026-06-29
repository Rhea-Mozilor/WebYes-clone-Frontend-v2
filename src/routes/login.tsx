import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { login, getMe } from '../api/auth'
import { useAuthStore } from '../store/authStore'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const tokens = await login(email, password)
      localStorage.setItem('access_token', tokens.access_token)
      const user = await getMe()
      setAuth(user, tokens.access_token)
      navigate({ to: '/dashboard' })
    } catch {
      toast.error('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0038c8 0%, #1a5ff8 60%, #3b82f6 100%)' }}
      >
        {/* Decorative background circles */}
        <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full opacity-10 bg-white" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-5 bg-white" />

        {/* Logo */}
        <span className="font-bold text-2xl text-white relative z-10">
          <span className="opacity-80">W</span>ebYes
        </span>

        {/* Dashboard preview mockup */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-6 border border-white/20 shadow-2xl">
            {/* Scan complete banner */}
            <div className="bg-white rounded-lg px-3 py-2 mb-3 flex items-center gap-2 text-sm shadow">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              <div>
                <div className="font-medium text-gray-800 text-xs">Scanning Completed.</div>
                <div className="text-gray-500 text-xs">Good job with Performance and SEO! Needs improvement with Accessibility, Quality.</div>
              </div>
            </div>

            {/* Issues per page mini widget */}
            <div className="bg-white/90 rounded-lg p-3 mb-3 shadow">
              <div className="text-xs font-semibold text-gray-700 mb-2">Issues per page</div>
              {[
                { name: 'Dashboard', count: 32 },
                { name: 'Login', count: 44 },
                { name: 'Register', count: 28 },
                { name: 'Home', count: 15 },
                { name: 'Checkout', count: 22 },
              ].map((p) => (
                <div key={p.name} className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-500 w-16 truncate">{p.name}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${(p.count / 50) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 w-5 text-right">{p.count}</span>
                </div>
              ))}
            </div>

            {/* Score badges */}
            <div className="flex gap-2">
              {[
                { label: 'Level A', pct: '81%', color: '#22c55e' },
                { label: 'Level AA', pct: '21%', color: '#f59e0b' },
                { label: 'Level AAA', pct: '6%', color: '#ef4444' },
              ].map((s) => (
                <div key={s.label} className="bg-white/90 rounded-lg p-2 flex-1 shadow text-center">
                  <div className="text-xs text-gray-500">{s.label}</div>
                  <div className="text-base font-bold" style={{ color: s.color }}>{s.pct}</div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-3 flex gap-4">
              <div>
                <div className="text-xs text-gray-500">Total Issues</div>
                <div className="text-xl font-bold text-blue-600">26</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Critical Issues</div>
                <div className="text-xl font-bold text-red-500">05</div>
              </div>
            </div>
          </div>

          <h2 className="text-white text-2xl font-bold leading-tight mb-2">
            Get ready to explore<br />our intuitive dashboard
          </h2>
          <p className="text-blue-200 text-sm leading-relaxed">
            Unlock the full potential of your website<br />with our comprehensive audits.
          </p>
        </div>

        {/* Pagination dots */}
        <div className="flex gap-2 justify-center relative z-10">
          <div className="w-6 h-1.5 bg-white rounded-full" />
          <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
          <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex flex-col justify-center items-center w-full lg:w-1/2 px-8 py-12 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <span className="font-bold text-2xl text-gray-900">
              <span className="text-blue-600">W</span>ebYes
            </span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back!</h1>
          <p className="text-sm text-gray-500 mb-7">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="name@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="text-right mt-1">
                <button type="button" className="text-xs text-blue-600 hover:underline">
                  Forgot password?
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors mt-1"
            >
              {loading ? 'Signing in…' : 'Login'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            New to WebYes?{' '}
            <Link to="/signup" className="text-blue-600 font-medium hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
