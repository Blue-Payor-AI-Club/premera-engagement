import { Fragment } from 'react'
import { type MilestoneSection } from '../data/portalData'
import StatusDot from './StatusDot'
import QuickFeedback from './QuickFeedback'
import VisibleToPremera from './VisibleToPremera'

interface Props {
  headLabel: string
  statusLabel?: string
  sections: MilestoneSection[]
  headColor?: string
  headTextColor?: string
  sectionColor?: string
  sectionTextColor?: string
  /** Set false to hide the Feedback column/vote control — used by the Admin preview,
   * which renders the whole document at once and shouldn't fire a vote-fetch per row
   * or let an admin cast votes from a read-only preview. */
  showFeedback?: boolean
}

export default function MilestoneTable({
  headLabel,
  statusLabel = 'Status',
  sections,
  headColor = '#1f9bb0',
  headTextColor = '#ffffff',
  sectionColor = '#eceadb',
  sectionTextColor = '#334155',
  showFeedback = true,
}: Props) {
  const columnCount = showFeedback ? 5 : 4

  return (
    <div>
      {/* ---- Desktop / tablet table ---- */}
      <table className="hidden sm:table w-full text-sm border-collapse">
        <thead>
          <tr style={{ background: headColor, color: headTextColor }}>
            <th className="text-left font-semibold px-3 py-2">{headLabel}</th>
            <th className="text-left font-semibold px-3 py-2 w-24">Due Date</th>
            <th className="text-left font-semibold px-3 py-2 w-24">Revised Date</th>
            <th className="text-center font-semibold px-3 py-2 w-14">{statusLabel}</th>
            {showFeedback && <th className="text-center font-semibold px-3 py-2 w-20">Feedback</th>}
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => (
            <Fragment key={section.id}>
              <tr style={{ background: sectionColor }}>
                <td colSpan={columnCount} className="px-3 py-1.5 font-semibold text-[13px]" style={{ color: sectionTextColor }}>
                  {section.title}
                </td>
              </tr>
              {section.rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="px-3 py-1.5 text-slate-700">
                    {row.label}<VisibleToPremera flagged={row.needsPremeraAttention} />
                  </td>
                  <td className="px-3 py-1.5 text-slate-600">{row.due}</td>
                  <td className="px-3 py-1.5 text-slate-500">{row.revised || '—'}</td>
                  <td className="px-3 py-1.5 text-center">
                    <StatusDot status={row.status} />
                  </td>
                  {showFeedback && (
                    <td className="px-3 py-1.5 text-center">
                      <QuickFeedback itemId={row.id} itemLabel={row.label} />
                    </td>
                  )}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>

      {/* ---- Mobile stacked list ---- */}
      <div className="sm:hidden">
        <div style={{ background: headColor, color: headTextColor }} className="font-semibold px-3 py-2 text-sm">
          {headLabel}
        </div>
        {sections.map((section) => (
          <div key={section.id}>
            <div style={{ background: sectionColor, color: sectionTextColor }} className="px-3 py-1.5 font-semibold text-[13px]">
              {section.title}
            </div>
            {section.rows.map((row) => (
              <div key={row.id} className="flex items-start justify-between gap-3 px-3 py-2 border-b border-slate-100">
                <div className="min-w-0">
                  <div className="text-sm text-slate-700">{row.label}<VisibleToPremera flagged={row.needsPremeraAttention} /></div>
                  {(row.due || row.revised) && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      {row.due && <>Due {row.due}</>}
                      {row.revised && <> · Revised {row.revised}</>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                  <StatusDot status={row.status} />
                  {showFeedback && <QuickFeedback itemId={row.id} itemLabel={row.label} />}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
