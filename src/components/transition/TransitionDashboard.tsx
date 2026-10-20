import type { ReactNode } from 'react'
import type { StatusKey } from '../../data/status'
import type { DashboardRow, TransitionData } from '../../data/transitionData'
import StatusDot from '../StatusDot'
import StatusChip from './StatusChip'

// Header colours are taken from the source slide; body rows use a plain white/slate
// zebra instead of the slide's per-tower fills, which read as noise on screen.
const GROUP_HEAD = 'bg-[#9dc3e6] text-[#0b2a4a]'
const SUB_HEAD = 'bg-[#bdd7ee] text-[#0b2a4a]'
const PLAIN_HEAD = 'bg-white text-slate-900'
const RAID_HEAD = 'bg-[#0e9aae] text-white'
const STRIPE_ODD = 'bg-[#e8f1fa]' // visible but quiet; the slide's per-tower fills are deliberately not used

const th = 'border border-slate-300 px-2 py-2 text-center text-xs font-bold leading-tight'
const td = 'border border-slate-200 px-2 py-1.5 text-[13px] text-slate-700 align-middle'

/** A status dot; "N/A" when the phase doesn't apply, or nothing at all when the slide leaves the whole phase blank. */
function Status({ status, blank = false }: { status: StatusKey | null; blank?: boolean }) {
  return (
    <td className={`${td} text-center`}>
      {status ? <StatusDot status={status} size={11} /> : blank ? null : <span className="text-slate-500">N/A</span>}
    </td>
  )
}

function Notes({ row }: { row: DashboardRow }): ReactNode {
  if (!row.notes?.length) return null
  return (
    <ul className="list-disc pl-4 space-y-1 marker:text-slate-500">
      {row.notes.map((n, i) => (
        <li key={i} className={n.alert ? 'text-red-600' : undefined}>{n.text}</li>
      ))}
    </ul>
  )
}

function WorkstreamTable({ groups }: { groups: TransitionData['dashboard'] }) {
  let stripe = 0 // zebra index across the whole table, not per tower
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1080px] border-collapse">
        <caption className="sr-only">Transition program workstream dashboard</caption>
        <thead>
          <tr>
            <th scope="col" rowSpan={2} className={`${th} ${PLAIN_HEAD} text-left w-[13%]`}>Tower</th>
            <th scope="col" rowSpan={2} className={`${th} ${PLAIN_HEAD} text-left w-[15%]`}>Workstream</th>
            <th scope="colgroup" colSpan={5} className={`${th} ${GROUP_HEAD}`}>Discovery/Planning/Onboarding</th>
            <th scope="colgroup" colSpan={3} className={`${th} ${GROUP_HEAD}`}>Transition</th>
            <th scope="col" rowSpan={2} className={`${th} ${PLAIN_HEAD} w-[18%]`}>Notes</th>
          </tr>
          <tr>
            <th scope="col" className={`${th} ${SUB_HEAD}`}>Status</th>
            <th scope="col" className={`${th} ${SUB_HEAD}`}>Start</th>
            <th scope="col" className={`${th} ${SUB_HEAD}`}>SOW Planned Submit Date</th>
            <th scope="col" className={`${th} ${SUB_HEAD}`}>SOW Target Approval Date</th>
            <th scope="col" className={`${th} ${SUB_HEAD}`}>Planned Onboarding Completion</th>
            <th scope="col" className={`${th} ${SUB_HEAD}`}>Status</th>
            <th scope="col" className={`${th} ${SUB_HEAD}`}>Start</th>
            <th scope="col" className={`${th} ${SUB_HEAD}`}>Go-Live</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group, g) => {
            let notesCoveredFor = 0 // rows still hidden under a merged Notes cell
            return group.rows.map((row, i) => {
              const bg = stripe++ % 2 === 0 ? 'bg-white' : STRIPE_ODD
              const showNotes = notesCoveredFor === 0
              if (showNotes && row.notesRowSpan) notesCoveredFor = row.notesRowSpan
              const rendersNotesCell = showNotes
              if (notesCoveredFor > 0) notesCoveredFor--
              return (
                <tr key={`${g}:${i}`} className={bg} data-stripe={bg === 'bg-white' ? 'even' : 'odd'}>
                  {i === 0 && (
                    <th scope="rowgroup" rowSpan={group.rows.length} className={`${td} bg-white text-left font-bold text-[#10285c]`}>
                      {group.tower}
                    </th>
                  )}
                  <th scope="row" className={`${td} text-left font-bold text-[#10285c]`}>{row.workstream}</th>
                  <Status status={row.planning.status} />
                  <td className={td}>{row.planning.start}</td>
                  <td className={td}>{row.planning.sowSubmit}</td>
                  <td className={td}>{row.planning.sowApproval}</td>
                  <td className={td}>{row.planning.onboardingComplete}</td>
                  <Status status={row.transition.status} blank={row.transition.start === '' && row.transition.goLive === ''} />
                  <td className={td}>{row.transition.start}</td>
                  <td className={td}>{row.transition.goLive}</td>
                  {rendersNotesCell && (
                    <td rowSpan={row.notesRowSpan ?? 1} className={`${td} bg-white text-[12px]`}>
                      <Notes row={row} />
                    </td>
                  )}
                </tr>
              )
            })
          })}
        </tbody>
      </table>
    </div>
  )
}

function RaidTable({ items }: { items: TransitionData['raid'] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse">
        <caption className="sr-only">RAID log</caption>
        <thead>
          <tr>
            {['RAID', 'Description', 'Mitigation Plan/Next Steps', 'Owner', 'Due Date', 'Status'].map((h) => (
              <th key={h} scope="col" className={`${th} ${RAID_HEAD} text-sm py-2.5`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((r, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : STRIPE_ODD}>
              <td className={`${td} text-center font-semibold`}>{r.type}</td>
              <td className={`${td} text-[12px] align-top`}>{r.description}</td>
              <td className={`${td} text-[12px] align-top`}>
                {r.mitigation.length > 1 ? (
                  <ul className="list-disc pl-4 space-y-1">{r.mitigation.map((m, j) => <li key={j}>{m}</li>)}</ul>
                ) : (
                  r.mitigation[0]
                )}
              </td>
              <td className={`${td} text-center text-[12px]`}>{r.owner}</td>
              <td className={`${td} text-center text-[12px]`}>{r.dueDate}</td>
              <td className={`${td} text-center text-[12px]`}>{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function TransitionDashboard({ data }: { data: TransitionData }) {
  return (
    <section className="space-y-4" aria-label="Transition Program Dashboard">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#0b3a53] text-white px-4 sm:px-6 py-4">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight">Transition Program Dashboard</h2>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[#0ea5e9] px-4 py-1 text-right leading-tight">
            <span className="block text-[10px] tracking-widest font-semibold text-white/90">AS OF:</span>
            <span className="block text-sm font-semibold">{data.asOf}</span>
          </span>
          <StatusChip status={data.overallStatus} />
        </div>
      </div>

      <div className="card overflow-hidden">
        <WorkstreamTable groups={data.dashboard} />
      </div>
      <div className="card overflow-hidden">
        <RaidTable items={data.raid} />
      </div>
    </section>
  )
}
