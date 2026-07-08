import { cn } from '../../lib/utils'

const CONFIG: Record<string, { cls: string; label: string }> = {
  critical: {
    cls: 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]',
    label: 'Critical',
  },
  high: {
    cls: 'bg-[#FDEBD8] text-[#7C2D12] border border-[#F97316]',
    label: 'High',
  },
  medium: {
    cls: 'bg-[#FEFCE8] text-[#92400E] border border-[#FEF08A]',
    label: 'Medium',
  },
  moderate: {
    cls: 'bg-[#FEFCE8] text-[#92400E] border border-[#FEF08A]',
    label: 'Medium',
  },
  low: {
    cls: 'bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]',
    label: 'Low',
  },
}

export function PriorityBadge({ priority, className }: { priority: string | null | undefined; className?: string }) {
  const key = (priority ?? '').toLowerCase()
  const { cls, label } = CONFIG[key] ?? { cls: 'bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]', label: priority ?? '—' }
  return (
    <span className={cn('inline-flex items-center px-3 py-1 rounded-full text-[13px] font-medium', cls, className)}>
      {label}
    </span>
  )
}
