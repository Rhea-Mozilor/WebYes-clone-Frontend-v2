import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, ScanLine, Clock, CheckCircle2, XCircle, Loader2, Globe } from 'lucide-react'
import toast from 'react-hot-toast'
import { getWebsite } from '../../../api/websites'
import { getWebsiteScanHistory, triggerScan } from '../../../api/scans'
import type { ScanStatus } from '../../../types'

export const Route = createFileRoute('/_app/websites/$websiteId')({
  component: WebsiteDetailPage,
})

const statusConfig: Record<ScanStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  completed: { icon: CheckCircle2, color: 'text-green-500', label: 'Completed' },
  running: { icon: Loader2, color: 'text-blue-500', label: 'Running' },
  pending: { icon: Clock, color: 'text-amber-500', label: 'Pending' },
  failed: { icon: XCircle, color: 'text-red-500', label: 'Failed' },
}


function WebsiteDetailPage() {
  const { websiteId } = Route.useParams()
  const navigate = useNavigate()

  const { data: website, isLoading: loadingWebsite } = useQuery({
    queryKey: ['website', websiteId],
    queryFn: () => getWebsite(websiteId),
  })

  const { data: history = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['scan-history', websiteId],
    queryFn: () => getWebsiteScanHistory(websiteId),
  })

  const scanMutation = useMutation({
    mutationFn: () => triggerScan(websiteId),
    onSuccess: (job) => {
      toast.success('Scan started!')
      const scanId = job.mobile_scan_job_id ?? job.desktop_scan_job_id ?? job.scan_job_id
      if (!scanId) return
      navigate({ to: '/scans/$scanId', params: { scanId } })
    },
    onError: () => toast.error('Could not start scan'),
  })

  if (loadingWebsite) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <Globe className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{website?.name}</h1>
            <a
              href={website?.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:underline"
            >
              {website?.url}
            </a>
          </div>
        </div>
        <div className="flex gap-2">
          {(['mobile', 'desktop'] as const).map((s) => (
            <button
              key={s}
              onClick={() => scanMutation.mutate()}
              disabled={scanMutation.isPending}
              className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 capitalize"
            >
              <ScanLine className="w-4 h-4" />
              Scan {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Scan History</h2>
        </div>
        {loadingHistory ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <ScanLine className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-sm text-gray-500">No scans yet. Run your first scan above.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {history.map((item) => {
              const cfg = statusConfig[item.status]
              const Icon = cfg.icon
              return (
                <div key={item.scan_job_id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                  <Icon className={`w-5 h-5 shrink-0 ${cfg.color} ${item.status === 'running' ? 'animate-spin' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 capitalize">{item.mode} scan</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(item.scanned_at).toLocaleString()}
                    </div>
                    {item.status === 'completed' && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-xs text-gray-400">Pages</span>
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{item.pages_scanned}</span>
                        <span className="text-xs text-gray-400 ml-1">Issues</span>
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">{item.issues_detected}</span>
                      </div>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                    item.status === 'completed' ? 'bg-green-50 text-green-700' :
                    item.status === 'running' ? 'bg-blue-50 text-blue-700' :
                    item.status === 'failed' ? 'bg-red-50 text-red-700' :
                    'bg-amber-50 text-amber-700'
                  }`}>
                    {cfg.label}
                  </span>
                  {item.status === 'completed' && (
                    <Link
                      to="/scans/$scanId"
                      params={{ scanId: item.scan_job_id }}
                      className="text-xs font-medium text-blue-600 hover:underline shrink-0"
                    >
                      View Results →
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
