import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { getMe } from '../api/auth'
import { createWebsite } from '../api/websites'
import { triggerScan } from '../api/scans'
import { useSiteStore } from '../store/siteStore'

export const Route = createFileRoute('/onboarding')({
  beforeLoad: () => {
    if (!localStorage.getItem('access_token')) throw redirect({ to: '/login' })
  },
  component: OnboardingPage,
})

function OnboardingPage() {
  const navigate = useNavigate()
  const { setWebsiteId } = useSiteStore()
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: getMe })
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return
    setLoading(true)
    try {
      const fullUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
      let name = fullUrl
      try { name = new URL(fullUrl).hostname.replace(/^www\./, '') } catch {}

      const website = await createWebsite(name, fullUrl)
      setWebsiteId(website.id)
      const job = await triggerScan(website.id)

      const jobId =
        job.desktop_scan_job_id
          ? String(job.desktop_scan_job_id)
          : job.scan_job_id
          ? String(job.scan_job_id)
          : null

      navigate({
        to: '/scanning',
        search: { jobId: jobId ?? '', url: website.url },
      })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Could not start scan'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col"
      style={{ background: 'linear-gradient(145deg, #dce8f5 0%, #e9eef8 50%, #d8e3f0 100%)' }}
    >
      {/* Topographic background */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.15 }}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="topo" x="0" y="0" width="700" height="500" patternUnits="userSpaceOnUse">
            {([0.6, 1.2, 1.8, 2.5, 3.2, 4.0, 4.8, 5.6] as number[]).map((s, i) => (
              <ellipse key={i} cx="350" cy="250" rx={s * 90} ry={s * 55} fill="none" stroke="#3b6abf" strokeWidth="0.9" />
            ))}
            {([0.6, 1.2, 1.8, 2.5, 3.2, 4.0] as number[]).map((s, i) => (
              <ellipse key={i + 10} cx="100" cy="80" rx={s * 65} ry={s * 42} fill="none" stroke="#3b6abf" strokeWidth="0.9" />
            ))}
            {([0.6, 1.2, 1.8, 2.5, 3.2] as number[]).map((s, i) => (
              <ellipse key={i + 20} cx="620" cy="420" rx={s * 75} ry={s * 48} fill="none" stroke="#3b6abf" strokeWidth="0.9" />
            ))}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#topo)" />
      </svg>

      {/* Header */}
      <header className="relative z-10 px-8 pt-6 pb-4">
        <span className="font-bold text-xl text-gray-900">
          <span className="text-blue-600">W</span>ebYes
        </span>
      </header>

      {/* Centered card */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-2xl border-2 border-blue-300 shadow-2xl w-full max-w-lg px-10 py-10">
          <div className="font-bold text-xl text-gray-900 mb-5">
            <span className="text-blue-600">W</span>ebYes
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome {user?.username ?? ''},
          </h1>
          <p className="text-sm text-gray-500 mb-8 leading-relaxed">
            Get ready to scan your website, find issues, and fix them fast.
          </p>

          <form onSubmit={handleContinue} className="space-y-4">
            <input
              type="text"
              placeholder="Website URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              {loading ? 'Starting scan…' : 'Continue'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-5 flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
            </svg>
            This scan checks only the entered URL; scan more later.
          </p>
        </div>
      </div>
    </div>
  )
}
