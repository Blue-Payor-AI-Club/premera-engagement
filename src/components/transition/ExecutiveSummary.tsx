import { useId, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import type { TransitionData } from '../../data/transitionData'
import StatusChip from './StatusChip'
import VisibleToPremera from '../VisibleToPremera'
import { AddButton, EditButton } from '../Editor'
import { useUstView } from '../../context/PortalDataContext'
import { contactRequest, priorityRequest, summaryLineRequest, transitionHeaderRequest } from '../../lib/editRequests'

function SectionHeading({ children, edit }: { children: string; edit?: ReactNode }) {
  return <h3 className="text-sm font-bold uppercase tracking-wide text-[#0b2a4a] mb-2">{children}{edit}</h3>
}

type SummaryList = 'accomplishments' | 'risks' | 'executiveFocus'

const Empty = () => <p className="text-sm text-slate-400 italic">Nothing shared in this section yet.</p>

function BulletList({ data, list }: { data: TransitionData; list: SummaryList }) {
  const { summary } = data
  return (
    <>
      {summary[list].length === 0 && <Empty />}
      <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-700 leading-relaxed marker:text-[#0067b1]">
        {summary[list].map((t, i) => (
          <li key={i}>
            {t}<VisibleToPremera flagged={summary.premeraVisible?.includes(t)} />
            <EditButton request={() => summaryLineRequest(data, list, i)} />
          </li>
        ))}
      </ul>
      <div className="mt-1.5"><AddButton request={() => summaryLineRequest(data, list)}>Add line</AddButton></div>
    </>
  )
}

function Contacts({ title, group, people }: { title: string; group: 'premeraContacts' | 'ustContacts'; people: TransitionData['premeraContacts'] }) {
  return (
    <div>
      <dl aria-label={title} className="space-y-1">
        {people.map((p, i) => (
          <div key={i} className="flex flex-wrap gap-x-2 text-[13px]">
            <dt className="font-bold text-slate-800">{p.role}:</dt>
            <dd className="text-slate-600">
              {p.name}<VisibleToPremera flagged={p.needsPremeraAttention} />
              <EditButton title={`Edit ${p.role}`} request={() => contactRequest(group, i, p)} />
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-1.5"><AddButton request={() => contactRequest(group)}>Add {group === 'premeraContacts' ? 'Premera' : 'UST'} contact</AddButton></div>
    </div>
  )
}

/** The Executive Summary slide, collapsible. Open by default; collapsing it just hides the body. */
export default function ExecutiveSummary({ data }: { data: TransitionData }) {
  const [open, setOpen] = useState(true)
  const panelId = useId()
  const { summary } = data
  const ust = useUstView()
  const hasContacts = ust || data.premeraContacts.length + data.ustContacts.length > 0

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
        {hasContacts && (
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
            <Contacts title="Premera contacts" group="premeraContacts" people={data.premeraContacts} />
            <Contacts title="UST contacts" group="ustContacts" people={data.ustContacts} />
          </div>
        )}

        <div>
          <SectionHeading edit={<EditButton title="Edit overall status" request={() => transitionHeaderRequest(data)} />}>Overall Status</SectionHeading>
          {summary.overallStatus ? <p className="text-sm text-slate-700 leading-relaxed">{summary.overallStatus}</p> : <Empty />}
        </div>

        <div>
          <SectionHeading>Key Accomplishments</SectionHeading>
          <BulletList data={data} list="accomplishments" />
        </div>

        <div>
          <SectionHeading>Upcoming Priorities</SectionHeading>
          {summary.priorities.length === 0 && <Empty />}
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-700 leading-relaxed marker:text-[#0067b1]">
            {summary.priorities.map((p, i) => (
              <li key={i}>
                <strong className="font-bold text-slate-900">{p.title}</strong> {p.text}<VisibleToPremera flagged={p.needsPremeraAttention} />
                <EditButton request={() => priorityRequest(data, i)} />
              </li>
            ))}
          </ul>
          <div className="mt-1.5"><AddButton request={() => priorityRequest(data)}>Add priority</AddButton></div>
        </div>

        <div>
          <SectionHeading>Key Risk</SectionHeading>
          <BulletList data={data} list="risks" />
        </div>

        <div>
          <SectionHeading>Executive Focus Required</SectionHeading>
          <BulletList data={data} list="executiveFocus" />
        </div>
      </div>
    </section>
  )
}
