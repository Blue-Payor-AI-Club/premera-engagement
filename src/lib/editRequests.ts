// What each editable row looks like in the in-app editor — one builder per workbook sheet, with
// the same columns and rules, so a row saved here round-trips through an Excel download/upload.
import { uid, type IssueRow, type MilestoneRow, type MilestoneSection, type PortalData, type RiskAction, type Workstream } from '../data/portalData'
import { LEGEND_ORDER, STATUS, type StatusKey } from '../data/status'
import type { DashboardRow, RaidItem, TransitionContact, TransitionData } from '../data/transitionData'
import { WORKSTREAM_ICON_LABELS } from '../data/workstreamIcons'


// ─── Editor form model (rendered by components/Editor.tsx) ────────────────────

export type FieldType = 'text' | 'textarea' | 'lines' | 'date' | 'bool' | 'select' | 'status'
export interface Field {
  key: string
  label: string
  type?: FieldType
  required?: boolean
  /** select only. A non-required select (or status) also offers a blank "—" choice. */
  options?: { value: string; label: string }[]
  /** date only: a real date is required (no TBD / N/A), like the report As-Of date. */
  strictDate?: boolean
}
export type Values = Record<string, unknown>

export interface EditRequest {
  /** What is being edited, for the dialog title and the Activity log, e.g. `issue "Payroll…"`. */
  label: string
  isNew?: boolean
  fields: Field[]
  value: Values
  /** Applies the form's values to a copy of the document. */
  save: (draft: PortalData, values: Values) => void
  /** Present = the dialog offers Delete. */
  remove?: (draft: PortalData) => void
}

export const STATUS_OPTIONS = LEGEND_ORDER.map((k) => ({ value: k, label: STATUS[k].label }))

/** Same rule as the Excel importer: M/D/YYYY (2-digit years are 20YY) or YYYY-MM-DD, stored as
 * M/D/YYYY; TBD / N/A; blank. undefined = not a date. */
export function normalizeDate(text: string, allowPlaceholders = true): string | undefined {
  const t = text.trim()
  if (!t) return ''
  if (allowPlaceholders && /^tbd$/i.test(t)) return 'TBD'
  if (allowPlaceholders && /^n\/?a$/i.test(t)) return 'N/A'
  const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})$/.exec(t)
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t)
  const [y, m, d] = mdy ? [mdy[3].length === 2 ? `20${mdy[3]}` : mdy[3], mdy[1], mdy[2]] : iso ? [iso[1], iso[2], iso[3]] : []
  if (!y) return undefined
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))
  if (date.getUTCMonth() !== Number(m) - 1 || date.getUTCDate() !== Number(d)) return undefined
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()}`
}

export type Division = 'ito' | 'bpo'
type Locate = (d: PortalData) => MilestoneSection[]

const opts = (o: Record<string, string>) => Object.entries(o).map(([value, label]) => ({ value, label }))
const SEVERITY = opts({ critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' })
const ACTION_STATUS = opts({ open: 'Open', inProgress: 'In Progress', closed: 'Closed' })
const DIVISION = opts({ ito: 'ITO', bpo: 'BPO' })
const RAID_TYPE = opts({ R: 'R — Risk', A: 'A — Assumption', I: 'I — Issue', D: 'D — Dependency' })
const RAID_STATUS = ['Open', 'In Progress', 'Mitigated', 'Closed'].map((s) => ({ value: s, label: s }))

const ATTENTION: Field = { key: 'needsPremeraAttention', label: 'Premera Attention (visible to Premera)', type: 'bool' }
const ACTION_REQUIRED: Field = { key: 'premeraActionRequired', label: 'Premera Action Required', type: 'bool' }

const str = (v: unknown) => (v as string) || ''
const flag = (v: unknown) => (v ? true : undefined)
const quote = (s: string) => `"${s}"`

function indexOf<T extends { id: string }>(arr: T[], id: string): number {
  const i = arr.findIndex((x) => x.id === id)
  if (i < 0) throw new Error('That row no longer exists. Press Refresh to load the latest data.')
  return i
}
const byId = <T extends { id: string }>(arr: T[], id: string) => arr[indexOf(arr, id)]
const removeId = <T extends { id: string }>(arr: T[], id: string) => { arr.splice(indexOf(arr, id), 1) }
const tr = (d: PortalData) => d.transition as TransitionData

// ─── Program (ITO / BPO) ──────────────────────────────────────────────────────

export function programHeaderRequest(data: PortalData, div: Division): EditRequest {
  return {
    label: `${div.toUpperCase()} report header`,
    fields: [
      { key: 'asOf', label: 'Report As-Of Date', type: 'date', required: true, strictDate: true },
      { key: 'levelLabel', label: `${div.toUpperCase()} Page Title`, required: true },
    ],
    value: { asOf: data.asOf, levelLabel: data.program[div].levelLabel },
    save: (d, v) => { d.asOf = str(v.asOf); d.program[div].levelLabel = str(v.levelLabel) },
  }
}

const WORKSTREAM_FIELDS: Field[] = [
  { key: 'name', label: 'Name', required: true },
  { key: 'icon', label: 'Icon', type: 'select', required: true, options: opts(WORKSTREAM_ICON_LABELS) },
  { key: 'status', label: 'Status', type: 'status', required: true },
  { key: 'statusMessage', label: 'Status Note' },
  ATTENTION,
  ACTION_REQUIRED,
  { key: 'accomplishments', label: 'Key Accomplishments', type: 'lines' },
  { key: 'activities', label: 'Planned Activities', type: 'lines' },
]

function applyWorkstream(w: Workstream, v: Values) {
  w.name = str(v.name)
  w.icon = v.icon as Workstream['icon']
  w.status = v.status as StatusKey
  w.statusMessage = str(v.statusMessage) || undefined
  w.needsPremeraAttention = flag(v.needsPremeraAttention)
  w.premeraActionRequired = flag(v.premeraActionRequired)
  w.accomplishments = v.accomplishments as string[]
  w.activities = v.activities as string[]
}

export function workstreamRequest(div: Division, ws?: Workstream): EditRequest {
  return {
    label: ws ? `operational area ${quote(ws.name)}` : `${div.toUpperCase()} operational area`,
    isNew: !ws,
    fields: WORKSTREAM_FIELDS,
    value: ws ? { ...ws } : { icon: 'share2', status: 'onTrack' },
    save: (d, v) => {
      const list = d.program[div].workstreams
      if (ws) return applyWorkstream(byId(list, ws.id), v)
      const w = { id: uid(), milestones: [] } as unknown as Workstream
      applyWorkstream(w, v)
      list.push(w)
    },
    remove: ws && ((d) => removeId(d.program[div].workstreams, ws.id)),
  }
}

/** The live milestone sections of a workstream (created if missing), for MilestoneTable. */
export const workstreamMilestones = (div: Division, wsId: string): Locate => (d) => {
  const w = byId(d.program[div].workstreams, wsId)
  return (w.milestones ??= [])
}
export const programMilestones = (div: Division): Locate => (d) => d.program[div].milestones

export function milestoneSectionRequest(locate: Locate, where: string, section?: MilestoneSection): EditRequest {
  return {
    label: section ? `milestone section ${quote(section.title)}` : `milestone section (${where})`,
    isNew: !section,
    fields: [{ key: 'title', label: 'Section', required: true }],
    value: { title: section?.title },
    save: (d, v) => {
      if (section) byId(locate(d), section.id).title = str(v.title)
      else locate(d).push({ id: uid(), title: str(v.title), rows: [] })
    },
    remove: section && ((d) => removeId(locate(d), section.id)),
  }
}

export function milestoneRowRequest(locate: Locate, sectionId: string, row?: MilestoneRow): EditRequest {
  return {
    label: row ? `milestone ${quote(row.label)}` : 'milestone',
    isNew: !row,
    fields: [
      { key: 'label', label: 'Milestone', required: true },
      { key: 'due', label: 'Due', type: 'date' },
      { key: 'revised', label: 'Revised', type: 'date' },
      { key: 'status', label: 'Status', type: 'status', required: true },
      ATTENTION,
    ],
    value: row ? { ...row } : { status: 'notStarted' },
    save: (d, v) => {
      const rows = byId(locate(d), sectionId).rows
      const next: MilestoneRow = {
        id: row?.id ?? uid(),
        label: str(v.label), due: str(v.due), revised: str(v.revised), status: v.status as StatusKey,
        needsPremeraAttention: flag(v.needsPremeraAttention),
      }
      if (row) rows[indexOf(rows, row.id)] = next
      else rows.push(next)
    },
    remove: row && ((d) => removeId(byId(locate(d), sectionId).rows, row.id)),
  }
}

// ─── Risks & Issues ───────────────────────────────────────────────────────────

const divisionOf = (d: PortalData, issueId: string): Division =>
  d.program.ito.issues.some((i) => i.id === issueId) ? 'ito' : 'bpo'

export function issueRequest(div: Division, issue?: IssueRow): EditRequest {
  return {
    label: issue ? `risk / issue ${quote(issue.issue)}` : 'risk / issue',
    isNew: !issue,
    fields: [
      { key: 'division', label: 'Division', type: 'select', required: true, options: DIVISION },
      { key: 'issue', label: 'Risk / Issue', type: 'textarea', required: true },
      { key: 'mitigations', label: 'Mitigation Plan', type: 'lines' },
      { key: 'date', label: 'Due', type: 'date' },
      { key: 'status', label: 'Status', type: 'status', required: true },
      { key: 'severity', label: 'Severity', type: 'select', options: SEVERITY },
      { key: 'priority', label: 'Priority', type: 'select', options: SEVERITY },
      ATTENTION,
      ACTION_REQUIRED,
    ],
    value: issue ? { ...issue, division: div } : { division: div, status: 'atRisk' },
    save: (d, v) => {
      const target = v.division as Division
      const next: IssueRow = {
        id: issue?.id ?? uid(),
        issue: str(v.issue), mitigations: v.mitigations as string[], date: str(v.date), status: v.status as StatusKey,
        severity: (str(v.severity) || undefined) as IssueRow['severity'],
        priority: (str(v.priority) || undefined) as IssueRow['priority'],
        needsPremeraAttention: flag(v.needsPremeraAttention),
        premeraActionRequired: flag(v.premeraActionRequired),
        riskActions: [],
      }
      if (issue) {
        const fromDiv = divisionOf(d, issue.id)
        const from = d.program[fromDiv].issues
        const at = indexOf(from, issue.id)
        next.riskActions = from[at].riskActions ?? []
        if (fromDiv === target) { from[at] = next; return } // keeps its place in the list
        from.splice(at, 1)
      }
      d.program[target].issues.push(next)
    },
    remove: issue && ((d) => removeId(d.program[divisionOf(d, issue.id)].issues, issue.id)),
  }
}

export function riskActionRequest(issueId: string, action?: RiskAction): EditRequest {
  const actions = (d: PortalData) => (byId(d.program[divisionOf(d, issueId)].issues, issueId).riskActions ??= [])
  return {
    label: action ? `action ${quote(action.action)}` : 'action',
    isNew: !action,
    fields: [
      { key: 'action', label: 'Action', type: 'textarea', required: true },
      { key: 'owner', label: 'Owner' },
      { key: 'dueDate', label: 'Due', type: 'date' },
      { key: 'actionStatus', label: 'Action Status', type: 'select', required: true, options: ACTION_STATUS },
      ATTENTION,
    ],
    value: action ? { ...action } : { actionStatus: 'open' },
    save: (d, v) => {
      const list = actions(d)
      const next: RiskAction = {
        id: action?.id ?? uid(),
        action: str(v.action), owner: str(v.owner), dueDate: str(v.dueDate),
        actionStatus: v.actionStatus as RiskAction['actionStatus'],
        needsPremeraAttention: flag(v.needsPremeraAttention),
      }
      if (action) list[indexOf(list, action.id)] = next
      else list.push(next)
    },
    remove: action && ((d) => removeId(actions(d), action.id)),
  }
}

// ─── Transition ───────────────────────────────────────────────────────────────
// These rows have no ids (as in the workbook), so they're addressed by position. Safe because
// a save only applies to the exact version it was made on (If-Match).

export function transitionHeaderRequest(t: TransitionData): EditRequest {
  return {
    label: 'Transition header',
    fields: [
      { key: 'asOf', label: 'Transition As-Of Date', type: 'date', strictDate: true },
      { key: 'overallStatus', label: 'Transition Overall Status', type: 'status', required: true },
      { key: 'overview', label: 'Transition Overall Summary', type: 'textarea' },
    ],
    value: { asOf: t.asOf, overallStatus: t.overallStatus, overview: t.summary.overallStatus },
    save: (d, v) => {
      const x = tr(d)
      x.asOf = str(v.asOf)
      x.overallStatus = v.overallStatus as StatusKey
      x.summary.overallStatus = str(v.overview)
    },
  }
}

type ContactGroup = 'premeraContacts' | 'ustContacts'
export function contactRequest(group: ContactGroup, index?: number, c?: TransitionContact): EditRequest {
  const who = group === 'premeraContacts' ? 'Premera' : 'UST'
  return {
    label: c ? `${who} contact ${quote(c.role)}` : `${who} contact`,
    isNew: !c,
    fields: [{ key: 'role', label: 'Role', required: true }, { key: 'name', label: 'Name', required: true }, ATTENTION],
    value: c ? { ...c } : {},
    save: (d, v) => {
      const next = { role: str(v.role), name: str(v.name), needsPremeraAttention: flag(v.needsPremeraAttention) }
      const list = tr(d)[group]
      if (c) list[index!] = next
      else list.push(next)
    },
    remove: c && ((d) => { tr(d)[group].splice(index!, 1) }),
  }
}

type SummaryList = 'accomplishments' | 'risks' | 'executiveFocus'
const SUMMARY_LABEL: Record<SummaryList, string> = { accomplishments: 'key accomplishment', risks: 'key risk', executiveFocus: 'executive focus item' }

/** Accomplishment / risk / focus lines are plain strings; Premera visibility is the premeraVisible text list. */
export function summaryLineRequest(t: TransitionData, list: SummaryList, index?: number): EditRequest {
  const text = index === undefined ? undefined : t.summary[list][index]
  return {
    label: text ? `${SUMMARY_LABEL[list]} ${quote(text)}` : SUMMARY_LABEL[list],
    isNew: text === undefined,
    fields: [{ key: 'text', label: 'Text', type: 'textarea', required: true }, ATTENTION],
    value: { text, needsPremeraAttention: text !== undefined && t.summary.premeraVisible?.includes(text) },
    save: (d, v) => {
      const s = tr(d).summary
      const next = str(v.text)
      const visible = (s.premeraVisible ?? []).filter((x) => x !== text)
      if (v.needsPremeraAttention) visible.push(next)
      s.premeraVisible = visible
      if (text !== undefined) s[list][index!] = next
      else s[list].push(next)
    },
    remove: text !== undefined ? (d) => {
      const s = tr(d).summary
      s[list].splice(index!, 1)
      s.premeraVisible = (s.premeraVisible ?? []).filter((x) => x !== text)
    } : undefined,
  }
}

export function priorityRequest(t: TransitionData, index?: number): EditRequest {
  const p = index === undefined ? undefined : t.summary.priorities[index]
  return {
    label: p ? `upcoming priority ${quote(p.title || p.text)}` : 'upcoming priority',
    isNew: !p,
    fields: [{ key: 'title', label: 'Title' }, { key: 'text', label: 'Text', type: 'textarea', required: true }, ATTENTION],
    value: p ? { ...p } : {},
    save: (d, v) => {
      const next = { title: str(v.title), text: str(v.text), needsPremeraAttention: flag(v.needsPremeraAttention) }
      const list = tr(d).summary.priorities
      if (p) list[index!] = next
      else list.push(next)
    },
    remove: p && ((d) => { tr(d).summary.priorities.splice(index!, 1) }),
  }
}

const DASHBOARD_FIELDS: Field[] = [
  { key: 'tower', label: 'Tower', required: true },
  { key: 'workstream', label: 'Workstream', required: true },
  { key: 'planningStatus', label: 'Planning Status', type: 'status', required: true },
  { key: 'planningStart', label: 'Planning Start', type: 'date' },
  { key: 'sowSubmit', label: 'SOW Submit', type: 'date' },
  { key: 'sowApproval', label: 'SOW Approval', type: 'date' },
  { key: 'onboardingComplete', label: 'Onboarding Complete', type: 'date' },
  { key: 'transitionStatus', label: 'Transition Status (N/A = phase does not apply)', type: 'status' },
  { key: 'transitionStart', label: 'Transition Start', type: 'date' },
  { key: 'goLive', label: 'Go-Live', type: 'date' },
  { key: 'notes', label: 'Notes', type: 'lines' },
  { key: 'alertNotes', label: 'Alert Notes (shown in red)', type: 'lines' },
  ATTENTION,
]

export function dashboardRowRequest(t: TransitionData, g?: number, i?: number): EditRequest {
  const tower = g === undefined ? undefined : t.dashboard[g].tower
  const row = g === undefined || i === undefined ? undefined : t.dashboard[g].rows[i]
  return {
    label: row ? `dashboard row ${quote(row.workstream)}` : 'dashboard row',
    isNew: !row,
    fields: DASHBOARD_FIELDS,
    value: row ? {
      tower, workstream: row.workstream,
      planningStatus: row.planning.status, planningStart: row.planning.start, sowSubmit: row.planning.sowSubmit,
      sowApproval: row.planning.sowApproval, onboardingComplete: row.planning.onboardingComplete,
      transitionStatus: row.transition.status ?? '', transitionStart: row.transition.start, goLive: row.transition.goLive,
      notes: (row.notes ?? []).filter((n) => !n.alert).map((n) => n.text),
      alertNotes: (row.notes ?? []).filter((n) => n.alert).map((n) => n.text),
      needsPremeraAttention: row.needsPremeraAttention,
    } : { tower, planningStatus: 'notStarted' },
    save: (d, v) => {
      const groups = tr(d).dashboard
      const notes = [
        ...(v.notes as string[]).map((text) => ({ text })),
        ...(v.alertNotes as string[]).map((text) => ({ text, alert: true })),
      ]
      const next: DashboardRow = {
        ...row,
        workstream: str(v.workstream),
        planning: {
          status: v.planningStatus as StatusKey, start: str(v.planningStart), sowSubmit: str(v.sowSubmit),
          sowApproval: str(v.sowApproval), onboardingComplete: str(v.onboardingComplete),
        },
        transition: { status: (str(v.transitionStatus) || null) as StatusKey | null, start: str(v.transitionStart), goLive: str(v.goLive) },
        notes: notes.length ? notes : undefined,
        needsPremeraAttention: flag(v.needsPremeraAttention),
      }
      const towerName = str(v.tower)
      if (row && towerName === tower) { groups[g!].rows[i!] = next; return }
      if (row) {
        groups[g!].rows.splice(i!, 1)
        if (!groups[g!].rows.length) groups.splice(g!, 1)
      }
      const group = groups.find((x) => x.tower === towerName)
      if (group) group.rows.push(next)
      else groups.push({ tower: towerName, rows: [next] })
    },
    remove: row && ((d) => {
      const groups = tr(d).dashboard
      groups[g!].rows.splice(i!, 1)
      if (!groups[g!].rows.length) groups.splice(g!, 1)
    }),
  }
}

export function raidRequest(t: TransitionData, index?: number): EditRequest {
  const r = index === undefined ? undefined : t.raid[index]
  return {
    label: r ? `RAID item ${quote(r.description)}` : 'RAID item',
    isNew: !r,
    fields: [
      { key: 'type', label: 'RAID', type: 'select', required: true, options: RAID_TYPE },
      { key: 'description', label: 'Description', type: 'textarea', required: true },
      { key: 'mitigation', label: 'Mitigation Plan', type: 'lines' },
      { key: 'owner', label: 'Owner' },
      { key: 'dueDate', label: 'Due Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: RAID_STATUS },
      ATTENTION,
    ],
    value: r ? { ...r } : { type: 'R', status: 'Open' },
    save: (d, v) => {
      const next: RaidItem = {
        type: v.type as RaidItem['type'], description: str(v.description), mitigation: v.mitigation as string[],
        owner: str(v.owner), dueDate: str(v.dueDate), status: str(v.status), needsPremeraAttention: flag(v.needsPremeraAttention),
      }
      const list = tr(d).raid
      if (r) list[index!] = next
      else list.push(next)
    },
    remove: r && ((d) => { tr(d).raid.splice(index!, 1) }),
  }
}

