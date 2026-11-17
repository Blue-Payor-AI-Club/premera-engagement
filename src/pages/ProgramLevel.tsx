import { useSearchParams } from 'react-router-dom'
import SlideHeader from '../components/SlideHeader'
import StatusChip from '../components/transition/StatusChip'
import { RaidGrid, WorkstreamDashboard } from '../components/transition/TransitionDashboard'
import { PROGRAM_TABS, overallStatus, raidDone, sameName, statusCounts, tabWorkstream } from '../lib/programTabs'
import { AddButton, EditButton } from '../components/Editor'
import { TRANSITION_DATA, type TransitionData, type TransitionWorkstream } from '../data/transitionData'
import { LEGEND_ORDER, STATUS } from '../data/status'
import { usePortalData } from '../context/PortalDataContext'
import { useAuth } from '../context/AuthContext'
import { transitionHeaderRequest, transitionWorkstreamRequest } from '../lib/editRequests'

// Program Level (Neeta's review, set 1, 2026-11-11): one tab per operational area, each showing
// that area's KPIs, title card, phase dashboard and RAID log. The program-wide executive summary
// and old-format dashboard moved to the Transition Summary Report (/report).

function KpiCards({ w }: { w: TransitionWorkstream | undefined }) {
  const counts = statusCounts(w)
  return (
    // One row of five on every width; on phones the tiles shrink to number-over-label, as in the app.
    <div data-tour="scorecard" aria-label="Status counts" role="group" className="grid grid-cols-5 gap-1.5 sm:gap-3 mb-4">
      {LEGEND_ORDER.map((k) => (
        <div key={k} className="rounded-lg sm:rounded-xl border border-slate-200 bg-white shadow-sm px-1.5 py-2 sm:px-4 sm:py-3 border-t-4 sm:border-t sm:border-l-4 text-center sm:text-left" style={{ borderTopColor: STATUS[k].color, borderLeftColor: STATUS[k].color }}>
          <div className="text-xl sm:text-2xl font-bold text-slate-800 sm:order-2" aria-label={`${STATUS[k].label}: ${counts[k]}`}>{counts[k]}</div>
          <div className="text-[10px] sm:text-xs font-semibold uppercase leading-tight tracking-wide text-slate-500">{STATUS[k].label}</div>
        </div>
      ))}
    </div>
  )
}

/** The tab's RAID count and how many need Premera to act (the RAID items' Premera Action Required). */
function RaidBadges({ data, name }: { data: TransitionData; name: string | undefined }) {
  if (!name) return null
  const items = data.raid.filter((r) => sameName(r.workstream, name))
  const action = items.filter((r) => r.premeraActionRequired && !raidDone(r)).length
  const toRaid = () => document.getElementById('tab-raid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <button type="button" onClick={toRaid} title="Go to this tab's RAID log" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-sky-50 border border-sky-200 hover:bg-sky-100 transition">
        <span className="text-xs font-semibold text-[#0b3a53]"># of RAID: <span className="text-[#0067b1]">{items.length}</span></span>
      </button>
      <button
        type="button"
        onClick={toRaid}
        title="RAID items Premera needs to act on"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition ${action ? 'bg-red-600 border-red-600 hover:bg-red-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
      >
        <span className={`text-xs font-semibold ${action ? 'text-white' : 'text-slate-600'}`}>Premera Attention required: {action}</span>
      </button>
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
  // A Premera Executive / Lead gets only their tabs (the API sends only their content too).
  const { user } = useAuth()
  const tabs = user?.tabs ? PROGRAM_TABS.filter((t) => user.tabs!.includes(t)) : PROGRAM_TABS
  // Synced from the workbook; the bundled copy only covers an API that predates the block.
  const transition = data.transition ?? TRANSITION_DATA
  // In the URL, so a reload or a shared link opens the same tab.
  const [params, setParams] = useSearchParams()
  const tab = tabs.find((t) => t === params.get('tab')) ?? tabs[0]
  const setTab = (t: string) => setParams({ tab: t }, { replace: true })
  const index = tabWorkstream(transition.dashboard, tab)
  const w = transition.dashboard[index]

  return (
    <div className="slide">
      <SlideHeader
        title="Transition Status Dashboard"
        sampleLines={[]}
        asOf={transition.asOf}
        edit={() => transitionHeaderRequest(transition)}
        legend
      />

      <KpiCards w={w} />
      <RaidBadges data={transition} name={w?.workstream} />

      {/* Material-style tabs: equal shares of the full width, an underline on the selected one.
          Phones scroll sideways instead of squeezing 11 labels into 360px. */}
      <div
        data-tour="tab-switcher"
        role="tablist"
        aria-label="Operational area"
        className="mb-6 flex overflow-x-auto bg-white border-b border-slate-200 rounded-t-xl shadow-sm md:grid md:overflow-visible"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`relative shrink-0 min-w-[8.5rem] md:min-w-0 px-2 py-3 text-center text-xs lg:text-[13px] font-semibold leading-tight transition-colors focus:outline-none focus-visible:bg-sky-50 ${
              tab === t ? 'text-[#0067b1] bg-sky-50/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer'
            }`}
          >
            {t}
            <span aria-hidden className={`absolute inset-x-0 bottom-0 h-[3px] rounded-t transition-opacity ${tab === t ? 'bg-[#0067b1] opacity-100' : 'opacity-0'}`} />
          </button>
        ))}
      </div>

      <TabContent key={tab} data={transition} tab={tab} index={index} />
    </div>
  )
}
