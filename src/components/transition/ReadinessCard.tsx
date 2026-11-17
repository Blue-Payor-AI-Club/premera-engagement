import useMediaQuery from '@mui/material/useMediaQuery'
import { EditButton, useEditor } from '../Editor'
import { READINESS_GUIDE, READINESS_LEVERS, completeReadiness, guideFor, type ReadinessItem, type ReadinessScore } from '../../data/readiness'
import type { TransitionData } from '../../data/transitionData'
import { readinessRequest } from '../../lib/editRequests'

// The program-wide Transition Readiness Score Card, at the top of Program Level (2026-11-17): the
// slide's 11 levers, 1–6 scores and scoring guide, in the slide's colours. UST edits a lever with
// its pencil; everyone else reads it. Phones get one card per lever, like phases and RAID items.

const TEAL = '#006E74'
const STRIPE = '#E8F1F1'
const GUIDE_INK = '#0097AC'

function ScoreSquare({ score, size = 24 }: { score: ReadinessScore; size?: number }) {
  const g = guideFor(score)
  return (
    <span
      className="inline-grid place-items-center rounded-[5px] font-bold tabular-nums shrink-0"
      style={{ width: size, height: size, background: g.bg, color: g.fg, fontSize: size > 20 ? 12 : 11 }}
      aria-hidden
    >
      {score}
    </span>
  )
}

function Score({ score }: { score: ReadinessScore | null }) {
  if (!score) return <span className="text-xs text-slate-400 italic">Not scored</span>
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap" aria-label={`Score ${score}: ${guideFor(score).label}`}>
      <ScoreSquare score={score} />
      <span className="text-xs text-slate-600">{guideFor(score).label}</span>
    </span>
  )
}

/** "1 Green · 6 Light green · 3 Amber · 1 Yet to start" (best first, Yet to start last), and a bar to match. */
function Mix({ items }: { items: ReadinessItem[] }) {
  const order: ReadinessScore[] = [5, 4, 3, 2, 1, 6]
  const counts = order.map((s) => ({ s, n: items.filter((i) => i.score === s).length })).filter((c) => c.n > 0)
  const unscored = items.filter((i) => !i.score).length
  const parts = [...counts.map((c) => `${c.n} ${guideFor(c.s).label}`), ...(unscored ? [`${unscored} not scored`] : [])]
  return (
    <div className="flex flex-wrap items-center gap-2.5 text-xs text-white/90" aria-label="Score mix">
      <span className="flex h-2.5 w-40 overflow-hidden rounded-full bg-white/20" aria-hidden>
        {counts.map((c) => <i key={c.s} style={{ width: `${(c.n / items.length) * 100}%`, background: guideFor(c.s).bg }} />)}
      </span>
      <span>{parts.join(' · ')}</span>
    </div>
  )
}

function Guide({ compact }: { compact: boolean }) {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 px-4 py-3 border-t border-slate-200" aria-label="Scoring guide">
        {READINESS_GUIDE.map((g) => (
          <span key={g.score} className="inline-flex items-center gap-1 text-[11px] text-slate-600"><ScoreSquare score={g.score} size={18} />{g.label}</span>
        ))}
      </div>
    )
  }
  return (
    <div className="px-4 sm:px-5 pt-3 pb-4 border-t border-slate-200" aria-label="Scoring guide">
      <div className="text-[11px] font-bold tracking-[0.12em] mb-2" style={{ color: GUIDE_INK }}>SCORING GUIDE</div>
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {READINESS_GUIDE.map((g) => (
          <div key={g.score} className="flex items-start gap-2 min-w-0">
            <ScoreSquare score={g.score} />
            <div className="min-w-0 text-xs leading-tight">
              <div className="font-semibold text-slate-800">{g.label}</div>
              <div className="text-slate-500">{g.meaning}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ReadinessCard({ data }: { data: TransitionData }) {
  const canEdit = !!useEditor()
  const phone = useMediaQuery('(max-width: 639.95px)')
  const items = completeReadiness(data.readiness)
  const scored = items.some((i) => i.score || i.remarks)
  const rows = READINESS_LEVERS.map((lever, n) => ({ lever, n: n + 1, item: items[n] }))

  return (
    <section aria-label="Transition Readiness Score Card" className="card overflow-hidden mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3.5 bg-[#0b3a53] text-white">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-semibold tracking-tight">Transition Readiness Score Card</h2>
          <p className="text-xs text-white/75">What must be in place with Premera before we begin the transition</p>
        </div>
        {scored && <Mix items={items} />}
      </div>

      {!scored && !canEdit ? (
        <p className="px-4 sm:px-5 py-4 text-sm text-slate-400 italic">Readiness not scored yet.</p>
      ) : phone ? (
        <ul aria-label="Readiness levers">
          {rows.map(({ lever, n, item }) => (
            <li key={lever.key} className="px-4 py-2.5 border-t border-slate-200 first:border-t-0 space-y-0.5">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-semibold text-slate-800">{n} · {lever.label}</span>
                <span className="flex items-center gap-1.5 shrink-0">
                  {item.score ? <span aria-label={`Score ${item.score}: ${guideFor(item.score).label}`}><ScoreSquare score={item.score} /></span> : <span className="text-[11px] text-slate-400 italic">Not scored</span>}
                  <EditButton title={`Edit ${lever.label} score`} request={() => readinessRequest(data, lever.key)} />
                </span>
              </div>
              <p className="text-xs text-slate-500">{lever.need}</p>
              {item.remarks && <p className="text-xs text-slate-700 whitespace-pre-line">{item.remarks}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="text-left text-white" style={{ background: TEAL }}>
                <th className="px-3 py-2 font-semibold w-10">#</th>
                <th className="px-3 py-2 font-semibold">Lever</th>
                <th className="px-3 py-2 font-semibold">What is needed</th>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Score (1-6)</th>
                <th className="px-3 py-2 font-semibold">Remarks</th>
                {canEdit && <th className="px-3 py-2 font-semibold w-12"><span className="sr-only">Edit</span></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ lever, n, item }) => (
                <tr key={lever.key} style={{ background: n % 2 === 0 ? STRIPE : '#FFFFFF' }} className="border-t border-slate-200">
                  <td className="px-3 py-2 text-slate-500 tabular-nums">{n}</td>
                  <td className="px-3 py-2 font-semibold text-slate-800 whitespace-nowrap">{lever.label}</td>
                  <td className="px-3 py-2 text-slate-600">{lever.need}</td>
                  <td className="px-3 py-2"><Score score={item.score} /></td>
                  <td className="px-3 py-2 text-slate-600 whitespace-pre-line">{item.remarks || <span className="text-slate-300">—</span>}</td>
                  {canEdit && <td className="px-3 py-2 text-center"><EditButton className="" title={`Edit ${lever.label} score`} request={() => readinessRequest(data, lever.key)} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(scored || canEdit) && <Guide compact={phone} />}
    </section>
  )
}
