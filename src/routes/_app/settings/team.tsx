import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Plus, Users, Building2, Search, Trash2 } from 'lucide-react'
import { cn } from '../../../lib/utils'
import {
  listTeamMembers,
  getMemberAccess,
  listOrganisations,
  addOrgMember,
  removeOrgMember,
  type TeamMember,
  type MemberAccess,
  type OrgRole,
} from '../../../api/organisations'

export const Route = createFileRoute('/_app/settings/team')({
  component: TeamPage,
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
// Invite modal (centered)
// ---------------------------------------------------------------------------

function InviteModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Exclude<OrgRole, 'owner'>>('viewer')
  const [orgId, setOrgId] = useState('')

  const { data: orgs = [] } = useQuery({
    queryKey: ['organisations'],
    queryFn: listOrganisations,
  })

  const inviteMutation = useMutation({
    mutationFn: () => addOrgMember(orgId, email.trim(), role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-members'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-[12px] shadow-xl w-[480px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
          <h3 className="text-[15px] font-semibold text-[#2e3240]">Invite new team member</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-[#73767f]" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-[12px] font-semibold text-[#9fa1a7] uppercase tracking-wide mb-1.5">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              autoFocus
              className="w-full px-3 py-2.5 border border-[#d1d5db] rounded-[6px] text-[13px] focus:outline-none focus:border-[#0b66e4] focus:ring-1 focus:ring-[#0b66e4]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#9fa1a7] uppercase tracking-wide mb-2">
              Role
            </label>
            <div className="flex flex-col gap-3">
              {(['admin', 'viewer'] as const).map((r) => (
                <label key={r} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="invite-role"
                    value={r}
                    checked={role === r}
                    onChange={() => setRole(r)}
                    className="mt-0.5 accent-[#0b66e4]"
                  />
                  <div>
                    <p className="text-[13px] font-medium text-[#2e3240] capitalize">{r}</p>
                    <p className="text-[11px] text-[#9fa1a7]">
                      {r === 'admin'
                        ? 'Full access — can manage members and websites'
                        : 'Read-only access to scan results'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#9fa1a7] uppercase tracking-wide mb-1.5">
              Organisation
            </label>
            <select
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="w-full px-3 py-2.5 border border-[#d1d5db] rounded-[6px] text-[13px] text-[#2e3240] focus:outline-none focus:border-[#0b66e4] bg-white"
            >
              <option value="">Select organisation…</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
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
            onClick={() => inviteMutation.mutate()}
            disabled={!email.trim() || !orgId || inviteMutation.isPending}
            className="px-4 py-2 bg-[#0b66e4] hover:bg-[#0952c6] disabled:opacity-50 text-white text-[13px] font-medium rounded-[6px] transition-colors"
          >
            {inviteMutation.isPending ? 'Inviting…' : 'Invite'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Manage access panel (right slide-in)
// ---------------------------------------------------------------------------

function RemoveConfirmModal({
  email,
  onConfirm,
  onCancel,
  isPending,
}: {
  email: string
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-[16px] shadow-xl w-[480px] p-8">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h3 className="text-[18px] font-bold text-[#2e3240] leading-snug">
            Remove {email} from WebYes?
          </h3>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors shrink-0 mt-0.5"
          >
            <X className="w-4 h-4 text-[#73767f]" />
          </button>
        </div>
        <p className="text-[14px] text-[#73767f] mb-8">
          Doing this will remove this member from <span className="font-bold text-[#2e3240]">WebYes</span> and all their access.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-6 py-2.5 rounded-[10px] border border-[#d1d5db] text-[14px] font-semibold text-[#0b66e4] hover:bg-[#f5f7fa] transition-colors"
          >
            No
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="px-6 py-2.5 rounded-[10px] bg-[#b91c1c] hover:bg-[#991b1b] disabled:opacity-50 text-white text-[14px] font-semibold transition-colors"
          >
            {isPending ? 'Removing…' : 'Yes, remove'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AccessPanel({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  const qc = useQueryClient()
  const [addOrgOpen, setAddOrgOpen] = useState(false)
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [selectedRole, setSelectedRole] = useState<Exclude<OrgRole, 'owner'>>('viewer')
  const [confirmRemoveOrgId, setConfirmRemoveOrgId] = useState<string | null>(null)

  const { data: access = [], isLoading } = useQuery({
    queryKey: ['member-access', member.user_id],
    queryFn: () => getMemberAccess(member.user_id),
  })

  const { data: orgs = [] } = useQuery({
    queryKey: ['organisations'],
    queryFn: listOrganisations,
    enabled: addOrgOpen,
  })

  const addMutation = useMutation({
    mutationFn: () => addOrgMember(selectedOrgId, member.email, selectedRole),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member-access', member.user_id] })
      qc.invalidateQueries({ queryKey: ['team-members'] })
      setAddOrgOpen(false)
      setSelectedOrgId('')
      setSelectedRole('viewer')
    },
  })

  const removeMutation = useMutation({
    mutationFn: (orgId: string) => removeOrgMember(orgId, member.user_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member-access', member.user_id] })
      qc.invalidateQueries({ queryKey: ['team-members'] })
      setConfirmRemoveOrgId(null)
    },
  })

  const existingOrgIds = new Set(access.map((a: MemberAccess) => a.org_id))
  const availableOrgs = orgs.filter((o) => !existingOrgIds.has(o.id))

  return (
    <>
      {confirmRemoveOrgId && (
        <RemoveConfirmModal
          email={member.email}
          isPending={removeMutation.isPending}
          onConfirm={() => removeMutation.mutate(confirmRemoveOrgId)}
          onCancel={() => setConfirmRemoveOrgId(null)}
        />
      )}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 z-50 w-[700px] bg-white shadow-2xl border-l border-[#e5e7eb] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-[#e5e7eb]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-[20px] font-semibold text-[#2e3240] truncate">
                Manage access —{' '}
                <span className="font-normal text-[#73767f]">{member.email}</span>
              </h3>
              <p className="text-[14px] text-[#9fa1a7] mt-1">
                Manage this member's access to organisations
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setAddOrgOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] border border-[#0b66e4] text-[14px] font-medium text-[#0b66e4] hover:bg-[#eef4ff] transition-colors whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Add organisation +
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

        {/* Table header */}
        <div className="grid grid-cols-[1fr_120px_120px_44px] gap-3 px-8 py-3.5 bg-[#f9fafb] border-b border-[#e5e7eb]">
          <span className="text-[13px] font-semibold text-[#9fa1a7] uppercase tracking-wide">
            Organisation
          </span>
          <span className="text-[13px] font-semibold text-[#9fa1a7] uppercase tracking-wide">Role</span>
          <span className="text-[13px] font-semibold text-[#9fa1a7] uppercase tracking-wide">Status</span>
          <span />
        </div>

        {/* Access list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : access.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Building2 className="w-10 h-10 text-[#d1d5db]" />
              <p className="text-[15px] text-[#9fa1a7]">No organisation access yet</p>
            </div>
          ) : (
            access.map((a: MemberAccess) => (
              <div
                key={a.org_id}
                className="grid grid-cols-[1fr_120px_120px_44px] gap-3 items-center px-8 py-5 border-b border-[#f0f2f5] last:border-0 hover:bg-[#fafbfc] group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-[8px] bg-[#f0f2f5] flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-[#73767f]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium text-[#2e3240] truncate">{a.org_name}</p>
                    <p className="text-[13px] text-[#9fa1a7]">
                      {a.website_count} website{a.website_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <span
                  className={cn(
                    'inline-flex items-center px-3 py-1 rounded-full text-[13px] font-medium capitalize w-fit',
                    a.role === 'owner'
                      ? 'bg-[#fdf2ff] text-[#9333ea]'
                      : a.role === 'admin'
                        ? 'bg-[#eef4ff] text-[#0b66e4]'
                        : 'bg-[#f3f4f6] text-[#73767f]',
                  )}
                >
                  {a.role}
                </span>

                <span className="text-[14px] text-[#22c55e] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#22c55e] inline-block" />
                  Assigned
                </span>

                {a.role !== 'owner' && (
                  <button
                    onClick={() => setConfirmRemoveOrgId(a.org_id)}
                    className="opacity-0 group-hover:opacity-100 w-9 h-9 flex items-center justify-center rounded hover:bg-red-50 text-[#9fa1a7] hover:text-red-500 transition-all"
                    title="Remove"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))
          )}

          {/* Add org inline form */}
          {addOrgOpen && (
            <div className="mx-6 mt-4 mb-4 p-4 bg-[#f5f7fa] border border-[#d1d5db] rounded-[8px] space-y-3">
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="w-full px-3 py-2 border border-[#d1d5db] rounded-[6px] text-[13px] text-[#2e3240] focus:outline-none focus:border-[#0b66e4] bg-white"
              >
                <option value="">Select organisation…</option>
                {availableOrgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-4">
                {(['viewer', 'admin'] as const).map((r) => (
                  <label key={r} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="access-role"
                      value={r}
                      checked={selectedRole === r}
                      onChange={() => setSelectedRole(r)}
                      className="accent-[#0b66e4]"
                    />
                    <span className="text-[13px] text-[#2e3240] capitalize">{r}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => addMutation.mutate()}
                  disabled={!selectedOrgId || addMutation.isPending}
                  className="flex-1 py-2 bg-[#0b66e4] hover:bg-[#0952c6] disabled:opacity-50 text-white text-[13px] font-medium rounded-[6px] transition-colors"
                >
                  {addMutation.isPending ? 'Adding…' : 'Add'}
                </button>
                <button
                  onClick={() => {
                    setAddOrgOpen(false)
                    setSelectedOrgId('')
                    setSelectedRole('viewer')
                  }}
                  className="px-3 py-2 border border-[#d1d5db] rounded-[6px] text-[13px] text-[#73767f] hover:bg-[#f5f7fa] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Main team page
// ---------------------------------------------------------------------------

function TeamPage() {
  const [search, setSearch] = useState('')
  const [accessMember, setAccessMember] = useState<TeamMember | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['team-members'],
    queryFn: listTeamMembers,
  })

  const filtered = members.filter((m) => m.email.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex flex-col min-h-full p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-semibold text-[#2e3240] tracking-[-0.5px]">Team management</h1>
        <button
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#0b66e4] hover:bg-[#0952c6] text-white text-[14px] font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Invite team member +
        </button>
      </div>

      {/* Search */}
      <div className="mb-6 relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#9fa1a7]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email"
          className="w-full max-w-[360px] pl-10 pr-4 py-3 border border-[#d1d5db] rounded-[8px] text-[14px] text-[#2e3240] placeholder-[#9fa1a7] focus:outline-none focus:border-[#0b66e4] focus:ring-1 focus:ring-[#0b66e4]"
        />
      </div>

      {/* Table */}
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
            {members.length === 0 ? 'No team members yet' : 'No results'}
          </p>
          <p className="text-[13px] text-[#73767f]">
            {members.length === 0
              ? 'Invite members to collaborate on your organisations.'
              : 'Try a different search term.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#e5e7eb] rounded-[10px] overflow-hidden">
          <div className="grid grid-cols-[1fr_180px_180px] gap-4 px-6 py-3.5 bg-[#f9fafb] border-b border-[#e5e7eb]">
            <span className="text-[12px] font-semibold text-[#9fa1a7] uppercase tracking-wide">
              Email address
            </span>
            <span className="text-[12px] font-semibold text-[#9fa1a7] uppercase tracking-wide">
              Organisations
            </span>
            <span className="text-[12px] font-semibold text-[#9fa1a7] uppercase tracking-wide">
              Assigned to
            </span>
          </div>
          {filtered.map((m: TeamMember) => (
            <div
              key={m.user_id}
              onClick={() => setAccessMember(m)}
              className="grid grid-cols-[1fr_180px_180px] gap-4 items-center px-6 py-5 border-b border-[#f0f2f5] last:border-0 hover:bg-[#fafbfc] cursor-pointer transition-colors"
            >
              <span className="text-[15px] font-medium text-[#2e3240] truncate">{m.email}</span>
              <span className="text-[14px] text-[#73767f]">
                {m.organisations_count} organisation{m.organisations_count !== 1 ? 's' : ''}
              </span>
              <span className="text-[14px] text-[#73767f]">
                {m.websites_count} website{m.websites_count !== 1 ? 's' : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {accessMember && <AccessPanel member={accessMember} onClose={() => setAccessMember(null)} />}
      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} />}
    </div>
  )
}
