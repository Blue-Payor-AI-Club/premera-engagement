import { EditButton, useEditor } from '../Editor'
import { READINESS_GUIDE, READINESS_LEVERS, completeReadiness, guideFor, type ReadinessItem, type ReadinessScore } from '../../data/readiness'
import type { TransitionData } from '../../data/transitionData'
import { readinessRequest } from '../../lib/editRequests'

// The program-wide Transition Readiness Score Card, on its own menu item (/readiness, 2026-11-17).
// Two layouts, each following its slide:
//  - desktop ("Transiiton Readiness Score Card.pptx"): the subtitle, then the table (# · Lever · What
//    is needed · Score (1-6) · Remarks) with a teal header and striped rows, then the scoring guide;
//  - phone ("Transition_Readiness_Score_Card_Mobile.pptx"): a dark-teal title band, the scoring guide
//    as a 3 × 2 grid of tiles, then one white card per lever with its number tile and a score pill.
// UST edits a lever with its pencil; everyone else reads it.

const SUBTITLE = 'What must be in place with Premera before we begin the transition'
const TEAL = '#006E74' // desktop table header
const BAND = '#0B4F55' // phone title band
const STRIPE = '#E8F1F1'
const INK = '#1C2433'
const MUTED = '#5F6B6D'
const GUIDE_INK = '#0097AC'

const scoreLabel = (score: ReadinessScore) => `Score ${score}: ${guideFor(score).label}`

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

/** "1 Green · 6 Light green · 3 Amber · 1 Yet to start" (best first, Yet to start last), and a bar to match. */
function Mix({ items, onDark }: { items: ReadinessItem[]; onDark: boolean }) {
  const order: ReadinessScore[] = [5, 4, 3, 2, 1, 6]
  const counts = order.map((s) => ({ s, n: items.filter((i) => i.score === s).length })).filter((c) => c.n > 0)
  const unscored = items.filter((i) => !i.score).length
  const parts = [...counts.map((c) => `${c.n} ${guideFor(c.s).label}`), ...(unscored ? [`${unscored} not scored`] : [])]
  return (
    <div className={`flex flex-wrap items-center gap-2 text-xs ${onDark ? 'text-white/90' : 'text-slate-600'}`} aria-label="Score mix">
      <span className={`flex h-2 w-24 sm:w-32 overflow-hidden rounded-full ${onDark ? 'bg-white/20' : 'bg-slate-200'}`} aria-hidden>
        {counts.map((c) => <i key={c.s} style={{ width: `${(c.n / items.length) * 100}%`, background: guideFor(c.s).bg }} />)}
      </span>
      <span>{parts.join(' · ')}</span>
    </div>
  )
}

// ─── desktop: the slide's table ──────────────────────────────────────────────

function DesktopCard({ data, items, scored, canEdit }: { data: TransitionData; items: ReadinessItem[]; scored: boolean; canEdit: boolean }) {
  return (
    <section aria-label="Transition Readiness Score Card" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-sm text-slate-600">{SUBTITLE}</p>
        {scored && <Mix items={items} onDark={false} />}
      </div>
      {!scored && !canEdit ? (
        <p className="card px-5 py-4 text-sm text-slate-400 italic">Readiness not scored yet.</p>
      ) : (
        <div className="card overflow-hidden">
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
                {READINESS_LEVERS.map((lever, i) => {
                  const item = items[i]
                  return (
                    <tr key={lever.key} style={{ background: i % 2 === 1 ? STRIPE : '#FFFFFF' }} className="border-t border-slate-200">
                      <td className="px-3 py-2 text-slate-500 tabular-nums">{i + 1}</td>
                      <td className="px-3 py-2 font-semibold whitespace-nowrap" style={{ color: INK }}>{lever.label}</td>
                      <td className="px-3 py-2 text-slate-600">{lever.need}</td>
                      <td className="px-3 py-2">
                        {item.score ? (
                          <span className="inline-flex items-center gap-2 whitespace-nowrap" aria-label={scoreLabel(item.score)}>
                            <ScoreSquare score={item.score} />
                            <span className="text-xs text-slate-600">{guideFor(item.score).label}</span>
                          </span>
                        ) : <span className="text-xs text-slate-400 italic">Not scored</span>}
                      </td>
                      <td className="px-3 py-2 text-slate-600 whitespace-pre-line">{item.remarks || <span className="text-slate-300">—</span>}</td>
                      {canEdit && <td className="px-3 py-2 text-center"><EditButton className="" title={`Edit ${lever.label} score`} request={() => readinessRequest(data, lever.key)} /></td>}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 pt-3 pb-4 border-t border-slate-200" aria-label="Scoring guide">
            <div className="text-[11px] font-bold tracking-[0.12em] mb-2" style={{ color: GUIDE_INK }}>SCORING GUIDE</div>
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
              {READINESS_GUIDE.map((g) => (
                <div key={g.score} className="flex items-start gap-2 min-w-0">
                  <ScoreSquare score={g.score} />
                  <div className="min-w-0 text-xs leading-tight">
                    <div className="font-semibold" style={{ color: INK }}>{g.label}</div>
                    <div style={{ color: MUTED }}>{g.meaning}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

// ─── phone: the mobile slide ─────────────────────────────────────────────────

function PhoneCard({ data, items, scored, canEdit, asOf }: { data: TransitionData; items: ReadinessItem[]; scored: boolean; canEdit: boolean; asOf?: string }) {
  return (
    <section aria-label="Transition Readiness Score Card" className="space-y-3">
      <div className="rounded-xl px-4 py-4 text-white space-y-1.5" style={{ background: BAND }}>
        <h1 className="text-[20px] font-bold leading-tight tracking-tight">Transition Readiness Score Card</h1>
        <p className="text-[12px] leading-snug" style={{ color: STRIPE }}>{SUBTITLE}</p>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-1">
          {scored && <Mix items={items} onDark />}
          {asOf && <span className="text-[11px]" style={{ color: '#C9E3E3' }}>As of {asOf}</span>}
        </div>
      </div>

      {!scored && !canEdit ? (
        <p className="card px-4 py-4 text-sm text-slate-400 italic">Readiness not scored yet.</p>
      ) : (
        <>
          <div aria-label="Scoring guide">
            <div className="text-[10.5px] font-bold tracking-[0.12em] mb-1.5" style={{ color: MUTED }}>SCORING GUIDE</div>
            <div className="grid grid-cols-3 gap-1.5">
              {READINESS_GUIDE.map((g) => (
                <div key={g.score} className="flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-1.5 py-1.5 min-w-0">
                  <ScoreSquare score={g.score} size={20} />
                  <div className="min-w-0 leading-tight">
                    <div className="text-[10.5px] font-semibold truncate" style={{ color: INK }}>{g.label}</div>
                    <div className="text-[9.5px]" style={{ color: MUTED }}>{g.meaning}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <ul className="space-y-1.5" aria-label="Readiness levers">
            {READINESS_LEVERS.map((lever, i) => {
              const item = items[i]
              const g = item.score ? guideFor(item.score) : undefined
              return (
                <li key={lever.key} className="flex items-center gap-2.5 rounded-lg bg-white border border-slate-200 px-2.5 py-2">
                  <span className="grid place-items-center w-7 h-7 rounded-md text-[12px] font-bold tabular-nums shrink-0" style={{ background: STRIPE, color: BAND }}>{i + 1}</span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="text-[13px] font-semibold" style={{ color: INK }}>{lever.label}</div>
                    <div className="text-[11px]" style={{ color: MUTED }}>{lever.need}</div>
                    {item.remarks && <div className="text-[11px] text-slate-700 whitespace-pre-line mt-0.5">{item.remarks}</div>}
                  </div>
                  <span className="flex items-center gap-1 shrink-0">
                    {item.score && g
                      ? <span aria-label={scoreLabel(item.score)} className="grid place-items-center w-11 h-7 rounded-lg text-[14px] font-bold tabular-nums" style={{ background: g.bg, color: g.fg }}>{item.score}</span>
                      : <span className="text-[10px] text-slate-400 italic whitespace-nowrap">Not scored</span>}
                    <EditButton className="" title={`Edit ${lever.label} score`} request={() => readinessRequest(data, lever.key)} />
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="text-[11px]" style={{ color: MUTED }}>Scores: 1 (critical) to 6 (yet to start).</p>
        </>
      )}
    </section>
  )
}

export default function ReadinessCard({ data, phone }: { data: TransitionData; phone: boolean }) {
  const canEdit = !!useEditor()
  const items = completeReadiness(data.readiness)
  const scored = items.some((i) => i.score || i.remarks)
  return phone
    ? <PhoneCard data={data} items={items} scored={scored} canEdit={canEdit} asOf={data.asOf} />
    : <DesktopCard data={data} items={items} scored={scored} canEdit={canEdit} />
}
