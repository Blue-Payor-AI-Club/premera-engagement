import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import SlideHeader from '../components/SlideHeader'
import Legend from '../components/Legend'
import StatusChip from '../components/transition/StatusChip'
import { RaidGrid, WorkstreamDashboard } from '../components/transition/TransitionDashboard'
import { PROGRAM_TABS, overallStatus, raidDone, sameName, statusCounts, tabWorkstream } from '../lib/programTabs'
import { AddButton, EditButton } from '../components/Editor'
import { TRANSITION_DATA, type TransitionData, type TransitionWorkstream } from '../data/transitionData'
import { LEGEND_ORDER, STATUS } from '../data/status'
import { usePortalData } from '../context/PortalDataContext'
import { isOverdue } from '../lib/format'
import { transitionHeaderRequest, transitionWorkstreamRequest } from '../lib/editRequests'

// Program Level (Neeta's review, set 1, 2026-11-11): one tab per operational area, each showing
// that area's KPIs, title card, phase dashboard and RAID log. The program-wide executive summary
// and old-format dashboard moved to the Transition Summary Report (/report).

function KpiCards({ w }: { w: TransitionWorkstream | undefined }) {
  const counts = statusCounts(w)
  return (
    <div data-tour="scorecard" aria-label="Status counts" role="group" className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
      {LEGEND_ORDER.map((k) => (
        <div key={k} className="rounded-xl border border-slate-200 bg-white shadow-sm px-4 py-3 border-l-4" style={{ borderLeftColor: STATUS[k].color }}>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{STATUS[k].label}</div>
          <div className="text-2xl font-bold text-slate-800" aria-label={`${STATUS[k].label}: ${counts[k]}`}>{counts[k]}</div>
        </div>
      ))}
    </div>
  )
}

function RiskBadges({ data, name }: { data: TransitionData; name: string | undefined }) {
  const items = name ? data.raid.filter((r) => sameName(r.workstream, name)) : []
  const open = items.filter((r) => (r.type === 'R' || r.type === 'I') && !raidDone(r)).length
  const overdue = items.filter((r) => isOverdue(r.dueDate, raidDone(r))).length
  if (!open && !overdue) return null
  const toRaid = () => document.getElementById('tab-raid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-4">
      <button type="button" onClick={toRaid} title="Go to this tab's RAID log" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-100 border border-amber-200 hover:bg-amber-200 transition">
        <AlertTriangle size={13} className="text-amber-500 shrink-0" />
        <span className="text-xs font-semibold text-amber-800">Risks &amp; Issues: <span className="text-amber-600">{open}</span></span>
      </button>
      {overdue > 0 && (
        <button type="button" onClick={toRaid} title="Go to this tab's RAID log" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 border border-red-600 hover:bg-red-700 transition">
          <AlertTriangle size={13} className="text-white shrink-0" />
          <span className="text-xs font-semibold text-white">Overdue: {overdue}</span>
        </button>
      )}
    </div>
  )
}

function TabContent({ data, tab, index }: { data: TransitionData; tab: string; index: number }) {
  const w = data.dashboard[index]
  if (!w) {
    return (
      <div className="card px-4 py-8 text-center space-y-3">
        <p className="text-sm text-slate-500">Nothing shared for {tab} yet.</p>
        <AddButton request={() => transitionWorkstreamRequest(data, undefined, tab)}>{`Add ${tab}`}</AddButton>
      </div>
    )
  }
  return (
    <div className="space-y-6">
      <section className="card overflow-hidden" aria-label={`Transition Program Summary - ${tab}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 bg-[#0b3a53] text-white">
          <h2 className="text-lg sm:text-xl font-semibold tracking-tight">Transition Program Summary - {tab}</h2>
          <span className="flex items-center gap-2">
            <StatusChip status={overallStatus(w)} />
            <span className="[&_button]:text-white/80 [&_button:hover]:text-[#0b3a53]">
              <EditButton title={`Edit ${tab} overall status`} request={() => transitionWorkstreamRequest(data, index)} />
            </span>
          </span>
        </div>
        <div className="px-4 sm:px-6 py-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-[#0b2a4a] mb-2">Overall Status</h3>
          {w.summary
            ? <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{w.summary}</p>
            : <p className="text-sm text-slate-400 italic">Nothing shared in this section yet.</p>}
        </div>
      </section>

      <section className="space-y-4" aria-label="Transition Program Dashboard">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#0b3a53] text-white px-4 sm:px-6 py-4">
          <h2 className="text-lg sm:text-xl font-semibold tracking-tight">Transition Program Dashboard</h2>
          <span className="rounded-full bg-[#0ea5e9] px-4 py-1 text-right leading-tight">
            <span className="block text-[10px] tracking-widest font-semibold text-white/90">AS OF:</span>
            <span className="block text-sm font-semibold">{data.asOf}</span>
          </span>
        </div>
        <div data-tour="workstream-grid" className="card overflow-hidden">
          <WorkstreamDashboard data={data} index={index} />
        </div>
        <div id="tab-raid" className="card overflow-hidden scroll-mt-20">
          <RaidGrid data={data} workstream={w.workstream} />
        </div>
      </section>
    </div>
  )
}

export default function ProgramLevel() {
  const { data } = usePortalData()
  // Synced from the workbook; the bundled copy only covers an API that predates the block.
  const transition = data.transition ?? TRANSITION_DATA
  // In the URL, so a reload or a shared link opens the same tab.
  const [params, setParams] = useSearchParams()
  const tab = PROGRAM_TABS.find((t) => t === params.get('tab')) ?? PROGRAM_TABS[0]
  const setTab = (t: string) => setParams({ tab: t }, { replace: true })
  const index = useMemo(() => tabWorkstream(transition.dashboard, tab), [transition.dashboard, tab])
  const w = transition.dashboard[index]

  return (
    <div className="slide">
      <SlideHeader
        title="Transition Summary Dashboard"
        sampleLines={[]}
        asOf={transition.asOf}
        edit={() => transitionHeaderRequest(transition)}
      />

      <div className="mb-4"><Legend /></div>
      <KpiCards w={w} />
      <RiskBadges data={transition} name={w?.workstream} />

      <div data-tour="tab-switcher" className="mb-6 p-1 rounded-xl bg-slate-100 flex gap-1 overflow-x-auto sm:flex-wrap" role="tablist" aria-label="Operational area">
        {PROGRAM_TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`shrink-0 py-2 px-3 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 ${
              tab === t
                ? 'bg-white shadow-sm text-[#0067b1] ring-1 ring-slate-200/80'
                : 'text-slate-600 hover:text-slate-800 hover:bg-white/60 cursor-pointer'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <TabContent key={tab} data={transition} tab={tab} index={index} />
    </div>
  )
}
