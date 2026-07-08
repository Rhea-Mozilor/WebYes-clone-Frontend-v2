import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, ScanLine, Loader2, Globe } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from '@tanstack/react-router'
import { getWebsite } from '../../../api/websites'
import { triggerScan } from '../../../api/scans'

export const Route = createFileRoute('/_app/websites/$websiteId')({
  component: WebsiteDetailPage,
})

function WebsiteDetailPage() {
  const { websiteId } = Route.useParams()
  const navigate = useNavigate()

  const { data: website, isLoading: loadingWebsite } = useQuery({
    queryKey: ['website', websiteId],
    queryFn: () => getWebsite(websiteId),
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
          <div className="w-12 h-12 bg-blue-50 rounded-sm flex items-center justify-center">
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
              className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-sm transition-colors disabled:opacity-50 capitalize"
            >
              <ScanLine className="w-4 h-4" />
              Scan {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
