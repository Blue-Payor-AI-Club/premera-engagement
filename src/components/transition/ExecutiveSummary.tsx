import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { TransitionData } from '../../data/transitionData'
import StatusChip from './StatusChip'
import VisibleToPremera from '../VisibleToPremera'

function SectionHeading({ children }: { children: string }) {
  return <h3 className="text-sm font-bold uppercase tracking-wide text-[#0b2a4a] mb-2">{children}</h3>
}

function BulletList({ items, marked }: { items: string[]; marked?: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-700 leading-relaxed marker:text-[#0067b1]">
      {items.map((t, i) => <li key={i}>{t}<VisibleToPremera flagged={marked?.includes(t)} /></li>)}
    </ul>
  )
}

function Contacts({ title, people }: { title: string; people: TransitionData['premeraContacts'] }) {
  return (
    <dl aria-label={title} className="space-y-1">
      {people.map((p, i) => (
        <div key={i} className="flex flex-wrap gap-x-2 text-[13px]">
          <dt className="font-bold text-slate-800">{p.role}:</dt>
          <dd className="text-slate-600">{p.name}<VisibleToPremera flagged={p.needsPremeraAttention} /></dd>
        </div>
      ))}
    </dl>
  )
}

/** The Executive Summary slide, collapsible. Open by default; collapsing it just hides the body. */
export default function ExecutiveSummary({ data }: { data: TransitionData }) {
  const [open, setOpen] = useState(true)
  const panelId = useId()
  const { summary } = data

  return (
    <section className="card overflow-hidden" aria-label="Transition Program Executive Summary">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-6 py-4 text-left bg-[#0b3a53] text-white hover:bg-[#0e4663] transition"
      >
        <span className="text-lg sm:text-xl font-semibold tracking-tight">Transition Program Executive Summary</span>
        <span className="flex items-center gap-3 shrink-0">
          <StatusChip status={data.overallStatus} />
          <ChevronDown size={20} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden />
        </span>
      </button>

      <div id={panelId} role="region" hidden={!open} className="px-4 sm:px-6 py-5 space-y-6">
        <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
          <Contacts title="Premera contacts" people={data.premeraContacts} />
          <Contacts title="UST contacts" people={data.ustContacts} />
        </div>

        <div>
          <SectionHeading>Overall Status</SectionHeading>
          <p className="text-sm text-slate-700 leading-relaxed">{summary.overallStatus}</p>
        </div>

        <div>
          <SectionHeading>Key Accomplishments</SectionHeading>
          <BulletList items={summary.accomplishments} marked={summary.premeraVisible} />
        </div>

        <div>
          <SectionHeading>Upcoming Priorities</SectionHeading>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-700 leading-relaxed marker:text-[#0067b1]">
            {summary.priorities.map((p, i) => (
              <li key={i}>
                <strong className="font-bold text-slate-900">{p.title}</strong> {p.text}<VisibleToPremera flagged={p.needsPremeraAttention} />
              </li>
            ))}
          </ul>
        </div>

        <div>
          <SectionHeading>Key Risk</SectionHeading>
          <BulletList items={summary.risks} marked={summary.premeraVisible} />
        </div>

        <div>
          <SectionHeading>Executive Focus Required</SectionHeading>
          <BulletList items={summary.executiveFocus} marked={summary.premeraVisible} />
        </div>
      </div>
    </section>
  )
}
