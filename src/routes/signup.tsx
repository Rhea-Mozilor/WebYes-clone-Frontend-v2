


import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { signup, login, getMe } from '../api/auth'
import { useAuthStore } from '../store/authStore'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
})

function SignupPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await signup(email, username, password)
      const tokens = await login(email, password)
      localStorage.setItem('access_token', tokens.access_token)
      const user = await getMe()
      setAuth(user, tokens.access_token)
      navigate({ to: '/dashboard' })
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
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0038c8 0%, #1a5ff8 60%, #3b82f6 100%)' }}
      >
        <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full opacity-10 bg-white" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-5 bg-white" />

        <span className="font-bold text-2xl text-white relative z-10">
          <span className="opacity-80">W</span>ebYes
        </span>

        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <h2 className="text-white text-3xl font-bold leading-tight mb-4">
            Start auditing your<br />websites today
          </h2>
          <p className="text-blue-200 text-sm leading-relaxed">
            Get detailed insights into performance,<br />
            accessibility, best practices and SEO.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {[
              { label: 'Performance', icon: '⚡' },
              { label: 'Accessibility', icon: '♿' },
              { label: 'Best Practices', icon: '✅' },
              { label: 'SEO', icon: '🔍' },
            ].map((f) => (
              <div key={f.label} className="bg-white/10 border border-white/20 rounded-xl p-3 backdrop-blur">
                <div className="text-xl mb-1">{f.icon}</div>
                <div className="text-white text-sm font-medium">{f.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 justify-center relative z-10">
          <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
          <div className="w-6 h-1.5 bg-white rounded-full" />
          <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-col justify-center items-center w-full lg:w-1/2 px-8 py-12 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 text-center">
            <span className="font-bold text-2xl text-gray-900">
              <span className="text-blue-600">W</span>ebYes
            </span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create an account</h1>
          <p className="text-sm text-gray-500 mb-7">Join WebYes and start auditing</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
              />
            </div>

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
                  minLength={8}
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
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors mt-1"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
