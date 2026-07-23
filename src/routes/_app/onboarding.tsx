import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { getMe } from '../../api/auth'
import { createWebsite } from '../../api/websites'
import { triggerScan } from '../../api/scans'
import { useSiteStore } from '../../store/siteStore'

export const Route = createFileRoute('/_app/onboarding')({
  component: OnboardingPage,
})

function OnboardingPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { setWebsiteId, setActiveScanJob } = useSiteStore()
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
      await queryClient.invalidateQueries({ queryKey: ['websites'] })
      setWebsiteId(website.id)
      const job = await triggerScan(website.id)
      void queryClient.invalidateQueries({ queryKey: ['billing-credits'] })

      const jobId =
        job.desktop_scan_job_id
          ? String(job.desktop_scan_job_id)
          : job.scan_job_id
          ? String(job.scan_job_id)
          : null

      // Mark the scan as running the instant it's triggered, not when the /scanning
      // page later unmounts — otherwise sidebar nav stays enabled during that window.
      if (jobId) setActiveScanJob({ jobId, url: website.url })

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
      className="fixed top-16 left-0 right-0 bottom-0 z-30 flex items-center justify-center px-4 overflow-hidden"
      style={{ background: 'linear-gradient(145deg, #dce8f5 0%, #e9eef8 50%, #d8e3f0 100%)' }}
    >

      {/* Radial concentric-circle background */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.18 }}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="topo" x="0" y="0" width="900" height="700" patternUnits="userSpaceOnUse">
            {[60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660].map((r, i) => (
              <circle key={i} cx="450" cy="350" r={r} fill="none" stroke="#3b6abf" strokeWidth="1" />
            ))}
            {[40, 90, 145, 200, 260, 320].map((r, i) => (
              <circle key={i + 20} cx="90" cy="80" r={r} fill="none" stroke="#3b6abf" strokeWidth="1" />
            ))}
            {[40, 90, 145, 200, 260].map((r, i) => (
              <circle key={i + 30} cx="820" cy="620" r={r} fill="none" stroke="#3b6abf" strokeWidth="1" />
            ))}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#topo)" />
      </svg>

      {/* Card */}
      <div className="relative z-10 bg-white rounded-2xl border border-[#7ba7f0] shadow-2xl w-full max-w-[480px] px-10 py-10">
        <div className="font-bold text-[22px] text-gray-900 mb-6 tracking-tight">
          <span className="text-[#2563eb]">W</span>ebYes
        </div>

        <h1 className="text-[26px] font-bold text-gray-900 mb-2 tracking-tight">
          Welcome {user?.username ?? ''},
        </h1>
        <p className="text-[14px] text-gray-500 mb-8 leading-relaxed">
          Get ready to scan your website, find issues, and fix them fast.
        </p>

        <form onSubmit={handleContinue} className="space-y-4">
          <input
            type="text"
            placeholder="Website URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 bg-gray-50"
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="w-full py-3.5 bg-[#3b5bdb] hover:bg-[#2f4ac2] disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
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
  )
}
