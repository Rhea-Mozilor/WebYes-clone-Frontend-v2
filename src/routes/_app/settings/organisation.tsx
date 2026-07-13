import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Plus,
  Users,
  Globe,
  ExternalLink,
  MoreVertical,
  Pencil,
  FileText,
} from 'lucide-react'
import { cn } from '../../../lib/utils'
import {
  listOrganisations,
  createOrganisation,
  updateOrganisation,
  getOrganisation,
  listOrgMembers,
  addOrgMember,
  removeOrgMember,
  type Organisation,
  type OrgMember,
  type OrgRole,
} from '../../../api/organisations'
import { listWebsites, transferWebsite, createWebsite, renameWebsite, deleteWebsite } from '../../../api/websites'
import { useSiteStore } from '../../../store/siteStore'

export const Route = createFileRoute('/_app/settings/organisation')({
  component: OrganisationPage,
})

function Spinner() {
  return (
    <svg className="w-5 h-5 animate-spin text-[#0b66e4]" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Add member modal (centered overlay)
// ---------------------------------------------------------------------------

type AddMemberType = 'existing' | 'invite'

const MEMBER_TYPE_OPTIONS = [
  { key: 'existing' as AddMemberType, label: 'Add team member', desc: 'Add an existing team member' },
  { key: 'invite' as AddMemberType, label: 'Invite new user', desc: 'Invite someone new to join your organisation' },
] as const

const MEMBER_ROLE_OPTIONS = [
  { value: 'admin' as const, label: 'Admin', desc: 'Can manage sites and users within the organisation' },
  { value: 'viewer' as const, label: 'Viewer', desc: 'Can only view the dashboard and download scan reports.' },
]

function AddMemberModal({
  orgId,
  orgName,
  onBack,
  onClose,
}: {
  orgId: string
  orgName: string
  onBack: () => void
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [type, setType] = useState<AddMemberType>('existing')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Exclude<OrgRole, 'owner'>>('admin')

  const addMutation = useMutation({
    mutationFn: () => addOrgMember(orgId, email.trim(), role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-members', orgId] })
      qc.invalidateQueries({ queryKey: ['organisations'] })
      setEmail('')
      onBack()
    },
  })

  return (
    <div className="absolute inset-0 z-10 bg-[#f5f7fa] flex flex-col">
      {/* Header */}
      <div className="bg-white px-6 py-5 border-b border-[#e5e7eb] flex items-start justify-between gap-4 shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <button
              onClick={onBack}
              className="text-[#73767f] hover:text-[#2e3240] transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-[18px] font-bold text-[#2e3240]">Add new member</h3>
          </div>
          <p className="text-[14px] text-[#73767f] pl-7">
            Add a new member to <span className="font-bold text-[#2e3240]">{orgName}</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors shrink-0"
        >
          <X className="w-5 h-5 text-[#73767f]" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {/* Type toggle */}
        <div className="flex gap-3">
          {MEMBER_TYPE_OPTIONS.map(({ key, label, desc }) => (
            <button
              key={key}
              onClick={() => setType(key)}
              className={cn(
                'flex-1 px-4 py-3.5 rounded-[10px] border-2 text-left transition-all flex items-start gap-3 bg-white',
                type === key ? 'border-[#0b66e4]' : 'border-[#e5e7eb] hover:border-[#c1c4cc]',
              )}
            >
              <span className={cn(
                'mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                type === key ? 'border-[#0b66e4]' : 'border-[#d1d5db]',
              )}>
                {type === key && <span className="w-2 h-2 rounded-full bg-[#0b66e4]" />}
              </span>
              <div>
                <p className="text-[13px] font-semibold text-[#2e3240]">{label}</p>
                <p className="text-[12px] text-[#9fa1a7] mt-0.5">{desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Organisation name */}
        <div>
          <label className="block text-[14px] font-semibold text-[#2e3240] mb-2">Organisation name</label>
          <div className="w-full px-4 py-3 border border-[#d1d5db] rounded-[10px] text-[14px] text-[#2e3240] bg-white flex items-center justify-between">
            <span>{orgName}</span>
            <ChevronDown className="w-4 h-4 text-[#9fa1a7]" />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-[14px] font-semibold text-[#2e3240] mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
            autoFocus
            className="w-full px-4 py-3 border border-[#d1d5db] rounded-[10px] text-[14px] text-[#2e3240] placeholder-[#9fa1a7] bg-white focus:outline-none focus:border-[#0b66e4]"
          />
        </div>

        {/* Role */}
        <div>
          <label className="block text-[14px] font-semibold text-[#2e3240] mb-3">Role</label>
          <div className="space-y-3">
            {MEMBER_ROLE_OPTIONS.map((r) => (
              <label key={r.value} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="add-member-role"
                  value={r.value}
                  checked={role === r.value}
                  onChange={() => setRole(r.value)}
                  className="mt-0.5 accent-[#0b66e4]"
                />
                <div>
                  <p className="text-[14px] font-medium text-[#2e3240]">{r.label}</p>
                  <p className="text-[13px] text-[#9fa1a7]">{r.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-[#e5e7eb] px-6 py-4 flex gap-3 justify-end shrink-0">
        <button
          onClick={onBack}
          className="px-5 py-2.5 border border-[#d1d5db] rounded-[8px] text-[14px] font-medium text-[#73767f] hover:bg-[#f5f7fa] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => addMutation.mutate()}
          disabled={!email.trim() || addMutation.isPending}
          className="px-5 py-2.5 bg-[#0b66e4] hover:bg-[#0952c6] disabled:opacity-50 text-white text-[14px] font-medium rounded-[8px] transition-colors"
        >
          {addMutation.isPending ? 'Adding…' : 'Add member'}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Member panel (right slide-in)
// ---------------------------------------------------------------------------

function MemberPanel({ org, onClose }: { org: Organisation; onClose: () => void }) {
  const qc = useQueryClient()
  const [addModalOpen, setAddModalOpen] = useState(false)

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['org-members', org.id],
    queryFn: () => listOrgMembers(org.id),
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeOrgMember(org.id, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-members', org.id] })
      qc.invalidateQueries({ queryKey: ['organisations'] })
    },
  })

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 z-50 w-[700px] bg-white shadow-2xl border-l border-[#e5e7eb] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-[#e5e7eb]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-[20px] font-semibold text-[#2e3240]">Manage team members</h3>
              <p className="text-[14px] text-[#9fa1a7] mt-1">Add or remove team members</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setAddModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0b66e4] hover:bg-[#0952c6] text-white text-[14px] font-medium rounded-[8px] transition-colors whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Add member +
              </button>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-[#73767f]" />
              </button>
            </div>
          </div>
        </div>

        {/* Org context row */}
        <div className="flex items-center gap-4 px-8 py-4 border-b border-[#e5e7eb] bg-[#f9fafb]">
          <div className="w-10 h-10 rounded-[8px] bg-[#e5e7eb] flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-[#73767f]" />
          </div>
          <div>
            <p className="text-[15px] font-medium text-[#2e3240]">{org.name}</p>
            <p className="text-[13px] text-[#9fa1a7]">
              {org.member_count} team member{org.member_count !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[1fr_120px_130px] gap-3 px-8 py-3.5 bg-[#f9fafb] border-b border-[#e5e7eb]">
          <span className="text-[13px] font-semibold text-[#9fa1a7] uppercase tracking-wide">Email address</span>
          <span className="text-[13px] font-semibold text-[#9fa1a7] uppercase tracking-wide">Role</span>
          <span className="text-[13px] font-semibold text-[#9fa1a7] uppercase tracking-wide">Status</span>
        </div>

        {/* Add member sub-panel */}
        {addModalOpen && (
          <AddMemberModal
            orgId={org.id}
            orgName={org.name}
            onBack={() => setAddModalOpen(false)}
            onClose={() => { setAddModalOpen(false); onClose() }}
          />
        )}

        {/* Members list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Users className="w-10 h-10 text-[#d1d5db]" />
              <p className="text-[15px] text-[#9fa1a7]">No members yet</p>
            </div>
          ) : (
            members.map((m: OrgMember) => (
              <div
                key={m.user_id}
                className="grid grid-cols-[1fr_120px_130px] gap-3 items-center px-8 py-5 border-b border-[#f0f2f5] last:border-0 hover:bg-[#fafbfc] group"
              >
                <span className="text-[15px] font-medium text-[#2e3240] truncate">{m.email}</span>
                <span className="text-[14px] font-medium text-[#2e3240] capitalize">
                  {m.role}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-[14px] text-[#22c55e] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#22c55e] inline-block" />
                    Assigned
                  </span>
                  {m.role !== 'owner' && (
                    <button
                      onClick={() => removeMutation.mutate(m.user_id)}
                      disabled={removeMutation.isPending}
                      className="opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center rounded hover:bg-red-50 text-[#9fa1a7] hover:text-red-500 transition-all"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>,
    document.body
  )
}

// ---------------------------------------------------------------------------
// Website three-dot menu
// ---------------------------------------------------------------------------

function WebsiteMenu({
  websiteId,
  websiteName,
  currentOrgId,
}: {
  websiteId: string
  websiteName: string
  currentOrgId: string
}) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [nameInput, setNameInput] = useState(websiteName)
  const [targetOrgId, setTargetOrgId] = useState('')
  const qc = useQueryClient()

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['org-detail'] })
    qc.invalidateQueries({ queryKey: ['organisations'] })
    qc.invalidateQueries({ queryKey: ['websites'] })
  }

  const renameMutation = useMutation({
    mutationFn: () => renameWebsite(websiteId, nameInput.trim()),
    onSuccess: () => { invalidate(); setEditOpen(false) },
  })

  const transferMutation = useMutation({
    mutationFn: () => transferWebsite(websiteId, targetOrgId || null),
    onSuccess: () => { invalidate(); setTransferOpen(false); setTargetOrgId('') },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteWebsite(websiteId),
    onSuccess: () => { invalidate(); setDeleteOpen(false) },
  })

  const { data: orgs = [] } = useQuery({
    queryKey: ['organisations'],
    queryFn: listOrganisations,
    enabled: transferOpen,
  })

  const otherOrgs = orgs.filter((o) => o.id !== currentOrgId)

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={(e) => {
            e.stopPropagation()
            if (buttonRef.current) {
              const rect = buttonRef.current.getBoundingClientRect()
              setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
            }
            setOpen(!open)
          }}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#f0f2f5] text-[#9fa1a7] hover:text-[#73767f] transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
            <div
              className="fixed z-[101] w-[180px] bg-white rounded-[10px] shadow-lg border border-[#e5e7eb] py-1"
              style={{ top: menuPos.top, right: menuPos.right }}
            >
              <button
                onClick={() => { setNameInput(websiteName); setEditOpen(true); setOpen(false) }}
                className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-[#2e3240] hover:bg-[#f5f7fa] transition-colors"
              >
                Edit website name
              </button>
              <button
                onClick={() => { setTransferOpen(true); setOpen(false) }}
                className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-[#2e3240] hover:bg-[#f5f7fa] transition-colors"
              >
                Transfer
              </button>
              <button
                onClick={() => { setDeleteOpen(true); setOpen(false) }}
                className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                Delete website
              </button>
            </div>
          </>
        )}
      </div>

      {/* Edit name modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-[12px] shadow-xl w-[420px]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
              <h3 className="text-[15px] font-semibold text-[#2e3240]">Edit website name</h3>
              <button onClick={() => setEditOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-[#73767f]" />
              </button>
            </div>
            <div className="px-6 py-5">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && nameInput.trim()) renameMutation.mutate() }}
                autoFocus
                className="w-full px-3 py-2.5 border border-[#d1d5db] rounded-[6px] text-[13px] focus:outline-none focus:border-[#0b66e4] focus:ring-1 focus:ring-[#0b66e4]"
              />
            </div>
            <div className="px-6 py-4 border-t border-[#e5e7eb] flex gap-3 justify-end">
              <button onClick={() => setEditOpen(false)} className="px-4 py-2 border border-[#d1d5db] rounded-[6px] text-[13px] font-medium text-[#73767f] hover:bg-[#f5f7fa] transition-colors">Cancel</button>
              <button
                onClick={() => renameMutation.mutate()}
                disabled={!nameInput.trim() || renameMutation.isPending}
                className="px-4 py-2 bg-[#0b66e4] hover:bg-[#0952c6] disabled:opacity-50 text-white text-[13px] font-medium rounded-[6px] transition-colors"
              >
                {renameMutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer modal */}
      {transferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-[12px] shadow-xl w-[420px]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
              <h3 className="text-[15px] font-semibold text-[#2e3240]">Transfer website</h3>
              <button onClick={() => setTransferOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-[#73767f]" />
              </button>
            </div>
            <div className="px-6 py-5">
              <label className="block text-[12px] font-semibold text-[#9fa1a7] uppercase tracking-wide mb-1.5">Transfer to organisation</label>
              <select
                value={targetOrgId}
                onChange={(e) => setTargetOrgId(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#d1d5db] rounded-[6px] text-[13px] text-[#2e3240] focus:outline-none focus:border-[#0b66e4] bg-white"
              >
                <option value="">Select organisation…</option>
                {otherOrgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div className="px-6 py-4 border-t border-[#e5e7eb] flex gap-3 justify-end">
              <button onClick={() => setTransferOpen(false)} className="px-4 py-2 border border-[#d1d5db] rounded-[6px] text-[13px] font-medium text-[#73767f] hover:bg-[#f5f7fa] transition-colors">Cancel</button>
              <button
                onClick={() => transferMutation.mutate()}
                disabled={!targetOrgId || transferMutation.isPending}
                className="px-4 py-2 bg-[#0b66e4] hover:bg-[#0952c6] disabled:opacity-50 text-white text-[13px] font-medium rounded-[6px] transition-colors"
              >
                {transferMutation.isPending ? 'Transferring…' : 'Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-[16px] shadow-xl w-[460px] p-8">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h3 className="text-[18px] font-bold text-[#2e3240]">Delete {websiteName}?</h3>
              <button onClick={() => setDeleteOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors shrink-0">
                <X className="w-4 h-4 text-[#73767f]" />
              </button>
            </div>
            <p className="text-[14px] text-[#73767f] mb-8">
              This will permanently delete <span className="font-bold text-[#2e3240]">{websiteName}</span> and all its scan data. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteOpen(false)} className="px-6 py-2.5 rounded-[10px] border border-[#d1d5db] text-[14px] font-semibold text-[#0b66e4] hover:bg-[#f5f7fa] transition-colors">No</button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="px-6 py-2.5 rounded-[10px] bg-[#b91c1c] hover:bg-[#991b1b] disabled:opacity-50 text-white text-[14px] font-semibold transition-colors"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Org card (expandable)
// ---------------------------------------------------------------------------

function OrgCard({ org }: { org: Organisation }) {
  const navigate = useNavigate()
  const setWebsiteId = useSiteStore((s) => s.setWebsiteId)

  const [expanded, setExpanded] = useState(false)
  const [memberPanelOpen, setMemberPanelOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(org.name)
  const [addWebsiteOpen, setAddWebsiteOpen] = useState(false)
  const [addWebsiteMode, setAddWebsiteMode] = useState<'existing' | 'new'>('existing')
  const [selectedWebsiteId, setSelectedWebsiteId] = useState('')
  const [newWebsiteName, setNewWebsiteName] = useState('')
  const [newWebsiteUrl, setNewWebsiteUrl] = useState('')
  const qc = useQueryClient()

  const { data: orgDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['org-detail', org.id],
    queryFn: () => getOrganisation(org.id),
    enabled: expanded,
  })

  const { data: allWebsites = [] } = useQuery({
    queryKey: ['websites'],
    queryFn: listWebsites,
    enabled: addWebsiteOpen && addWebsiteMode === 'existing',
  })

  const orgWebsites = orgDetail?.websites ?? []
  const unassignedWebsites = allWebsites.filter((w) => !orgWebsites.find((ow) => ow.id === w.id))

  const renameMutation = useMutation({
    mutationFn: () => updateOrganisation(org.id, nameInput.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organisations'] })
      setEditingName(false)
    },
  })

  const transferMutation = useMutation({
    mutationFn: () => transferWebsite(selectedWebsiteId, org.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-detail', org.id] })
      qc.invalidateQueries({ queryKey: ['organisations'] })
      qc.invalidateQueries({ queryKey: ['websites'] })
      setAddWebsiteOpen(false)
      setSelectedWebsiteId('')
    },
  })

  const createMutation = useMutation({
    mutationFn: () => createWebsite(newWebsiteName.trim(), newWebsiteUrl.trim()),
    onSuccess: async (created) => {
      await transferWebsite(created.id, org.id)
      qc.invalidateQueries({ queryKey: ['org-detail', org.id] })
      qc.invalidateQueries({ queryKey: ['organisations'] })
      qc.invalidateQueries({ queryKey: ['websites'] })
      setAddWebsiteOpen(false)
      setNewWebsiteName('')
      setNewWebsiteUrl('')
    },
  })

  const fmtDate = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Never'

  return (
    <>
      <div className="bg-white border border-[#e5e7eb] rounded-[10px] overflow-hidden">
        {/* Card header */}
        <div className="flex items-center gap-4 px-6 py-5">
          <div className="w-12 h-12 rounded-[10px] bg-[#f0f2f5] flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-[#73767f]" />
          </div>

          <div className="flex-1 min-w-0">
            {editingName ? (
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && nameInput.trim()) renameMutation.mutate()
                  if (e.key === 'Escape') {
                    setEditingName(false)
                    setNameInput(org.name)
                  }
                }}
                onBlur={() => {
                  if (nameInput.trim() && nameInput !== org.name) renameMutation.mutate()
                  else setEditingName(false)
                }}
                autoFocus
                className="text-[17px] font-semibold text-[#2e3240] border-b border-[#0b66e4] focus:outline-none bg-transparent w-full"
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[17px] font-semibold text-[#2e3240] truncate">{org.name}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#f0f2f5] text-[12px] font-medium text-[#73767f] capitalize shrink-0">
                  {org.user_role}
                </span>
              </div>
            )}
            <p className="text-[13px] text-[#9fa1a7] mt-0.5">
              {org.website_count} website{org.website_count !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setMemberPanelOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-[8px] border border-[#d1d5db] text-[13px] font-medium text-[#73767f] hover:bg-[#f5f7fa] hover:border-[#b0b8c4] transition-colors"
            >
              <Users className="w-4 h-4" />
              {org.member_count} team member{org.member_count !== 1 ? 's' : ''}
            </button>
            <button
              onClick={() => {
                setEditingName(true)
                setNameInput(org.name)
              }}
              className="w-9 h-9 flex items-center justify-center rounded-[6px] hover:bg-[#f0f2f5] text-[#9fa1a7] hover:text-[#73767f] transition-colors"
              title="Rename"
            >
              <Pencil className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-9 h-9 flex items-center justify-center rounded-[6px] hover:bg-[#f0f2f5] text-[#73767f] transition-colors"
            >
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Expanded website table */}
        {expanded && (
          <div className="border-t border-[#e5e7eb]">
            <div className="grid grid-cols-[1fr_200px_110px_150px_40px] gap-3 px-6 py-3 bg-[#f9fafb] border-b border-[#e5e7eb]">
              <span className="text-[12px] font-semibold text-[#9fa1a7] uppercase tracking-wide">Website</span>
              <span className="text-[12px] font-semibold text-[#9fa1a7] uppercase tracking-wide">URL</span>
              <span className="text-[12px] font-semibold text-[#9fa1a7] uppercase tracking-wide">Credits used</span>
              <span />
              <span />
            </div>

            {loadingDetail ? (
              <div className="flex items-center justify-center py-8">
                <Spinner />
              </div>
            ) : orgWebsites.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-[13px] text-[#9fa1a7]">No websites yet</p>
              </div>
            ) : (
              orgWebsites.map((w) => (
                <div
                  key={w.id}
                  className="grid grid-cols-[1fr_200px_110px_150px_40px] gap-3 items-center px-6 py-4 border-b border-[#f0f2f5] last:border-0 hover:bg-[#fafbfc]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-[8px] bg-[#f0f2f5] flex items-center justify-center shrink-0">
                      <Globe className="w-4.5 h-4.5 text-[#73767f]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[#2e3240] truncate">{w.name}</p>
                      <p className="text-[12px] text-[#9fa1a7]">Last audit: {fmtDate(w.last_scanned_at)}</p>
                    </div>
                  </div>

                  <a
                    href={w.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[13px] text-[#0b66e4] hover:underline min-w-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="truncate">{w.url}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>

                  <span className="text-[14px] text-[#73767f]">{w.credits_used ?? '—'}</span>

                  <button
                    onClick={() => {
                      setWebsiteId(w.id)
                      void navigate({ to: '/dashboard' })
                    }}
                    className="px-3.5 py-2 rounded-[8px] border border-[#d1d5db] text-[13px] font-medium text-[#2e3240] hover:bg-[#f5f7fa] hover:border-[#b0b8c4] transition-colors whitespace-nowrap"
                  >
                    Go to dashboard
                  </button>

                  <WebsiteMenu
                    websiteId={w.id}
                    websiteName={w.name}
                    currentOrgId={org.id}
                  />
                </div>
              ))
            )}

            {/* Add website inside card */}
            <div className="px-6 py-4 border-t border-[#e5e7eb] bg-[#fafbfc]">
              {addWebsiteOpen ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {(['existing', 'new'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setAddWebsiteMode(m)}
                        className={cn(
                          'px-3 py-1.5 rounded-[6px] text-[12px] font-medium transition-colors',
                          addWebsiteMode === m
                            ? 'bg-[#0b66e4] text-white'
                            : 'border border-[#d1d5db] text-[#73767f] hover:bg-[#f5f7fa]',
                        )}
                      >
                        {m === 'existing' ? 'Existing website' : 'New website'}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setAddWebsiteOpen(false)
                        setSelectedWebsiteId('')
                        setNewWebsiteName('')
                        setNewWebsiteUrl('')
                      }}
                      className="ml-auto w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-[#9fa1a7]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {addWebsiteMode === 'existing' ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedWebsiteId}
                        onChange={(e) => setSelectedWebsiteId(e.target.value)}
                        className="flex-1 px-3 py-2 border border-[#d1d5db] rounded-[6px] text-[13px] text-[#2e3240] focus:outline-none focus:border-[#0b66e4] bg-white"
                      >
                        <option value="">Select a website…</option>
                        {unassignedWebsites.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} — {w.url}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => transferMutation.mutate()}
                        disabled={!selectedWebsiteId || transferMutation.isPending}
                        className="px-3 py-2 bg-[#0b66e4] hover:bg-[#0952c6] disabled:opacity-50 text-white text-[13px] font-medium rounded-[6px] transition-colors"
                      >
                        {transferMutation.isPending ? 'Adding…' : 'Add'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newWebsiteName}
                        onChange={(e) => setNewWebsiteName(e.target.value)}
                        placeholder="Website name"
                        className="w-full px-3 py-2 border border-[#d1d5db] rounded-[6px] text-[13px] focus:outline-none focus:border-[#0b66e4]"
                      />
                      <input
                        type="url"
                        value={newWebsiteUrl}
                        onChange={(e) => setNewWebsiteUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full px-3 py-2 border border-[#d1d5db] rounded-[6px] text-[13px] focus:outline-none focus:border-[#0b66e4]"
                      />
                      <button
                        onClick={() => createMutation.mutate()}
                        disabled={!newWebsiteName.trim() || !newWebsiteUrl.trim() || createMutation.isPending}
                        className="px-3 py-2 bg-[#0b66e4] hover:bg-[#0952c6] disabled:opacity-50 text-white text-[13px] font-medium rounded-[6px] transition-colors"
                      >
                        {createMutation.isPending ? 'Creating…' : 'Create & add'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setAddWebsiteOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-[8px] border border-[#0b66e4] text-[14px] font-medium text-[#0b66e4] hover:bg-[#eef4ff] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add website +
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {memberPanelOpen && <MemberPanel org={org} onClose={() => setMemberPanelOpen(false)} />}
    </>
  )
}

// ---------------------------------------------------------------------------
// Add org modal
// ---------------------------------------------------------------------------

function AddOrgModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')

  const createMutation = useMutation({
    mutationFn: () => createOrganisation(name.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organisations'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-[12px] shadow-xl w-[440px]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
          <h3 className="text-[15px] font-semibold text-[#2e3240]">Add organisation</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-[#73767f]" />
          </button>
        </div>
        <div className="px-6 py-5">
          <label className="block text-[12px] font-semibold text-[#9fa1a7] uppercase tracking-wide mb-1.5">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) createMutation.mutate()
            }}
            placeholder="Organisation name"
            autoFocus
            className="w-full px-3 py-2.5 border border-[#d1d5db] rounded-[6px] text-[13px] focus:outline-none focus:border-[#0b66e4] focus:ring-1 focus:ring-[#0b66e4]"
          />
        </div>
        <div className="px-6 py-4 border-t border-[#e5e7eb] flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#d1d5db] rounded-[6px] text-[13px] font-medium text-[#73767f] hover:bg-[#f5f7fa] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => createMutation.mutate()}
            disabled={!name.trim() || createMutation.isPending}
            className="px-4 py-2 bg-[#0b66e4] hover:bg-[#0952c6] disabled:opacity-50 text-white text-[13px] font-medium rounded-[6px] transition-colors"
          >
            {createMutation.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add website modal (global, top-level button)
// ---------------------------------------------------------------------------

function AddWebsiteModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')

  const createMutation = useMutation({
    mutationFn: () => createWebsite(name.trim(), url.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['websites'] })
      qc.invalidateQueries({ queryKey: ['organisations'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-[12px] shadow-xl w-[440px]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
          <h3 className="text-[15px] font-semibold text-[#2e3240]">Add website</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-[#73767f]" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-[#9fa1a7] uppercase tracking-wide mb-1.5">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My website"
              autoFocus
              className="w-full px-3 py-2.5 border border-[#d1d5db] rounded-[6px] text-[13px] focus:outline-none focus:border-[#0b66e4] focus:ring-1 focus:ring-[#0b66e4]"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#9fa1a7] uppercase tracking-wide mb-1.5">
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2.5 border border-[#d1d5db] rounded-[6px] text-[13px] focus:outline-none focus:border-[#0b66e4] focus:ring-1 focus:ring-[#0b66e4]"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-[#e5e7eb] flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#d1d5db] rounded-[6px] text-[13px] font-medium text-[#73767f] hover:bg-[#f5f7fa] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => createMutation.mutate()}
            disabled={!name.trim() || !url.trim() || createMutation.isPending}
            className="px-4 py-2 bg-[#0b66e4] hover:bg-[#0952c6] disabled:opacity-50 text-white text-[13px] font-medium rounded-[6px] transition-colors"
          >
            {createMutation.isPending ? 'Creating…' : 'Create website'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function OrganisationPage() {
  const [search, setSearch] = useState('')
  const [addOrgOpen, setAddOrgOpen] = useState(false)
  const [addWebsiteOpen, setAddWebsiteOpen] = useState(false)

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['organisations'],
    queryFn: listOrganisations,
  })

  const filtered = orgs.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex flex-col min-h-full p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-semibold text-[#2e3240] tracking-[-0.5px]">
          Organisations & websites
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAddOrgOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] border border-[#0b66e4] text-[14px] font-medium text-[#0b66e4] hover:bg-[#eef4ff] transition-colors"
          >
            Add organisation +
          </button>
          <button
            onClick={() => setAddWebsiteOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#0b66e4] hover:bg-[#0952c6] text-white text-[14px] font-medium transition-colors"
          >
            Add website +
          </button>
        </div>
      </div>

      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by organisation"
          className="w-full max-w-[360px] px-4 py-3 border border-[#d1d5db] rounded-[8px] text-[14px] text-[#2e3240] placeholder-[#9fa1a7] focus:outline-none focus:border-[#0b66e4] focus:ring-1 focus:ring-[#0b66e4]"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-12 h-12 rounded-full bg-[#f0f2f5] flex items-center justify-center">
            <Users className="w-6 h-6 text-[#9fa1a7]" />
          </div>
          <p className="text-[14px] font-medium text-[#2e3240]">
            {orgs.length === 0 ? 'No organisations yet' : 'No results'}
          </p>
          <p className="text-[13px] text-[#73767f]">
            {orgs.length === 0
              ? 'Create your first organisation to get started.'
              : 'Try a different search term.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((org) => (
            <OrgCard key={org.id} org={org} />
          ))}
        </div>
      )}

      {addOrgOpen && <AddOrgModal onClose={() => setAddOrgOpen(false)} />}
      {addWebsiteOpen && <AddWebsiteModal onClose={() => setAddWebsiteOpen(false)} />}
    </div>
  )
}
