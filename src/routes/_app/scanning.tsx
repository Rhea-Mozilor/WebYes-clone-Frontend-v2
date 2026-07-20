import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { getScanJob, cancelScan } from '../../api/scans'
import ScanModalGif from '../../components/svgicons/scanmodal.gif'
import { useSiteStore } from '../../store/siteStore'

export const Route = createFileRoute('/_app/scanning')({
  validateSearch: (search: Record<string, unknown>) => ({
    jobId: typeof search.jobId === 'string' ? search.jobId : '',
    url: typeof search.url === 'string' ? search.url : '',
  }),
  component: ScanningPage,
})

function siteName(rawUrl: string) {
  try { return new URL(rawUrl).hostname.replace(/^www\./, '') } catch { return rawUrl }
}

function CheckIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none" className="shrink-0">
      <path d="M1.5 7l5 5L16.5 1.5" stroke="#219653" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}


function SpinnerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 animate-spin">
      <circle cx="8" cy="8" r="7" stroke="#adbbd8" strokeWidth="1.5" />
      <path d="M8 1a7 7 0 0 1 7 7" stroke="#0b66e4" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function ScanIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M2 7V3.5A1.5 1.5 0 0 1 3.5 2H7" stroke="#0a165b" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15 2h3.5A1.5 1.5 0 0 1 20 3.5V7" stroke="#0a165b" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M20 15v3.5A1.5 1.5 0 0 1 18.5 20H15" stroke="#0a165b" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 20H3.5A1.5 1.5 0 0 1 2 18.5V15" stroke="#0a165b" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="11" x2="20" y2="11" stroke="#0a165b" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function ScanningPage() {
  const { jobId, url } = Route.useSearch()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [cancelling, setCancelling] = useState(false)
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)
  const [showComplete, setShowComplete] = useState(false)
  const { websiteId, setScanForWebsite, setActiveScanJob } = useSiteStore()

  const { data: job } = useQuery({
    queryKey: ['onboarding-scan', jobId],
    queryFn: () => getScanJob(jobId),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const s = query.state.data?.status
      return s === 'completed' || s === 'failed' ? false : 3_000
    },
  })

  const pages = job?.pages ?? []
  const pagesScanned = job?.pages_scanned ?? pages.length
  const currentUrl = job?.current_url ?? null
  const name = siteName(url)

  useEffect(() => {
    if ((job?.status === 'completed' || job?.status === 'failed') && jobId && websiteId) {
      setScanForWebsite(websiteId, jobId)
      setShowComplete(true)
    }
  }, [job?.status, jobId, websiteId, setScanForWebsite])

  async function handleCancel() {
    if (!jobId) { navigate({ to: '/dashboard' }); return }
    setCancelling(true)
    try { await cancelScan(jobId) } catch {}
    void qc.invalidateQueries({ queryKey: ['billing-credits'] })
    navigate({ to: '/dashboard' })
  }

  if (showComplete) {
    const hasFailed = job?.status === 'failed'
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-sm shadow-2xl w-full max-w-sm overflow-hidden">
          <div className="flex justify-end px-4 pt-4">
            <button
              onClick={() => { setShowComplete(false); if (!hasFailed) navigate({ to: '/dashboard' }) }}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {hasFailed ? (
            <>
              <div className="mx-5 mb-5 rounded-sm bg-red-50 flex items-center justify-center py-8 relative min-h-[200px]">
                <svg viewBox="0 0 220 150" className="w-56" fill="none">
                  <rect x="30" y="10" width="160" height="110" rx="8" fill="#FEE2E2" />
                  <rect x="30" y="10" width="160" height="24" rx="8" fill="#991B1B" />
                  <rect x="44" y="44" width="38" height="28" rx="4" fill="#FECACA" />
                  <rect x="90" y="44" width="38" height="28" rx="4" fill="#FECACA" />
                  <rect x="136" y="44" width="38" height="28" rx="4" fill="#FECACA" />
                  <rect x="44" y="80" width="130" height="10" rx="3" fill="#FCA5A5" />
                  <rect x="44" y="96" width="95" height="10" rx="3" fill="#FCA5A5" />
                </svg>
                <div className="absolute bottom-6 left-10 w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <div className="px-6 pb-7">
                <h2 className="text-[20px] font-bold text-gray-900 mb-2">Scan failed</h2>
                <p className="text-sm text-gray-600 mb-6">
                  The scan for <span className="font-bold text-gray-900">{url}</span> could not be completed. Please try running the scan again.
                </p>
                <button
                  onClick={() => setShowComplete(false)}
                  className="w-full py-3 bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mx-5 mb-5 rounded-sm bg-[#e8eeff] flex items-center justify-center py-8 relative min-h-[200px]">
                <svg viewBox="0 0 220 150" className="w-56" fill="none">
                  <rect x="30" y="10" width="160" height="110" rx="8" fill="#BFDBFE" />
                  <rect x="30" y="10" width="160" height="24" rx="8" fill="#3730A3" />
                  <rect x="44" y="44" width="38" height="28" rx="4" fill="#C7D2FE" />
                  <rect x="90" y="44" width="38" height="28" rx="4" fill="#C7D2FE" />
                  <rect x="136" y="44" width="38" height="28" rx="4" fill="#C7D2FE" />
                  <rect x="44" y="80" width="130" height="10" rx="3" fill="#DDD6FE" />
                  <rect x="44" y="96" width="95" height="10" rx="3" fill="#DDD6FE" />
                </svg>
                <div className="absolute bottom-6 left-10">
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="absolute bottom-4 right-12 w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center shadow">
                  <svg className="w-6 h-6 text-blue-700" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="4" r="1.5" />
                    <path d="M12 7c-2.8 0-5 .8-5 .8l1 3.2h3v7h2v-7h3l1-3.2S14.8 7 12 7z" />
                  </svg>
                </div>
              </div>
              <div className="px-6 pb-7">
                <h2 className="text-[20px] font-bold text-gray-900 mb-2">Your website scan is complete</h2>
                <p className="text-sm text-gray-600 mb-6">
                  The audit for <span className="font-bold text-gray-900">{url}</span> is ready — review your results and fix the issues.
                </p>
                <button
                  onClick={() => { setShowComplete(false); navigate({ to: '/dashboard' }) }}
                  className="w-full py-3 bg-[#0b66e4] hover:bg-[#0952c6] text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  View results
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6 sm:p-10 min-h-0 overflow-y-auto">
      <div
        className="relative bg-white rounded-[12px] w-full flex flex-col gap-5"
        style={{ maxWidth: 886, boxShadow: '0px 0px 20px 0px rgba(16,6,57,0.13)' }}
      >
        {/* Padding wrapper */}
        <div className="px-8 pt-8 pb-0 flex flex-col gap-5">

          {/* Close button */}
          <button
            onClick={() => {
              if (jobId) setActiveScanJob({ jobId, url })
              navigate({ to: '/dashboard' })
            }}
            disabled={pagesScanned === 0}
            className="absolute top-2 right-3 p-1.5 text-[#585b66] hover:text-[#141414] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <X size={18} />
          </button>

          {/* Main bordered content box */}
          <div className="border border-[#adbbd8] rounded-[8px] flex overflow-hidden" style={{ minHeight: 324 }}>

            {/* Left: scanning info */}
            <div className="flex-1 py-8 pl-9 pr-6 flex flex-col min-w-0">

              <h1
                className="text-[24px] font-semibold text-[#141414] leading-[32px]"
                style={{ letterSpacing: '-0.2px' }}
              >
                {name} scanning...
              </h1>

              <p className="text-[13px] text-[#73767f] mt-2 leading-[19px]">
                Your scan profile '{name}' has been saved. You can access it later from the Scan Profiles menu.
              </p>

              {/* Pages scanned */}
              <div className="flex items-center gap-2 mt-5">
                <ScanIcon />
                <span className="text-[13px] font-medium text-[#0a165b]">
                  {pagesScanned} pages scanned
                </span>
              </div>

              {/* Currently scanning bar */}
              <div className="mt-5 bg-[#e2e9f3] px-5 py-2">
                <span className="text-[13px] font-medium text-[#0a165b]">Currently scanning :</span>
              </div>

              {/* URL list: completed pages + active current_url */}
              <div className="flex-1 overflow-y-auto max-h-[130px] pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#323232 transparent' }}>
                {pages.length === 0 && !currentUrl ? (
                  <div className="flex items-center gap-3 py-2.5">
                    <SpinnerIcon />
                    <span className="text-[13px] text-[#73767f]">Waiting for scanner...</span>
                  </div>
                ) : (
                  <>
                    {pages.map((p) => (
                      <div key={p.url} className="flex items-center justify-between gap-3 py-2 border-b border-[#f0f0f0]">
                        <span className="text-[13px] text-black truncate">{p.url}</span>
                        <CheckIcon />
                      </div>
                    ))}
                    {currentUrl && !pages.find(p => p.url === currentUrl) && (
                      <div key={currentUrl} className="flex items-center justify-between gap-3 py-2">
                        <span className="text-[13px] text-black truncate">{currentUrl}</span>
                        <SpinnerIcon />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Vertical divider */}
            <div className="w-px bg-[#adbbd8] self-stretch shrink-0" />

            {/* Right: animated illustration */}
            <div className="w-[260px] shrink-0 flex items-center justify-center p-6">
              <img
                src={ScanModalGif}
                alt="Scanning illustration"
                className="w-[210px] h-[210px] object-contain"
              />
            </div>
          </div>

          {/* Info box */}
          <div className="border border-[#adbbd8] rounded-[6px] px-8 py-5">
            <p className="text-[14px] text-[#2e3240] leading-[24px]">
              The scanning process is ongoing and may take minutes or even hours depending on the size of your website. Meanwhile, you can:
            </p>
            <ul className="list-disc pl-5 mt-2 text-[14px] text-[#2e3240]">
              <li className="leading-[28px]">Explore the dashboard</li>
              <li className="leading-[28px]">We'll notify you via email, once the scan is completed</li>
            </ul>
          </div>
        </div>

        {/* Cancel confirmation modal */}
        {confirmCancelOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
              <h2 className="text-[20px] font-bold text-gray-900 mb-4">Cancel scanning</h2>
              <p className="text-[15px] text-gray-400 leading-relaxed mb-10">
                Are you sure you want to stop scanning? Any URLs scanned so far will still use up your credits
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setConfirmCancelOpen(false); handleCancel() }}
                  disabled={cancelling}
                  className="flex-1 py-3 border border-gray-300 rounded-lg text-[15px] font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel scan'}
                </button>
                <button
                  onClick={() => setConfirmCancelOpen(false)}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-[15px] font-medium text-white transition-colors"
                >
                  Continue scan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-4 px-8 pb-7">
          <button
            onClick={() => setConfirmCancelOpen(true)}
            disabled={cancelling}
            className="text-[14px] font-medium text-[#585b66] hover:text-[#141414] disabled:opacity-50 transition-colors"
            style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.28px' }}
          >
            {cancelling ? 'Cancelling...' : 'Cancel scan'}
          </button>
          <button
            onClick={() => {
              if (jobId) setActiveScanJob({ jobId, url })
              navigate({ to: '/dashboard' })
            }}
            disabled={pagesScanned === 0}
            className="px-5 py-2.5 bg-[#0b66e4] hover:bg-[#0952c6] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[14px] font-medium rounded-[4px] transition-colors"
            style={{ letterSpacing: '-0.28px' }}
          >
            Back to dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
