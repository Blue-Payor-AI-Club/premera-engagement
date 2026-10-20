// Central, editable content model for the portal.
// Every <<placeholder>> field on the slides resolves from here.
// The Admin page edits this; it persists to localStorage and is the same
// shape the backend API is expected to serve (see /API.md).

import type { StatusKey } from './status'
import type { TransitionData } from './transitionData'

export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

export interface MilestoneRow {
  id: string
  label: string
  due: string
  revised: string
  status: StatusKey
}

export interface MilestoneSection {
  id: string
  title: string
  rows: MilestoneRow[]
}

export type ActionStatus = 'open' | 'inProgress' | 'closed'

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low'

export interface RiskAction {
  id: string
  action: string
  owner: string
  dueDate: string
  actionStatus: ActionStatus
}

export interface IssueRow {
  id: string
  issue: string
  mitigations: string[]
  date: string
  status: StatusKey
  needsPremeraAttention?: boolean
  riskActions?: RiskAction[]
  severity?: SeverityLevel
  priority?: SeverityLevel
}

export interface TowerGoLive {
  id: string
  name: string
  goLive: string
  status: StatusKey
}

// Icon keys map to lucide components in ProgramLevel.tsx
export type WorkstreamIcon =
  | 'share2'
  | 'userCog'
  | 'arrowLeftRight'
  | 'truck'
  | 'building2'
  | 'shieldCheck'
  | 'clipboardCheck'

export interface Workstream {
  id: string
  icon: WorkstreamIcon
  name: string
  status: StatusKey
  statusMessage?: string
  needsPremeraAttention?: boolean
  accomplishments: string[]
  activities: string[]
  milestones?: MilestoneSection[]
}

export interface ProgramTab {
  levelLabel: string
  workstreams: Workstream[]
  towers: TowerGoLive[]
  milestones: MilestoneSection[]
  issues: IssueRow[]
}

export interface PortalData {
  asOf: string
  program: {
    ito: ProgramTab
    bpo: ProgramTab
  }
  tower: {
    levelLabel: string
    accomplishments: string[]
    activities: string[]
    milestones: MilestoneSection[]
    keyActivities: MilestoneSection[]
    issues: IssueRow[]
  }
  /** The Transition tab of /program. Synced from the Excel workbook like everything else.
   * Optional only so a response from an API that predates it (or a stale cached copy) falls
   * back to the bundled TRANSITION_DATA instead of breaking the page. */
  transition?: TransitionData
}

const fill = (text: string, n: number) => Array.from({ length: n }, () => text)

export const DEFAULT_PORTAL_DATA: PortalData = {
  asOf: 'DD/MM/YYYY',
  program: {
    ito: {
      levelLabel: '<<ITO Program Level>>',
      workstreams: [
        { id: 'ws1', icon: 'share2', name: 'Communications & Change Management', status: 'onTrack', statusMessage: 'All communications milestones met on schedule; stakeholder engagement is strong.', accomplishments: fill('<<accomplishment>>', 2), activities: fill('<<planned activity>>', 2), milestones: [{ id: 'ws1m1', title: 'Phase 1 – Planning', rows: [{ id: 'ws1r1', label: 'Communications Plan Approved', due: '1/15/2025', revised: '1/20/2025', status: 'complete' }, { id: 'ws1r2', label: 'Stakeholder Briefing Deck Finalized', due: '1/28/2025', revised: '', status: 'complete' }, { id: 'ws1r3', label: 'Change Impact Assessment Complete', due: '2/14/2025', revised: '', status: 'complete' }] }, { id: 'ws1m2', title: 'Phase 2 – Execution', rows: [{ id: 'ws1r4', label: 'Town Hall Sessions Conducted', due: '3/10/2025', revised: '', status: 'onTrack' }, { id: 'ws1r5', label: 'Post-Transition Communications Issued', due: '4/15/2025', revised: '', status: 'onTrack' }] }] },
        { id: 'ws2', icon: 'userCog', name: 'HR Conversion', status: 'onTrack', statusMessage: 'Employee records transferred and benefits enrollment completed on time.', accomplishments: fill('<<accomplishment>>', 2), activities: fill('<<planned activity>>', 2), milestones: [{ id: 'ws2m1', title: 'Pre-Conversion', rows: [{ id: 'ws2r1', label: 'Employee Records Transfer', due: '1/31/2025', revised: '2/5/2025', status: 'complete' }, { id: 'ws2r2', label: 'Benefits Enrollment Complete', due: '2/28/2025', revised: '', status: 'complete' }, { id: 'ws2r3', label: 'Offer Letters Executed', due: '3/1/2025', revised: '', status: 'complete' }] }, { id: 'ws2m2', title: 'Post-Conversion', rows: [{ id: 'ws2r4', label: 'Payroll System Migration', due: '3/26/2025', revised: '', status: 'atRisk' }, { id: 'ws2r5', label: 'HR Compliance Audit', due: '4/30/2025', revised: '', status: 'onTrack' }] }] },
        { id: 'ws3', icon: 'arrowLeftRight', name: 'Knowledge Transition/Hiring', status: 'onTrack', statusMessage: 'KT sessions completed successfully; reverse shadow period signed off by both teams.', accomplishments: fill('<<accomplishment>>', 2), activities: fill('<<planned activity>>', 2), milestones: [{ id: 'ws3m1', title: 'Knowledge Transfer', rows: [{ id: 'ws3r1', label: 'KT Schedule Published', due: '1/20/2025', revised: '', status: 'complete' }, { id: 'ws3r2', label: 'Shadow Period Complete', due: '2/21/2025', revised: '2/28/2025', status: 'complete' }, { id: 'ws3r3', label: 'Reverse Shadow Period Complete', due: '3/14/2025', revised: '', status: 'complete' }] }, { id: 'ws3m2', title: 'Hiring & Onboarding', rows: [{ id: 'ws3r4', label: 'Hiring Plan Approved', due: '1/15/2025', revised: '', status: 'complete' }, { id: 'ws3r5', label: 'Open Positions Filled', due: '3/26/2025', revised: '', status: 'onTrack' }, { id: 'ws3r6', label: 'Training Completion Sign-off', due: '3/28/2025', revised: '', status: 'onTrack' }] }] },
        { id: 'ws4', icon: 'truck', name: 'Delivery & Operational Continuity', status: 'atRisk', needsPremeraAttention: true, statusMessage: 'Parallel run period delayed due to incomplete operational runbooks; SLA sign-off at risk.', accomplishments: fill('<<accomplishment>>', 3), activities: fill('<<planned activity>>', 2), milestones: [{ id: 'ws4m1', title: 'Operational Readiness', rows: [{ id: 'ws4r1', label: 'SLA Baseline Established', due: '2/7/2025', revised: '2/14/2025', status: 'complete' }, { id: 'ws4r2', label: 'Operational Runbooks Finalized', due: '3/1/2025', revised: '', status: 'atRisk' }, { id: 'ws4r3', label: 'Escalation Matrix Approved', due: '3/10/2025', revised: '', status: 'onTrack' }] }, { id: 'ws4m2', title: 'Continuity Validation', rows: [{ id: 'ws4r4', label: 'Parallel Run Period', due: '3/26/2025', revised: '', status: 'atRisk' }, { id: 'ws4r5', label: 'Continuity Sign-off', due: '4/1/2025', revised: '', status: 'onTrack' }] }] },
        { id: 'ws5', icon: 'building2', name: 'Infrastructure & Facilities', status: 'atRisk', needsPremeraAttention: true, statusMessage: 'Workstation provisioning and VPN configuration behind schedule; facility readiness may impact Day One.', accomplishments: fill('<<accomplishment>>', 2), activities: fill('<<planned activity>>', 2), milestones: [{ id: 'ws5m1', title: 'Infrastructure Setup', rows: [{ id: 'ws5r1', label: 'Network Connectivity Verified', due: '2/10/2025', revised: '2/21/2025', status: 'complete' }, { id: 'ws5r2', label: 'Workstation Provisioning Complete', due: '3/1/2025', revised: '', status: 'atRisk' }, { id: 'ws5r3', label: 'VPN / Remote Access Configured', due: '3/10/2025', revised: '', status: 'atRisk' }] }, { id: 'ws5m2', title: 'Facilities', rows: [{ id: 'ws5r4', label: 'Facility Access Badge Issuance', due: '3/15/2025', revised: '', status: 'onTrack' }, { id: 'ws5r5', label: 'Seating Plan Finalized', due: '3/20/2025', revised: '', status: 'onTrack' }] }] },
        { id: 'ws6', icon: 'shieldCheck', name: 'Information Security', status: 'onTrack', statusMessage: 'Security assessment and access controls completed; compliance review on track for sign-off.', accomplishments: fill('<<accomplishment>>', 2), activities: fill('<<planned activity>>', 2), milestones: [{ id: 'ws6m1', title: 'Security Assessment', rows: [{ id: 'ws6r1', label: 'Security Risk Assessment Complete', due: '1/31/2025', revised: '', status: 'complete' }, { id: 'ws6r2', label: 'Data Classification Reviewed', due: '2/14/2025', revised: '', status: 'complete' }, { id: 'ws6r3', label: 'Access Controls Configured', due: '3/1/2025', revised: '', status: 'complete' }] }, { id: 'ws6m2', title: 'Compliance', rows: [{ id: 'ws6r4', label: 'Compliance Review Sign-off', due: '3/20/2025', revised: '', status: 'onTrack' }, { id: 'ws6r5', label: 'Security Awareness Training Done', due: '3/26/2025', revised: '', status: 'onTrack' }] }] },
        { id: 'ws7', icon: 'clipboardCheck', name: 'Day One Readiness', status: 'onTrack', statusMessage: 'Day One checklist approved and dry run complete; command center is ready for go-live.', accomplishments: fill('<<accomplishment>>', 2), activities: fill('<<planned activity>>', 2), milestones: [{ id: 'ws7m1', title: 'Pre Go-Live', rows: [{ id: 'ws7r1', label: 'Day One Checklist Approved', due: '3/15/2025', revised: '', status: 'complete' }, { id: 'ws7r2', label: 'Command Center Setup', due: '3/25/2025', revised: '', status: 'onTrack' }, { id: 'ws7r3', label: 'Go-Live Dry Run Complete', due: '3/28/2025', revised: '', status: 'onTrack' }] }, { id: 'ws7m2', title: 'Go-Live', rows: [{ id: 'ws7r4', label: 'Service Commencement', due: '4/1/2025', revised: '', status: 'onTrack' }, { id: 'ws7r5', label: 'Hypercare Period Initiated', due: '4/1/2025', revised: '', status: 'onTrack' }] }] },
      ],
      towers: [
        { id: 'tg1', name: 'ITO', goLive: '4/1/2025', status: 'onTrack' },
        { id: 'tg2', name: 'BPO', goLive: '4/1/2025', status: 'onTrack' },
      ],
      milestones: [
        {
          id: 'pm1',
          title: 'Critical Transition Milestones',
          rows: [
            { id: 'pmr1', label: "SOW's Approved", due: '1/16/2025', revised: '1/27/2025', status: 'complete' },
            { id: 'pmr2', label: 'Transition Plan', due: '1/22/2025', revised: '1/28/2025', status: 'complete' },
            { id: 'pmr3', label: 'Associates/Contractor Communications', due: '2/10/2025', revised: '2/10/2025', status: 'complete' },
            { id: 'pmr4', label: 'Phase 1 Activities Completed', due: '3/26/2025', revised: '', status: 'onTrack' },
            { id: 'pmr5', label: 'Service Commencement Date', due: '4/1/2025', revised: '', status: 'onTrack' },
          ],
        },
        {
          id: 'pm2',
          title: 'Phase 1 Pre-Commencement Date Activités',
          rows: [
            { id: 'pmr6', label: 'Transition Planning/Plan', due: '1/25/2025', revised: '1/28/2025', status: 'complete' },
            { id: 'pmr7', label: 'Associates/Contractor Communications', due: '2/10/2025', revised: '', status: 'complete' },
            { id: 'pmr8', label: 'Contractor Transition', due: '3/26/2025', revised: '', status: 'atRisk' },
            { id: 'pmr9', label: 'eBiz Service Desk Transition', due: '3/26/2025', revised: '', status: 'onTrack' },
            { id: 'pmr10', label: 'Document As-Is PPM standards', due: '3/26/2025', revised: '', status: 'onTrack' },
            { id: 'pmr11', label: 'SLA Reporting Plan/Prep/Alignment', due: '3/26/2025', revised: '', status: 'atRisk' },
            { id: 'pmr12', label: 'Infrastructure Connectivity Readiness', due: '3/26/2025', revised: '', status: 'onTrack' },
            { id: 'pmr13', label: 'Automation Assessment', due: '3/26/2025', revised: '', status: 'onTrack' },
          ],
        },
        {
          id: 'pm3',
          title: 'Phase 2 Post-Commencement Date Activités',
          rows: [
            { id: 'pmr14', label: 'Service Stability', due: '4/1/2025', revised: '', status: 'onTrack' },
            { id: 'pmr15', label: 'Work Volume Baselining', due: '9/30/2025', revised: '', status: 'onTrack' },
            { id: 'pmr16', label: 'Implementing Process Standardizations', due: '8/1/2025', revised: '', status: 'onTrack' },
            { id: 'pmr17', label: 'PPM final version', due: '7/1/2025', revised: '', status: 'onTrack' },
          ],
        },
      ],
      issues: [
        { id: 'pi1', issue: 'Operational Runbooks not finalized — Premera SME sign-off required before parallel run can commence', mitigations: ['Schedule dedicated review sessions with Premera operations leads this week', 'Identify gaps in runbook coverage and assign UST authors per workstream'], date: '3/1', status: 'atRisk', needsPremeraAttention: true, severity: 'high', priority: 'high', riskActions: [{ id: 'ra1', action: 'Premera Ops lead to review and approve runbook drafts', owner: 'Premera Operations', dueDate: '3/8', actionStatus: 'open' }, { id: 'ra2', action: 'UST team to fill identified runbook gaps (sections 4–7)', owner: 'UST Delivery Lead', dueDate: '3/5', actionStatus: 'inProgress' }] },
        { id: 'pi2', issue: 'SLA Reporting Plan / Prep / Alignment not agreed — baseline metrics pending Premera confirmation', mitigations: ['Circulate draft SLA baseline document to Premera stakeholders for review', 'Hold alignment workshop to agree on KPIs and reporting cadence'], date: '3/26', status: 'atRisk', needsPremeraAttention: true, severity: 'high', priority: 'medium', riskActions: [{ id: 'ra3', action: 'Premera to confirm SLA metric definitions and thresholds', owner: 'Premera Program Manager', dueDate: '3/15', actionStatus: 'open' }, { id: 'ra4', action: 'UST to prepare SLA reporting dashboard mock-up for review', owner: 'UST Analytics', dueDate: '3/12', actionStatus: 'inProgress' }] },
        { id: 'pi3', issue: 'Payroll system migration testing incomplete — risk of payroll disruption at go-live if not resolved', mitigations: ['Accelerate UAT cycles with extended test windows over the next two sprints', 'Engage payroll vendor for dedicated support during parallel run period'], date: '3/26', status: 'atRisk', severity: 'critical', priority: 'high', riskActions: [{ id: 'ra5', action: 'Complete UAT for payroll edge cases (terminations, retroactive adjustments)', owner: 'UST HR Workstream', dueDate: '3/20', actionStatus: 'inProgress' }] },
        { id: 'pi4', issue: 'Contractor Transition milestone at risk — three contractors yet to sign amended agreements', mitigations: ['Escalate to legal teams on both sides to expedite contract amendments', 'Identify interim coverage plan if contractor transition slips past 3/26'], date: '3/26', status: 'atRisk', severity: 'medium', priority: 'medium', riskActions: [] },
      ],
    },
    bpo: {
      levelLabel: '<<BPO Program Level>>',
      workstreams: [
        { id: 'bws1', icon: 'share2', name: 'Communications & Change Management', status: 'onTrack', statusMessage: 'All communications milestones met on schedule; stakeholder engagement is strong.', accomplishments: fill('<<accomplishment>>', 2), activities: fill('<<planned activity>>', 2), milestones: [{ id: 'bws1m1', title: 'Phase 1 – Planning', rows: [{ id: 'bws1r1', label: 'Communications Plan Approved', due: '1/15/2025', revised: '1/20/2025', status: 'complete' }, { id: 'bws1r2', label: 'Stakeholder Briefing Deck Finalized', due: '1/28/2025', revised: '', status: 'complete' }, { id: 'bws1r3', label: 'Change Impact Assessment Complete', due: '2/14/2025', revised: '', status: 'complete' }] }, { id: 'bws1m2', title: 'Phase 2 – Execution', rows: [{ id: 'bws1r4', label: 'Town Hall Sessions Conducted', due: '3/10/2025', revised: '', status: 'onTrack' }, { id: 'bws1r5', label: 'Post-Transition Communications Issued', due: '4/15/2025', revised: '', status: 'onTrack' }] }] },
        { id: 'bws2', icon: 'userCog', name: 'HR Conversion', status: 'onTrack', statusMessage: 'Employee records transferred and benefits enrollment completed on time.', accomplishments: fill('<<accomplishment>>', 2), activities: fill('<<planned activity>>', 2), milestones: [{ id: 'bws2m1', title: 'Pre-Conversion', rows: [{ id: 'bws2r1', label: 'Employee Records Transfer', due: '1/31/2025', revised: '2/5/2025', status: 'complete' }, { id: 'bws2r2', label: 'Benefits Enrollment Complete', due: '2/28/2025', revised: '', status: 'complete' }, { id: 'bws2r3', label: 'Offer Letters Executed', due: '3/1/2025', revised: '', status: 'complete' }] }, { id: 'bws2m2', title: 'Post-Conversion', rows: [{ id: 'bws2r4', label: 'Payroll System Migration', due: '3/26/2025', revised: '', status: 'atRisk' }, { id: 'bws2r5', label: 'HR Compliance Audit', due: '4/30/2025', revised: '', status: 'onTrack' }] }] },
        { id: 'bws3', icon: 'arrowLeftRight', name: 'Knowledge Transition/Hiring', status: 'onTrack', statusMessage: 'KT sessions completed successfully; reverse shadow period signed off by both teams.', accomplishments: fill('<<accomplishment>>', 2), activities: fill('<<planned activity>>', 2), milestones: [{ id: 'bws3m1', title: 'Knowledge Transfer', rows: [{ id: 'bws3r1', label: 'KT Schedule Published', due: '1/20/2025', revised: '', status: 'complete' }, { id: 'bws3r2', label: 'Shadow Period Complete', due: '2/21/2025', revised: '2/28/2025', status: 'complete' }, { id: 'bws3r3', label: 'Reverse Shadow Period Complete', due: '3/14/2025', revised: '', status: 'complete' }] }, { id: 'bws3m2', title: 'Hiring & Onboarding', rows: [{ id: 'bws3r4', label: 'Hiring Plan Approved', due: '1/15/2025', revised: '', status: 'complete' }, { id: 'bws3r5', label: 'Open Positions Filled', due: '3/26/2025', revised: '', status: 'onTrack' }, { id: 'bws3r6', label: 'Training Completion Sign-off', due: '3/28/2025', revised: '', status: 'onTrack' }] }] },
        { id: 'bws4', icon: 'truck', name: 'Delivery & Operational Continuity', status: 'atRisk', needsPremeraAttention: true, statusMessage: 'Parallel run period delayed due to incomplete operational runbooks; SLA sign-off at risk.', accomplishments: fill('<<accomplishment>>', 3), activities: fill('<<planned activity>>', 2), milestones: [{ id: 'bws4m1', title: 'Operational Readiness', rows: [{ id: 'bws4r1', label: 'SLA Baseline Established', due: '2/7/2025', revised: '2/14/2025', status: 'complete' }, { id: 'bws4r2', label: 'Operational Runbooks Finalized', due: '3/1/2025', revised: '', status: 'atRisk' }, { id: 'bws4r3', label: 'Escalation Matrix Approved', due: '3/10/2025', revised: '', status: 'onTrack' }] }, { id: 'bws4m2', title: 'Continuity Validation', rows: [{ id: 'bws4r4', label: 'Parallel Run Period', due: '3/26/2025', revised: '', status: 'atRisk' }, { id: 'bws4r5', label: 'Continuity Sign-off', due: '4/1/2025', revised: '', status: 'onTrack' }] }] },
        { id: 'bws5', icon: 'building2', name: 'Infrastructure & Facilities', status: 'atRisk', needsPremeraAttention: true, statusMessage: 'Workstation provisioning and VPN configuration behind schedule; facility readiness may impact Day One.', accomplishments: fill('<<accomplishment>>', 2), activities: fill('<<planned activity>>', 2), milestones: [{ id: 'bws5m1', title: 'Infrastructure Setup', rows: [{ id: 'bws5r1', label: 'Network Connectivity Verified', due: '2/10/2025', revised: '2/21/2025', status: 'complete' }, { id: 'bws5r2', label: 'Workstation Provisioning Complete', due: '3/1/2025', revised: '', status: 'atRisk' }, { id: 'bws5r3', label: 'VPN / Remote Access Configured', due: '3/10/2025', revised: '', status: 'atRisk' }] }, { id: 'bws5m2', title: 'Facilities', rows: [{ id: 'bws5r4', label: 'Facility Access Badge Issuance', due: '3/15/2025', revised: '', status: 'onTrack' }, { id: 'bws5r5', label: 'Seating Plan Finalized', due: '3/20/2025', revised: '', status: 'onTrack' }] }] },
        { id: 'bws6', icon: 'shieldCheck', name: 'Information Security', status: 'onTrack', statusMessage: 'Security assessment and access controls completed; compliance review on track for sign-off.', accomplishments: fill('<<accomplishment>>', 2), activities: fill('<<planned activity>>', 2), milestones: [{ id: 'bws6m1', title: 'Security Assessment', rows: [{ id: 'bws6r1', label: 'Security Risk Assessment Complete', due: '1/31/2025', revised: '', status: 'complete' }, { id: 'bws6r2', label: 'Data Classification Reviewed', due: '2/14/2025', revised: '', status: 'complete' }, { id: 'bws6r3', label: 'Access Controls Configured', due: '3/1/2025', revised: '', status: 'complete' }] }, { id: 'bws6m2', title: 'Compliance', rows: [{ id: 'bws6r4', label: 'Compliance Review Sign-off', due: '3/20/2025', revised: '', status: 'onTrack' }, { id: 'bws6r5', label: 'Security Awareness Training Done', due: '3/26/2025', revised: '', status: 'onTrack' }] }] },
        { id: 'bws7', icon: 'clipboardCheck', name: 'Day One Readiness', status: 'onTrack', statusMessage: 'Day One checklist approved and dry run complete; command center is ready for go-live.', accomplishments: fill('<<accomplishment>>', 2), activities: fill('<<planned activity>>', 2), milestones: [{ id: 'bws7m1', title: 'Pre Go-Live', rows: [{ id: 'bws7r1', label: 'Day One Checklist Approved', due: '3/15/2025', revised: '', status: 'complete' }, { id: 'bws7r2', label: 'Command Center Setup', due: '3/25/2025', revised: '', status: 'onTrack' }, { id: 'bws7r3', label: 'Go-Live Dry Run Complete', due: '3/28/2025', revised: '', status: 'onTrack' }] }, { id: 'bws7m2', title: 'Go-Live', rows: [{ id: 'bws7r4', label: 'Service Commencement', due: '4/1/2025', revised: '', status: 'onTrack' }, { id: 'bws7r5', label: 'Hypercare Period Initiated', due: '4/1/2025', revised: '', status: 'onTrack' }] }] },
      ],
      towers: [
        { id: 'btg1', name: 'ITO', goLive: '4/1/2025', status: 'onTrack' },
        { id: 'btg2', name: 'BPO', goLive: '4/1/2025', status: 'onTrack' },
      ],
      milestones: [
        {
          id: 'bpm1',
          title: 'Critical Transition Milestones',
          rows: [
            { id: 'bpmr1', label: "SOW's Approved", due: '1/16/2025', revised: '1/27/2025', status: 'complete' },
            { id: 'bpmr2', label: 'Transition Plan', due: '1/22/2025', revised: '1/28/2025', status: 'complete' },
            { id: 'bpmr3', label: 'Associates/Contractor Communications', due: '2/10/2025', revised: '2/10/2025', status: 'complete' },
            { id: 'bpmr4', label: 'Phase 1 Activities Completed', due: '3/26/2025', revised: '', status: 'onTrack' },
            { id: 'bpmr5', label: 'Service Commencement Date', due: '4/1/2025', revised: '', status: 'onTrack' },
          ],
        },
        {
          id: 'bpm2',
          title: 'Phase 1 Pre-Commencement Date Activités',
          rows: [
            { id: 'bpmr6', label: 'Transition Planning/Plan', due: '1/25/2025', revised: '1/28/2025', status: 'complete' },
            { id: 'bpmr7', label: 'Associates/Contractor Communications', due: '2/10/2025', revised: '', status: 'complete' },
            { id: 'bpmr8', label: 'Contractor Transition', due: '3/26/2025', revised: '', status: 'atRisk' },
            { id: 'bpmr9', label: 'eBiz Service Desk Transition', due: '3/26/2025', revised: '', status: 'onTrack' },
            { id: 'bpmr10', label: 'Document As-Is PPM standards', due: '3/26/2025', revised: '', status: 'onTrack' },
            { id: 'bpmr11', label: 'SLA Reporting Plan/Prep/Alignment', due: '3/26/2025', revised: '', status: 'atRisk' },
            { id: 'bpmr12', label: 'Infrastructure Connectivity Readiness', due: '3/26/2025', revised: '', status: 'onTrack' },
            { id: 'bpmr13', label: 'Automation Assessment', due: '3/26/2025', revised: '', status: 'onTrack' },
          ],
        },
        {
          id: 'bpm3',
          title: 'Phase 2 Post-Commencement Date Activités',
          rows: [
            { id: 'bpmr14', label: 'Service Stability', due: '4/1/2025', revised: '', status: 'onTrack' },
            { id: 'bpmr15', label: 'Work Volume Baselining', due: '9/30/2025', revised: '', status: 'onTrack' },
            { id: 'bpmr16', label: 'Implementing Process Standardizations', due: '8/1/2025', revised: '', status: 'onTrack' },
            { id: 'bpmr17', label: 'PPM final version', due: '7/1/2025', revised: '', status: 'onTrack' },
          ],
        },
      ],
      issues: [
        { id: 'bpi1', issue: 'Workstation provisioning behind schedule — 47 of 120 workstations not yet imaged; Day One readiness at risk', mitigations: ['Engage additional imaging resources from Premera IT to run parallel provisioning tracks', 'Prioritize critical-path staff workstations for Day One and defer non-critical to week 2'], date: '3/15', status: 'atRisk', needsPremeraAttention: true, severity: 'high', priority: 'high', riskActions: [{ id: 'bra1', action: 'Premera IT to allocate two additional imaging technicians through 3/15', owner: 'Premera IT Infrastructure', dueDate: '3/8', actionStatus: 'open' }, { id: 'bra2', action: 'UST to deliver final prioritized provisioning list by role/function', owner: 'UST Infrastructure Lead', dueDate: '3/5', actionStatus: 'inProgress' }] },
        { id: 'bpi2', issue: 'VPN / Remote Access configuration delays — remote staff unable to complete connectivity testing', mitigations: ['Coordinate with Premera network team to expedite VPN profile deployment', 'Set up temporary on-site access for remote staff during testing window'], date: '3/10', status: 'atRisk', needsPremeraAttention: true, severity: 'high', priority: 'medium', riskActions: [{ id: 'bra3', action: 'Premera Network team to deploy VPN profiles for UST staff by 3/10', owner: 'Premera Network Operations', dueDate: '3/10', actionStatus: 'open' }, { id: 'bra4', action: 'Arrange temporary on-site workspace for 15 affected remote UST staff', owner: 'UST Facilities', dueDate: '3/7', actionStatus: 'inProgress' }] },
        { id: 'bpi3', issue: 'eBiz Service Desk tool access not provisioned — UST agents cannot begin shadow training', mitigations: ['Raise priority access request with Premera IT security for expedited provisioning', 'Begin conceptual training using screen recordings while access is pending'], date: '3/26', status: 'atRisk', severity: 'medium', priority: 'high', riskActions: [{ id: 'bra5', action: 'Premera IT Security to complete access provisioning for 32 UST agents', owner: 'Premera IT Security', dueDate: '3/12', actionStatus: 'open' }] },
        { id: 'bpi4', issue: 'Process documentation for BPO workstreams incomplete — 8 of 22 SOPs not yet drafted by Premera subject matter experts', mitigations: ['Schedule daily SOP review stand-ups with Premera SMEs to accelerate drafting', 'UST BPO leads to shadow Premera staff and draft SOPs in parallel for SME review'], date: '3/26', status: 'atRisk', severity: 'medium', priority: 'medium', riskActions: [] },
      ],
    },
  },
  tower: {
    levelLabel: '<<Tower Level>>',
    accomplishments: fill('<<key accomplishment>>', 9),
    activities: fill('<<planned activity>>', 11),
    milestones: [
      {
        id: 'tm1',
        title: 'Critical Transition Milestones',
        rows: [
          { id: 'tmr1', label: "SOW's Approved", due: '1/16/2025', revised: '1/27/2025', status: 'complete' },
          { id: 'tmr2', label: 'Transition Plan', due: '1/22/2025', revised: '1/28/2025', status: 'complete' },
          { id: 'tmr3', label: 'Associates/Contractor Communications', due: '2/10/2025', revised: '', status: 'complete' },
          { id: 'tmr4', label: 'Phase 1 Activities Completed', due: '3/26/2025', revised: '', status: 'onTrack' },
          { id: 'tmr5', label: 'Service Commencement Date', due: '4/1/2025', revised: '', status: 'onTrack' },
        ],
      },
    ],
    keyActivities: [
      {
        id: 'ta1',
        title: 'Phase 1 Pre-Commencement Date Activités',
        rows: [
          { id: 'tar1', label: 'Transition Planning/Plan', due: '1/25/2025', revised: '1/28/2025', status: 'complete' },
          { id: 'tar2', label: 'Associates/Contractor Communications', due: '2/10/2025', revised: '', status: 'complete' },
          { id: 'tar3', label: 'Contractor Transition', due: '3/26/2025', revised: '', status: 'onTrack' },
          { id: 'tar4', label: 'eBiz Service Desk Transition', due: '3/26/2025', revised: '', status: 'atRisk' },
          { id: 'tar5', label: 'Document As-Is PPM standards', due: '3/26/2025', revised: '', status: 'onTrack' },
          { id: 'tar6', label: 'SLA Reporting Plan/Prep/Alignment', due: '3/26/2025', revised: '', status: 'onTrack' },
          { id: 'tar7', label: 'Infrastructure Connectivity Readiness', due: '3/26/2025', revised: '', status: 'atRisk' },
          { id: 'tar8', label: 'Automation Assessment', due: '3/26/2025', revised: '', status: 'onTrack' },
        ],
      },
      {
        id: 'ta2',
        title: 'Phase 2 Post-Commencement Date Activités',
        rows: [
          { id: 'tar9', label: 'Service Stability', due: '4/1/2025', revised: '', status: 'onTrack' },
          { id: 'tar10', label: 'Work Volume Collection and PPM', due: '7/1/2025', revised: '', status: 'onTrack' },
          { id: 'tar11', label: 'Implementing Process Standardizations', due: '8/1/2025', revised: '', status: 'onTrack' },
        ],
      },
    ],
    issues: [
      { id: 'ti1', issue: '<<Issue/Risk/Dependency>>', mitigations: ['Mitigation plan / next steps'], date: '2/23', status: 'atRisk', needsPremeraAttention: true, riskActions: [{ id: 'tra1', action: '<<Risk mitigation action>>', owner: '<<Owner>>', dueDate: '3/10', actionStatus: 'open' }] },
      { id: 'ti2', issue: '<<Issue/Risk/Dependency>>', mitigations: ['Mitigation plan / next steps'], date: '2/24', status: 'atRisk', riskActions: [{ id: 'tra2', action: '<<Risk mitigation action>>', owner: '<<Owner>>', dueDate: '3/15', actionStatus: 'inProgress' }] },
      { id: 'ti3', issue: '<<Issue/Risk/Dependency>>', mitigations: ['Mitigation plan / next steps'], date: '2/26', status: 'atRisk', riskActions: [] },
      { id: 'ti4', issue: '<<Issue/Risk/Dependency>>', mitigations: ['Mitigation plan / next steps', 'Mitigation plan / next steps'], date: '2/26', status: 'atRisk', riskActions: [] },
    ],
  },
}
