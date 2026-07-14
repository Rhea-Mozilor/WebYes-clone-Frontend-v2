import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, ChevronDown } from 'lucide-react'
import { createWebsite, transferWebsite } from '../api/websites'
import { triggerScan } from '../api/scans'
import { type Organisation } from '../api/organisations'
import { useSiteStore } from '../store/siteStore'

export function AddNewWebsiteModal({
  orgs,
  onClose,
}: {
  orgs: Organisation[]
  onClose: () => void
}) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const setWebsiteId = useSiteStore((s) => s.setWebsiteId)
  const setPendingScan = useSiteStore((s) => s.setPendingScan)
  const strategy = useSiteStore((s) => s.strategy)
  const [orgId, setOrgId] = useState('')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [createdUrl, setCreatedUrl] = useState('')
  const [scanning, setScanning] = useState(false)

  const adminOrgs = orgs.filter((o) => (o.user_role as string).toLowerCase() !== 'viewer')

  const createMutation = useMutation({
    mutationFn: async () => {
      const created = await createWebsite(name.trim() || url.trim(), url.trim())
      if (orgId) await transferWebsite(created.id, orgId)
      return created
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['websites'] })
      qc.invalidateQueries({ queryKey: ['organisations'] })
      qc.invalidateQueries({ queryKey: ['org-detail'] })
      setCreatedId(created.id)
      setCreatedUrl(created.url ?? url.trim())
    },
  })

  if (createdId) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
        <div className="bg-white rounded-[20px] shadow-xl w-[520px] px-10 py-10">
          <div className="flex items-start gap-5 mb-6">
            <div className="w-14 h-14 rounded-[14px] bg-[#dcfce7] flex items-center justify-center shrink-0">
              <svg className="w-7 h-7 text-[#16a34a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-[20px] font-bold text-[#2e3240] leading-snug">Website added successfully</h3>
              <p className="text-[14px] text-[#73767f] mt-1.5 leading-relaxed">
                Your website has been added. You can start a scan now or initiate it later from the dashboard.
              </p>
            </div>
          </div>
          <div className="flex gap-3 justify-end mt-8">
            <button
              onClick={onClose}
              className="px-6 py-2.5 border border-[#d1d5db] rounded-[10px] text-[14px] font-medium text-[#2e3240] hover:bg-[#f5f7fa] transition-colors"
            >
              Scan later
            </button>
            <button
              disabled={scanning}
              onClick={async () => {
                if (!createdId) return
                setScanning(true)
                try {
                  const job = await triggerScan(createdId)
                  const desktopId = job.desktop_scan_job_id ?? (strategy === 'desktop' ? job.scan_job_id : null) ?? null
                  const mobileId = job.mobile_scan_job_id ?? (strategy === 'mobile' ? job.scan_job_id : null) ?? null
                  setPendingScan({
                    desktopJobId: desktopId ? String(desktopId) : null,
                    mobileJobId: mobileId ? String(mobileId) : null,
                    url: createdUrl,
                    websiteName: name.trim() || createdUrl,
                    websiteId: createdId,
                  })
                  setWebsiteId(createdId)
                } catch { /* AppLayout will show an error if job IDs are missing */ }
                onClose()
                void navigate({ to: '/dashboard' })
              }}
              className="px-6 py-2.5 bg-[#0b66e4] hover:bg-[#0952c6] disabled:opacity-50 text-white text-[14px] font-semibold rounded-[10px] transition-colors"
            >
              {scanning ? 'Starting…' : 'Scan now'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-[20px] shadow-xl w-[740px]">
        <div className="flex items-center justify-between px-8 pt-8 pb-6">
          <h3 className="text-[22px] font-bold text-[#2e3240]">Add new website</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-[#73767f]" />
          </button>
        </div>

        <div className="px-8 pb-6 space-y-6">
          <div>
            <label className="block text-[15px] font-semibold text-[#2e3240] mb-2">
              Organisation <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                className="w-full px-4 py-3.5 border border-[#d1d5db] rounded-[10px] text-[14px] text-[#2e3240] bg-white appearance-none focus:outline-none focus:border-[#0b66e4] focus:ring-1 focus:ring-[#0b66e4]"
              >
                <option value="">Please select</option>
                {adminOrgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9fa1a7] pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[15px] font-semibold text-[#2e3240] mb-2">Website name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Website name"
                className="w-full px-4 py-3.5 border border-[#d1d5db] rounded-[10px] text-[14px] text-[#2e3240] placeholder-[#9fa1a7] focus:outline-none focus:border-[#0b66e4] focus:ring-1 focus:ring-[#0b66e4]"
              />
            </div>
            <div>
              <label className="block text-[15px] font-semibold text-[#2e3240] mb-2">
                Website URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="www.example.com"
                autoFocus
                className="w-full px-4 py-3.5 border border-[#d1d5db] rounded-[10px] text-[14px] text-[#2e3240] placeholder-[#9fa1a7] focus:outline-none focus:border-[#0b66e4] focus:ring-1 focus:ring-[#0b66e4]"
              />
            </div>
          </div>
        </div>

        <div className="px-8 pb-8 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 border border-[#d1d5db] rounded-[10px] text-[15px] font-medium text-[#73767f] hover:bg-[#f5f7fa] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => createMutation.mutate()}
            disabled={!orgId || !url.trim() || createMutation.isPending}
            className="px-8 py-3 bg-[#0b66e4] hover:bg-[#0952c6] disabled:opacity-50 text-white text-[15px] font-semibold rounded-[10px] transition-colors"
          >
            {createMutation.isPending ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}
