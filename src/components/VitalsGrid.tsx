import { VITALS_META, formatVital, type VitalKey } from '../lib/vitals'

export function VitalsGrid({
  metrics,
  className = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4',
}: {
  metrics: Partial<Record<VitalKey, number | null | undefined>>
  className?: string
}) {
  return (
    <div className={className}>
      {VITALS_META.map(({ key, abbr, label, unit, good, needs }) => {
        const raw = metrics[key] ?? null
        const display = formatVital(key, raw, unit)

        // Scale: 0 → (2·needs − good), splitting into 3 zones
        const max = needs * 2 - good
        const pct = raw != null ? Math.min((raw / max) * 100, 100) : 0
        const gW = (good / max) * 100
        const yW = ((needs - good) / max) * 100
        const rW = 100 - gW - yW

        return (
          <div key={key} className="flex flex-col gap-1.5">
            <div className="text-lg font-bold text-gray-900">{abbr}</div>
            <div className="text-xs text-gray-400 flex items-center gap-1">{label}</div>

            {/* Segmented bar with tick */}
            <div className="relative pt-3">
              {raw != null && (
                <div
                  className="absolute top-0 w-px h-3 bg-gray-800"
                  style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
                />
              )}
              <div className="flex h-[5px] gap-0.5">
                <div className="rounded-l-sm bg-green-500" style={{ flex: gW }} />
                <div className="bg-yellow-400" style={{ flex: yW }} />
                <div className="rounded-r-sm bg-red-500" style={{ flex: rW }} />
              </div>
            </div>

            {/* Value label anchored to tick position */}
            <div className="relative h-5">
              <span
                className="absolute text-sm font-semibold text-gray-700 whitespace-nowrap -translate-x-1/2"
                style={{ left: `${pct}%` }}
              >
                {display}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
