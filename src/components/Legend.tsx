import { STATUS, LEGEND_ORDER } from '../data/status'
import StatusDot from './StatusDot'

/** The status key. `compact`: the smaller, right-aligned version under the header's As-Of date. */
export default function Legend({ compact = false }: { compact?: boolean }) {
  return (
    <div role="group" aria-label="Status key" className={`flex items-center flex-wrap ${compact ? 'justify-end gap-x-3 gap-y-1.5' : 'gap-5'}`}>
      <span className={`rounded-full text-white font-semibold ${compact ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'}`} style={{ background: '#1f9bb0' }}>
        Status
      </span>
      {LEGEND_ORDER.map((k) => (
        <span key={k} className={`flex items-center text-slate-600 whitespace-nowrap ${compact ? 'gap-1.5 text-xs' : 'gap-2 text-sm'}`}>
          <StatusDot status={k} size={compact ? 9 : undefined} />
          {STATUS[k].label}
        </span>
      ))}
    </div>
  )
}
