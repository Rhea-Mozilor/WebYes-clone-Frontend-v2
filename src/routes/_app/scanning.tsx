import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getScanJob, cancelScan } from '../../api/scans'

export const Route = createFileRoute('/_app/scanning')({
  validateSearch: (search: Record<string, unknown>) => ({
    jobId: typeof search.jobId === 'string' ? search.jobId : '',
    url: typeof search.url === 'string' ? search.url : '',
  }),
  component: ScanningPage,
})

function ScanningPage() {
  const { jobId, url } = Route.useSearch()
  const navigate = useNavigate()
  const [cancelling, setCancelling] = useState(false)

  const { data: job } = useQuery({
    queryKey: ['onboarding-scan', jobId],
    queryFn: () => getScanJob(jobId),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const s = query.state.data?.status
      return s === 'completed' || s === 'failed' ? false : 3_000
    },
  })

  const pagesScanned = job?.progress?.done ?? 0
  const pages = job?.pages ?? []
  const running = pages.filter((p) => p.status === 'running')
  const currentUrl = running[0]?.url ?? pages[pages.length - 1]?.url ?? url

  async function handleCancel() {
    if (!jobId) { navigate({ to: '/dashboard' }); return }
    setCancelling(true)
    try { await cancelScan(jobId) } catch {}
    navigate({ to: '/dashboard' })
  }

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-4">
      {/* Main scan card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex">
          {/* Left */}
          <div className="flex-1 p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-2xl font-bold text-gray-900">Scanning...</h1>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 border border-amber-300 text-amber-700">
                Quick scan
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Run a quick single-page scan for a snapshot of key issues affecting this page.
            </p>

            <div className="flex items-center gap-2 mb-5 text-blue-600">
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
              <span className="text-sm font-semibold">{pagesScanned} pages scanned</span>
            </div>

            {/* Currently scanning section */}
            <div>
              <div className="bg-blue-50 rounded-t-lg px-4 py-2.5">
                <span className="text-sm font-semibold text-gray-700">Currently scanning:</span>
              </div>
              <div className="border border-gray-100 rounded-b-lg">
                {pages.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-400">Waiting for scanner...</div>
                ) : (
                  <div className="flex items-center justify-between px-4 py-3 gap-3">
                    <span className="text-sm text-gray-600 truncate">{currentUrl}</span>
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right illustration */}
          <div className="hidden sm:flex w-52 shrink-0 items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
            <svg viewBox="0 0 160 145" className="w-full" fill="none">
              <rect x="8" y="8" width="144" height="100" rx="8" fill="#BFDBFE" />
              <rect x="8" y="8" width="144" height="24" rx="8" fill="#4F6FE8" />
              <rect x="20" y="44" width="40" height="28" rx="4" fill="#93C5FD" />
              <rect x="68" y="44" width="40" height="28" rx="4" fill="#93C5FD" />
              <rect x="116" y="44" width="28" height="28" rx="4" fill="#93C5FD" />
              <rect x="20" y="82" width="124" height="9" rx="3" fill="#BAE6FD" />
              <rect x="20" y="97" width="80" height="9" rx="3" fill="#BAE6FD" />
              <ellipse cx="80" cy="130" rx="55" ry="9" fill="#DBEAFE" />
            </svg>
          </div>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-7 py-5">
        <p className="text-sm text-gray-700 mb-3">
          The scan is in progress and may take a few minutes, depending on your site's size and structure.
        </p>
        <ul className="text-sm text-gray-600 space-y-1.5 list-disc pl-5">
          <li>The dashboard will be available to explore once the first page is scanned.</li>
          <li>You'll get an email notification when the scan is complete.</li>
        </ul>
      </div>

      {/* Footer buttons */}
      <div className="flex items-center justify-end gap-5 pt-1">
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="text-sm text-gray-500 hover:text-red-600 disabled:opacity-50 transition-colors"
        >
          {cancelling ? 'Cancelling...' : 'Cancel scan'}
        </button>
        <button
          onClick={() => navigate({ to: '/dashboard' })}
          className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Explore dashboard
        </button>
      </div>
    </div>
  )
}
