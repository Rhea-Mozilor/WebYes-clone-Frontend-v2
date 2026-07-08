import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueries } from '@tanstack/react-query'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import { getScanHistory, getScanJob } from '../../api/scans'
import { getWebsite } from '../../api/websites'
import { useSiteStore } from '../../store/siteStore'
import { useState } from 'react'

export const Route = createFileRoute('/_app/scan-history')({
  component: ScanHistoryPage,
})

const PAGE_SIZE = 10

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    const day = String(d.getUTCDate()).padStart(2, '0')
    const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
    const year = d.getUTCFullYear()
    let hours = d.getUTCHours()
    const minutes = String(d.getUTCMinutes()).padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12 || 12
    return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm} UTC`
  } catch { return iso }
}

function ScanHistoryPage() {
  const navigate = useNavigate()
  const { websiteId } = useSiteStore()
  const [page, setPage] = useState(1)

  const { data: history, isLoading } = useQuery({
    queryKey: ['scan-history', websiteId],
    queryFn: () => getScanHistory(websiteId!),
    enabled: !!websiteId,
  })

  const { data: website } = useQuery({
    queryKey: ['website', websiteId],
    queryFn: () => getWebsite(websiteId!),
    enabled: !!websiteId,
  })

  const totalPages = history ? Math.max(1, Math.ceil(history.length / PAGE_SIZE)) : 1
  const paged = history ? history.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : []

  const jobQueries = useQueries({
    queries: paged.map((item) => ({
      queryKey: ['scan-job', item.scan_job_id],
      queryFn: () => getScanJob(item.scan_job_id),
      enabled: !!item.scan_job_id,
    })),
  })

  const getScanUrl = (idx: number) => {
    const job = jobQueries[idx]?.data
    return job?.pages?.[0]?.url ?? job?.current_url ?? website?.url ?? null
  }

  return (
    <div className="flex-1 p-6 w-full">
      <button
        onClick={() => navigate({ to: '/dashboard' })}
        className="flex items-center gap-1 text-sm text-[#0a5dcf] font-medium hover:opacity-70 mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to dashboard
      </button>

      <div className="bg-white border border-gray-200 rounded-[10px] overflow-hidden">
        <div className="px-6 py-5">
          <h1 className="text-[18px] font-bold text-[#2e3240]">Scan history</h1>
        </div>

        {!websiteId ? (
          <p className="text-sm text-gray-400 text-center py-16">No website selected</p>
        ) : isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
          </div>
        ) : !history || history.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-16">No scan history found</p>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-[#f2f3f8]">
                  <th className="text-left text-[13px] font-medium text-[#2e3240] px-5 py-3">Scan date and time</th>
                  <th className="text-left text-[13px] font-medium text-[#2e3240] px-5 py-3">Scan URL</th>
                  <th className="text-left text-[13px] font-medium text-[#2e3240] px-5 py-3 w-36">Status</th>
                  <th className="text-left text-[13px] font-medium text-[#2e3240] px-5 py-3 w-36">Pages scanned</th>
                  <th className="text-left text-[13px] font-medium text-[#2e3240] px-5 py-3 w-36">Issues detected</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((item, idx) => (
                  <tr key={item.scan_job_id} className="border-t border-gray-100">
                    <td className="px-5 py-4 text-sm text-[#2e3240]">{formatDate(item.scanned_at ?? item.created_at ?? '')}</td>
                    <td className="px-5 py-4 text-sm text-[#2e3240] max-w-[220px]">
                      {jobQueries[idx]?.isLoading
                        ? <span className="text-gray-300">…</span>
                        : <span className="block truncate">{getScanUrl(idx) ?? '—'}</span>
                      }
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn(
                        'inline-flex px-3 py-0.5 rounded-full text-[13px] font-medium border',
                        item.status === 'completed'
                          ? 'bg-green-50 text-green-700 border-green-300'
                          : item.status === 'cancelled'
                          ? 'bg-gray-50 text-gray-500 border-gray-300'
                          : item.status === 'failed'
                          ? 'bg-red-50 text-red-600 border-red-300'
                          : 'bg-gray-50 text-gray-500 border-gray-200'
                      )}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#2e3240]">
                      {item.pages_scanned != null ? item.pages_scanned : '—'}
                    </td>
                    <td className="px-5 py-4 text-sm text-[#2e3240]">
                      {item.issues_detected != null ? item.issues_detected : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-center gap-1 py-5 border-t border-gray-100">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm text-[#2e3240] hover:bg-gray-50 rounded-[6px] disabled:opacity-40"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    'w-8 h-8 text-sm rounded-[6px] font-medium',
                    p === page
                      ? 'bg-[#2563eb] text-white'
                      : 'text-[#2e3240] hover:bg-gray-50'
                  )}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm text-[#2e3240] hover:bg-gray-50 rounded-[6px] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
