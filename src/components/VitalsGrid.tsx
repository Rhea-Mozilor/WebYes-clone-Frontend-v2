import { VITALS_META, formatVital, type VitalKey } from '../lib/vitals'

function tickPct(value: number, good: number, needs: number): number {
  const max = needs * 1.67
  if (value <= good) return (value / good) * 33
  if (value <= needs) return 33 + ((value - good) / (needs - good)) * 33
  return Math.min(66 + ((value - needs) / (max - needs)) * 34, 99)
}

export function VitalsGrid({
  metrics,
  className = 'flex gap-8 justify-between',
}: {
  metrics: Partial<Record<VitalKey, number | null | undefined>>
  className?: string
}) {
  return (
    <div className={className}>
      {VITALS_META.map(({ key, abbr, label, unit, good, needs }) => {
        const raw = metrics[key]
        if (raw == null) return null
        const pct = tickPct(raw, good, needs)
        return (
          <div key={key} className="flex-1 min-w-0 text-center">
            <div className="text-[28px] font-bold text-[#2e3240] leading-none tracking-tight">{abbr}</div>
            <div className="text-[12px] text-[#73767f] mt-1 leading-tight">{label}</div>
            {/* Gauge bar */}
            <div className="relative mt-3 mx-auto" style={{ maxWidth: 160 }}>
              <div
                className="h-[6px] rounded-full overflow-hidden"
                style={{ background: 'linear-gradient(to right, #22c55e 0%, #22c55e 33%, #f59e0b 33%, #f59e0b 66%, #ef4444 66%, #ef4444 100%)' }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-[2px] h-[10px] bg-gray-800 rounded-full"
                style={{ left: `${pct}%` }}
              />
            </div>
            <div className="text-[14px] font-semibold text-[#2e3240] mt-2">
              {formatVital(key, raw, unit)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
