import type { StatusKey } from './status'

// Content of the "Transition Program" Executive Summary and Dashboard slides, shown on the
// Transition tab of /program. Transcribed verbatim from the source slides (as of 10/08/26),
// including dates exactly as printed there.
//
// The live data comes from the API (PortalData.transition), edited through the Excel sync's
// Transition* sheets like every other tab. This constant is only the FALLBACK shown when
// the API response has no transition block — keep it in step with the API's seed
// (premera-engagement-api/src/seed/defaultTransition.ts). Do not edit it to change what
// users see; change the workbook.

export interface TransitionContact {
  role: string
  name: string
}

export interface SummaryPriority {
  title: string
  text: string
}

export interface ExecutiveSummaryData {
  overallStatus: string
  accomplishments: string[]
  priorities: SummaryPriority[]
  risks: string[]
  executiveFocus: string[]
}

export interface NoteItem {
  text: string
  /** Rendered in red — used for the one call-to-action note on the slide. */
  alert?: boolean
}

export interface PlanningPhase {
  status: StatusKey
  start: string
  sowSubmit: string
  sowApproval: string
  onboardingComplete: string
}

export interface TransitionPhase {
  /** null = the phase does not apply (rendered as "N/A", e.g. contracting rows). */
  status: StatusKey | null
  start: string
  goLive: string
}

export interface DashboardRow {
  workstream: string
  planning: PlanningPhase
  transition: TransitionPhase
  notes?: NoteItem[]
  /** When set, this row's Notes cell is merged down over that many rows in total (itself included). */
  notesRowSpan?: number
}

export interface TowerGroup {
  tower: string
  rows: DashboardRow[]
}

export interface RaidItem {
  type: 'R' | 'A' | 'I' | 'D'
  description: string
  mitigation: string[]
  owner: string
  dueDate: string
  status: string
}

export interface TransitionData {
  asOf: string
  overallStatus: StatusKey
  premeraContacts: TransitionContact[]
  ustContacts: TransitionContact[]
  summary: ExecutiveSummaryData
  dashboard: TowerGroup[]
  raid: RaidItem[]
}

const NA_TRANSITION: TransitionPhase = { status: null, start: 'N/A', goLive: 'N/A' }

export const TRANSITION_DATA: TransitionData = {
  asOf: '10/08/26',
  overallStatus: 'atRisk',

  premeraContacts: [
    { role: 'Premera Program Sponsor', name: 'Wayne Heller' },
    { role: 'Premera Lead', name: 'Daniel Mrozek' },
    { role: 'Premera Program Manager', name: 'Emma Polivka' },
  ],
  ustContacts: [
    { role: 'UST Account Manager', name: 'Rejith Raveendran' },
    { role: 'UST Delivery Lead', name: 'Brian Holman' },
    { role: 'UST Transition Director', name: 'Robert Moreland' },
  ],

  summary: {
    overallStatus:
      'Discovery and transition planning activities are progressing across all workstreams, with Customer Service & Platform Engineering, Claims Operations, Customer Implementation & Core Operations, and Infrastructure/Facilities actively engaged in discovery and planning. However, delayed MSA/SOW approvals and onboarding readiness activities create schedule risk for the initial transition wave and may impact transition timelines relative to incumbent contract end dates.',
    accomplishments: [
      'Continued discovery workshops across Customer Service & Platform Engineering, Claims Operations, Provider Data Management, Enrollment & Billing, and Enterprise Technology Solutions workstreams.',
      'Completed multiple Claims Operations discovery sessions and reviewed the initial transition approach, staffing model, capacity assumptions, and training strategy.',
      'Confirmed discovery and knowledge transfer staffing for several priority workstreams and established phased onboarding approaches.',
      'Completed internal preparation sessions for Application Support, Application Development, Database Administration, and Testing workstreams ahead of discovery kickoff.',
      'Established infrastructure readiness governance, including facilities and connectivity planning, readiness tracking, and follow-up discovery sessions.',
    ],
    priorities: [
      {
        title: 'Contracting & Schedule Alignment:',
        text: 'Finalize the MSA, secure approval of the Account and Discovery SOWs, complete remaining workstream SOW reviews, and establish an onboarding mechanism that enables readiness activities to begin before full contract execution.',
      },
      {
        title: 'Discovery & Transition Readiness:',
        text: 'Continue discovery across all workstreams while finalizing transition plans, knowledge transfer approaches, staffing assumptions, training curricula, and required operational inputs needed to validate the solution and transition model.',
      },
      {
        title: 'Staffing & Infrastructure Readiness:',
        text: 'Complete remaining staffing activities and advance onboarding, access provisioning, connectivity, facilities certification, network setup, and endpoint readiness to support upcoming knowledge transfer activities',
      },
    ],
    risks: [
      'Delays in MSA and SOW approvals are preventing timely onboarding, access provisioning, facilities preparation, and resource mobilization.',
      'Current projections indicate that Service Desk, ITOC, Microsoft 365, and Batch Monitoring transition timelines may extend beyond incumbent contract end dates, creating risk of compressed transition periods or delayed service assumption.',
      'Additional risks remain related to unresolved SLA requirements, and pending operational data needed to validate staffing models.',
    ],
    executiveFocus: [
      'Accelerate MSA and SOW approval timelines.',
      'Approve an onboarding approach that permits staffing, access provisioning, and infrastructure setup activities to begin immediately.',
      'Ensure timely delivery of workload forecasts, SLA definitions, operational metrics, backlog disposition decisions, and process documentation.',
      'Align on mitigation strategies for workstreams whose projected transition schedules extend beyond incumbent contract end dates.',
    ],
  },

  dashboard: [
    {
      tower: 'Contracting',
      rows: [
        {
          workstream: 'MSA',
          planning: { status: 'atRisk', start: '9/16/2026', sowSubmit: '10/9/2026', sowApproval: '10/9/2023', onboardingComplete: 'N/A' },
          transition: NA_TRANSITION,
          notes: [
            { text: 'MSA In Progress: UST Redlines in-work' },
            { text: 'Account SOW being reviewed by Premera' },
            { text: 'Discovery SOW Draft Complete – submission to Premera pending' },
          ],
        },
        {
          workstream: 'Account SOW',
          planning: { status: 'atRisk', start: '9/21/2026', sowSubmit: '09/28/2026', sowApproval: '10/9/2026', onboardingComplete: '10/23/2026' },
          transition: NA_TRANSITION,
        },
        {
          workstream: 'Discovery SOW',
          planning: { status: 'atRisk', start: '9/28/2026', sowSubmit: '10/2/2026', sowApproval: '10/16/2026', onboardingComplete: '10/30/2026' },
          transition: NA_TRANSITION,
        },
      ],
    },
    {
      tower: 'Customer Service & Platform Engineering',
      rows: [
        {
          workstream: 'Service Desk and ITOC',
          planning: { status: 'onTrack', start: '9/16/2026', sowSubmit: '10/9/2026', sowApproval: '10/23/2026', onboardingComplete: '11/06/2026' },
          transition: { status: 'atRisk', start: '11/9/2026', goLive: '1/21/2027' },
          notesRowSpan: 3,
          notes: [
            { text: '1/29/2027 is past the incumbent’s contract end date of 1/23.' },
            {
              text: 'Process an on-boarding SOW for the team to keep the process moving to avoid go-live delays or shortened transition timeline',
              alert: true,
            },
          ],
        },
        {
          workstream: 'Microsoft 365 Support',
          planning: { status: 'onTrack', start: '9/16/2026', sowSubmit: '10/9/2026', sowApproval: '10/23/2026', onboardingComplete: '11/06/2026' },
          transition: { status: 'atRisk', start: '11/9/2027', goLive: '1/29/2027' },
        },
        {
          workstream: 'Batch Monitoring',
          planning: { status: 'onTrack', start: '9/16/2026', sowSubmit: '10/9/2026', sowApproval: '10/23/2026', onboardingComplete: '11/06/2026' },
          transition: { status: 'atRisk', start: '11/9/2027', goLive: '1/21/2027' },
        },
        {
          workstream: 'Provider Contact Center',
          planning: { status: 'onTrack', start: '9/29/2026', sowSubmit: 'TBD', sowApproval: 'TBD', onboardingComplete: 'TBD' },
          transition: { status: 'notStarted', start: 'TBD', goLive: '5/31/2027' },
          notes: [{ text: 'Discovery/planning is in progress' }],
        },
      ],
    },
    {
      tower: 'Claims Operations',
      rows: [
        {
          workstream: 'Claims Operations',
          planning: { status: 'onTrack', start: '9/24/2026', sowSubmit: '12/4/2026', sowApproval: '12/18/2026', onboardingComplete: '1/15/2027' },
          transition: { status: 'notStarted', start: '1/18/2027', goLive: '5/31/2027' },
          notes: [{ text: 'Discovery/planning is in progress' }],
        },
      ],
    },
    {
      tower: 'Enterprise Technology Solutions',
      rows: [
        {
          workstream: 'Application Support and Operations',
          planning: { status: 'notStarted', start: '10/7/2026', sowSubmit: '12/4/2026', sowApproval: '12/18/2027', onboardingComplete: '1/15/2027' },
          transition: { status: 'notStarted', start: '1/18/2027', goLive: '4/9/2027' },
          notesRowSpan: 3,
          notes: [{ text: 'Discovery/planning kickoff is planned for next week on 10/7' }],
        },
        {
          workstream: 'Application Development Services',
          planning: { status: 'notStarted', start: '10/7/2026', sowSubmit: '12/4/2026', sowApproval: '12/18/2026', onboardingComplete: '1/15/2027' },
          transition: { status: 'notStarted', start: '1/18/2027', goLive: '4/9/2027' },
        },
        {
          workstream: 'Database Administration',
          planning: { status: 'notStarted', start: '10/7/2026', sowSubmit: '12/4/2026', sowApproval: '12/18/2026', onboardingComplete: '1/15/2027' },
          transition: { status: 'notStarted', start: '1/18/2027', goLive: '4/9/2027' },
        },
        {
          workstream: 'End to End Testing Center or Excellence',
          planning: { status: 'notStarted', start: '10/16/2026', sowSubmit: '12/4/2026', sowApproval: '12/18/2026', onboardingComplete: '1/15/2027' },
          transition: { status: 'notStarted', start: '1/18/2027', goLive: '4/9/2027' },
          notes: [{ text: 'Discovery/planning kickoff is planned for 10/16' }],
        },
      ],
    },
    {
      tower: 'Customer Implementation & Core Operations',
      rows: [
        {
          workstream: 'Provider Data Management',
          planning: { status: 'onTrack', start: '9/28/2026', sowSubmit: '11/6/2026', sowApproval: '11/20/2026', onboardingComplete: '12/18/2026' },
          transition: { status: 'notStarted', start: '12/21/2027', goLive: '3/12/2027' },
          notes: [{ text: 'Discovery/planning is in progress' }],
        },
        {
          workstream: 'Enrollment & Billing',
          planning: { status: 'notStarted', start: '10/6/2026', sowSubmit: '12/4/2026', sowApproval: '12/18/2026', onboardingComplete: 'TBD' },
          transition: { status: 'notStarted', start: 'TBD', goLive: '5/31/2027' },
          notes: [{ text: 'Discovery planning kickoff planned for next week' }],
        },
        {
          workstream: 'Product Config & Group Set-up',
          planning: { status: 'notStarted', start: 'TBD', sowSubmit: 'TBD', sowApproval: '', onboardingComplete: '' },
          transition: { status: 'notStarted', start: 'TBD', goLive: 'TBD' },
          notes: [{ text: 'Discovery planning kickoff start TBD' }],
        },
      ],
    },
    {
      tower: 'Cross Functional',
      rows: [
        {
          workstream: 'Connectivity & Access',
          planning: { status: 'onTrack', start: '9/21/2026', sowSubmit: '', sowApproval: '', onboardingComplete: '' },
          transition: { status: null, start: '', goLive: '' },
        },
      ],
    },
  ],

  raid: [
    {
      type: 'R',
      description:
        'The lead time to do facilities and network setup, background checks and onboarding has already passed, and the SOWs have not been completed. So, the start date for 10/12 for Service Desk/ITOC, MS365, and Batch Monitoring is not likely to happen.',
      mitigation: [
        'The workstreams will continue to evaluate whether the projected transition completion dates can still be met if the start dates slip by two weeks while discovery activities continue',
        'Create an “Onboarding SOW” to facilitate starting connectivity setup and on-boarding in the absence of the full SOWs.',
      ],
      owner: 'Jobin Kuriakose',
      dueDate: '10/2/2026',
      status: 'Open',
    },
    {
      type: 'R',
      description:
        'The projected go-live for Service Desk, ITOC, MS365 and Batch is projected for 1/29/2027, which is at risk of slipping further, is past the incumbent’s contract end date of 1/23/2027',
      mitigation: [
        'UST has requested that we process an on-boarding SOW for the team to keep the process moving to avoid go-live delays or shortened transition timeline. Premera suggested adding them to the discovery SOW but want to confirm that before committing to it.',
      ],
      owner: 'Premera',
      dueDate: '10/9/2026',
      status: 'Open',
    },
    {
      type: 'R',
      description:
        'The SLA at risk amount, penalties and earn back approach is still being negotiated so this section of the workstream SOW is pending.',
      mitigation: ['Finalize the SLA approach with Premera'],
      owner: 'Anand/Ashok',
      dueDate: '10/9/2026',
      status: 'Open',
    },
  ],
}
