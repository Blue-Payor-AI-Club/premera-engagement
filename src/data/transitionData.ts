import type { StatusKey } from './status'
import type { MilestoneRow } from './portalData'

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
  /** Premera stakeholders only receive rows where this is true. */
  needsPremeraAttention?: boolean
}

export interface SummaryPriority {
  title: string
  text: string
  /** Premera stakeholders only receive rows where this is true. */
  needsPremeraAttention?: boolean
}

export interface ExecutiveSummaryData {
  overallStatus: string
  accomplishments: string[]
  priorities: SummaryPriority[]
  risks: string[]
  executiveFocus: string[]
  /** Texts of the accomplishment/risk/focus lines marked for Premera. */
  premeraVisible?: string[]
}

export interface NoteItem {
  text: string
  /** Rendered in red — used for the one call-to-action note on the slide. */
  alert?: boolean
}

/** The phases a workstream moves through, in display order (same list as the API). */
export const TRANSITION_PHASES = ['Discovery & Planning', 'Onboarding', 'Transition / KT', 'Shadow', 'Reverse Shadow', 'Steady State'] as const

/** One row of a workstream's dashboard: a phase, its dates and its own milestones. */
export interface PhaseRow {
  /** Stable, so thumbs feedback on the row survives edits and Excel round-trips. */
  id: string
  phase: string
  /** null = not set yet / does not apply (shown as "—"). */
  status: StatusKey | null
  start: string
  end: string
  milestones: MilestoneRow[]
  notes?: NoteItem[]
  /** Premera stakeholders only receive rows where this is true. */
  needsPremeraAttention?: boolean
}

/** A workstream heading with its phase rows under it (no tower level). */
export interface TransitionWorkstream {
  workstream: string
  /** Its group on the pre-phase slide; only the Transition Summary Report shows it. */
  tower?: string
  /** Overall status on its Program Level tab; unset = derived from the phases. */
  status?: StatusKey | null
  /** Overall status text under the tab's title card. */
  summary?: string
  phases: PhaseRow[]
}

export interface RaidItem {
  type: 'R' | 'A' | 'I' | 'D'
  description: string
  mitigation: string[]
  owner: string
  dueDate: string
  status: string
  /** The workstream (Program Level tab) it belongs to; blank = program-wide (on no tab). */
  workstream?: string
  /** Premera stakeholders only receive rows where this is true. */
  needsPremeraAttention?: boolean
}

export interface TransitionData {
  asOf: string
  overallStatus: StatusKey
  premeraContacts: TransitionContact[]
  ustContacts: TransitionContact[]
  summary: ExecutiveSummaryData
  dashboard: TransitionWorkstream[]
  raid: RaidItem[]
}


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

  // Generated from the API seed (seed/defaultTransition.ts, upgraded to phase rows).
  dashboard: [
    { workstream: "MSA", tower: "Contracting", phases: [
      {"id":"trp_46f5a957","phase":"Discovery & Planning","status":"atRisk","start":"9/16/2026","end":"10/9/2023","milestones":[{"id":"trm_6a579db4","label":"SOW submitted","due":"10/9/2026","revised":"","status":"atRisk"},{"id":"trm_59140f89","label":"SOW approved","due":"10/9/2023","revised":"","status":"atRisk"}],"notes":[{"text":"MSA In Progress: UST Redlines in-work"},{"text":"Account SOW being reviewed by Premera"},{"text":"Discovery SOW Draft Complete – submission to Premera pending"}]},
      {"id":"trp_ae9493e4","phase":"Onboarding","status":"atRisk","start":"10/9/2023","end":"N/A","milestones":[]},
      {"id":"trp_e8df4b9f","phase":"Transition / KT","status":null,"start":"N/A","end":"N/A","milestones":[]},
      {"id":"trp_f64bcf5d","phase":"Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_99ce45ea","phase":"Reverse Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_3af30ebb","phase":"Steady State","status":null,"start":"","end":"","milestones":[]},
    ] },
    { workstream: "Account SOW", tower: "Contracting", phases: [
      {"id":"trp_bcecc0ea","phase":"Discovery & Planning","status":"atRisk","start":"9/21/2026","end":"10/9/2026","milestones":[{"id":"trm_ef14a19e","label":"SOW submitted","due":"9/28/2026","revised":"","status":"atRisk"},{"id":"trm_415159fc","label":"SOW approved","due":"10/9/2026","revised":"","status":"atRisk"}]},
      {"id":"trp_440d943a","phase":"Onboarding","status":"atRisk","start":"10/9/2026","end":"10/23/2026","milestones":[]},
      {"id":"trp_a0336bc8","phase":"Transition / KT","status":null,"start":"N/A","end":"N/A","milestones":[]},
      {"id":"trp_e5b9de4c","phase":"Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_a21f2329","phase":"Reverse Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_b1d53922","phase":"Steady State","status":null,"start":"","end":"","milestones":[]},
    ] },
    { workstream: "Discovery SOW", tower: "Contracting", phases: [
      {"id":"trp_9ff990ee","phase":"Discovery & Planning","status":"atRisk","start":"9/28/2026","end":"10/16/2026","milestones":[{"id":"trm_fd365936","label":"SOW submitted","due":"10/2/2026","revised":"","status":"atRisk"},{"id":"trm_05d22555","label":"SOW approved","due":"10/16/2026","revised":"","status":"atRisk"}]},
      {"id":"trp_3fd76309","phase":"Onboarding","status":"atRisk","start":"10/16/2026","end":"10/30/2026","milestones":[]},
      {"id":"trp_83bb971e","phase":"Transition / KT","status":null,"start":"N/A","end":"N/A","milestones":[]},
      {"id":"trp_a694db99","phase":"Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_afb26a04","phase":"Reverse Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_a0c5bc1c","phase":"Steady State","status":null,"start":"","end":"","milestones":[]},
    ] },
    { workstream: "Service Desk and ITOC", tower: "Customer Service & Platform Engineering", phases: [
      {"id":"trp_7b476082","phase":"Discovery & Planning","status":"onTrack","start":"9/16/2026","end":"10/23/2026","milestones":[{"id":"trm_2ef119e6","label":"SOW submitted","due":"10/9/2026","revised":"","status":"onTrack"},{"id":"trm_e4381bca","label":"SOW approved","due":"10/23/2026","revised":"","status":"onTrack"}],"notes":[{"text":"1/29/2027 is past the incumbent’s contract end date of 1/23."},{"text":"Process an on-boarding SOW for the team to keep the process moving to avoid go-live delays or shortened transition timeline","alert":true}]},
      {"id":"trp_2f448f99","phase":"Onboarding","status":"onTrack","start":"10/23/2026","end":"11/6/2026","milestones":[]},
      {"id":"trp_2f0bf31e","phase":"Transition / KT","status":"atRisk","start":"11/9/2026","end":"1/21/2027","milestones":[]},
      {"id":"trp_21b066c9","phase":"Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_5257b5e3","phase":"Reverse Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_4e8df056","phase":"Steady State","status":null,"start":"","end":"","milestones":[]},
    ] },
    { workstream: "Microsoft 365 Support", tower: "Customer Service & Platform Engineering", phases: [
      {"id":"trp_c1d2db05","phase":"Discovery & Planning","status":"onTrack","start":"9/16/2026","end":"10/23/2026","milestones":[{"id":"trm_add690a7","label":"SOW submitted","due":"10/9/2026","revised":"","status":"onTrack"},{"id":"trm_ec808c62","label":"SOW approved","due":"10/23/2026","revised":"","status":"onTrack"}]},
      {"id":"trp_769e15c5","phase":"Onboarding","status":"onTrack","start":"10/23/2026","end":"11/6/2026","milestones":[]},
      {"id":"trp_a08cdb10","phase":"Transition / KT","status":"atRisk","start":"11/9/2027","end":"1/29/2027","milestones":[]},
      {"id":"trp_9ccc94c9","phase":"Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_57dd5c28","phase":"Reverse Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_1efe64b2","phase":"Steady State","status":null,"start":"","end":"","milestones":[]},
    ] },
    { workstream: "Batch Monitoring", tower: "Customer Service & Platform Engineering", phases: [
      {"id":"trp_444edec5","phase":"Discovery & Planning","status":"onTrack","start":"9/16/2026","end":"10/23/2026","milestones":[{"id":"trm_c8312e54","label":"SOW submitted","due":"10/9/2026","revised":"","status":"onTrack"},{"id":"trm_93cbca91","label":"SOW approved","due":"10/23/2026","revised":"","status":"onTrack"}]},
      {"id":"trp_da704f79","phase":"Onboarding","status":"onTrack","start":"10/23/2026","end":"11/6/2026","milestones":[]},
      {"id":"trp_ff1c18e1","phase":"Transition / KT","status":"atRisk","start":"11/9/2027","end":"1/21/2027","milestones":[]},
      {"id":"trp_739f7363","phase":"Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_8f6ca97c","phase":"Reverse Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_26a6a745","phase":"Steady State","status":null,"start":"","end":"","milestones":[]},
    ] },
    { workstream: "Provider Contact Center", tower: "Customer Service & Platform Engineering", phases: [
      {"id":"trp_5421ff00","phase":"Discovery & Planning","status":"onTrack","start":"9/29/2026","end":"TBD","milestones":[{"id":"trm_e2725acd","label":"SOW submitted","due":"TBD","revised":"","status":"onTrack"},{"id":"trm_5acb4777","label":"SOW approved","due":"TBD","revised":"","status":"onTrack"}],"notes":[{"text":"Discovery/planning is in progress"}]},
      {"id":"trp_da7a7e1f","phase":"Onboarding","status":"onTrack","start":"TBD","end":"TBD","milestones":[]},
      {"id":"trp_73e66c1c","phase":"Transition / KT","status":"notStarted","start":"TBD","end":"5/31/2027","milestones":[]},
      {"id":"trp_5e5e1a68","phase":"Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_e1affca6","phase":"Reverse Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_e7a5df42","phase":"Steady State","status":null,"start":"","end":"","milestones":[]},
    ] },
    { workstream: "Claims Operations", tower: "Claims Operations", phases: [
      {"id":"trp_7c43191d","phase":"Discovery & Planning","status":"onTrack","start":"9/24/2026","end":"12/18/2026","milestones":[{"id":"trm_5eb7b1ef","label":"SOW submitted","due":"12/4/2026","revised":"","status":"onTrack"},{"id":"trm_da4926ce","label":"SOW approved","due":"12/18/2026","revised":"","status":"onTrack"}],"notes":[{"text":"Discovery/planning is in progress"}]},
      {"id":"trp_d1e998c3","phase":"Onboarding","status":"onTrack","start":"12/18/2026","end":"1/15/2027","milestones":[]},
      {"id":"trp_419860ae","phase":"Transition / KT","status":"notStarted","start":"1/18/2027","end":"5/31/2027","milestones":[]},
      {"id":"trp_b9e2a415","phase":"Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_f110ac7a","phase":"Reverse Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_99a228e6","phase":"Steady State","status":null,"start":"","end":"","milestones":[]},
    ] },
    { workstream: "Application Support and Operations", tower: "Enterprise Technology Solutions", phases: [
      {"id":"trp_4ac879a1","phase":"Discovery & Planning","status":"notStarted","start":"10/7/2026","end":"12/18/2027","milestones":[{"id":"trm_0ed50966","label":"SOW submitted","due":"12/4/2026","revised":"","status":"notStarted"},{"id":"trm_9b747e5c","label":"SOW approved","due":"12/18/2027","revised":"","status":"notStarted"}],"notes":[{"text":"Discovery/planning kickoff is planned for next week on 10/7"}]},
      {"id":"trp_0d1ae0fd","phase":"Onboarding","status":"notStarted","start":"12/18/2027","end":"1/15/2027","milestones":[]},
      {"id":"trp_71002cb4","phase":"Transition / KT","status":"notStarted","start":"1/18/2027","end":"4/9/2027","milestones":[]},
      {"id":"trp_e0b9d9d8","phase":"Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_c189a1c6","phase":"Reverse Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_6c99e855","phase":"Steady State","status":null,"start":"","end":"","milestones":[]},
    ] },
    { workstream: "Application Development Services", tower: "Enterprise Technology Solutions", phases: [
      {"id":"trp_ecd946ce","phase":"Discovery & Planning","status":"notStarted","start":"10/7/2026","end":"12/18/2026","milestones":[{"id":"trm_4275a4fe","label":"SOW submitted","due":"12/4/2026","revised":"","status":"notStarted"},{"id":"trm_00ca4af2","label":"SOW approved","due":"12/18/2026","revised":"","status":"notStarted"}]},
      {"id":"trp_99784c66","phase":"Onboarding","status":"notStarted","start":"12/18/2026","end":"1/15/2027","milestones":[]},
      {"id":"trp_b72ddc4f","phase":"Transition / KT","status":"notStarted","start":"1/18/2027","end":"4/9/2027","milestones":[]},
      {"id":"trp_a866662e","phase":"Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_e548fabc","phase":"Reverse Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_cac63246","phase":"Steady State","status":null,"start":"","end":"","milestones":[]},
    ] },
    { workstream: "Database Administration", tower: "Enterprise Technology Solutions", phases: [
      {"id":"trp_00123d74","phase":"Discovery & Planning","status":"notStarted","start":"10/7/2026","end":"12/18/2026","milestones":[{"id":"trm_ef3c9337","label":"SOW submitted","due":"12/4/2026","revised":"","status":"notStarted"},{"id":"trm_b92e78cb","label":"SOW approved","due":"12/18/2026","revised":"","status":"notStarted"}]},
      {"id":"trp_56a8b707","phase":"Onboarding","status":"notStarted","start":"12/18/2026","end":"1/15/2027","milestones":[]},
      {"id":"trp_ef2f1c73","phase":"Transition / KT","status":"notStarted","start":"1/18/2027","end":"4/9/2027","milestones":[]},
      {"id":"trp_868b8b65","phase":"Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_23663913","phase":"Reverse Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_419f47ee","phase":"Steady State","status":null,"start":"","end":"","milestones":[]},
    ] },
    { workstream: "End to End Testing Center or Excellence", tower: "Enterprise Technology Solutions", phases: [
      {"id":"trp_f7022134","phase":"Discovery & Planning","status":"notStarted","start":"10/16/2026","end":"12/18/2026","milestones":[{"id":"trm_450bd781","label":"SOW submitted","due":"12/4/2026","revised":"","status":"notStarted"},{"id":"trm_9a121d96","label":"SOW approved","due":"12/18/2026","revised":"","status":"notStarted"}],"notes":[{"text":"Discovery/planning kickoff is planned for 10/16"}]},
      {"id":"trp_2b20354b","phase":"Onboarding","status":"notStarted","start":"12/18/2026","end":"1/15/2027","milestones":[]},
      {"id":"trp_0aef0922","phase":"Transition / KT","status":"notStarted","start":"1/18/2027","end":"4/9/2027","milestones":[]},
      {"id":"trp_c9cbc2c7","phase":"Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_fc24e96a","phase":"Reverse Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_c4ac1148","phase":"Steady State","status":null,"start":"","end":"","milestones":[]},
    ] },
    { workstream: "Provider Data Management", tower: "Customer Implementation & Core Operations", phases: [
      {"id":"trp_b1d564f2","phase":"Discovery & Planning","status":"onTrack","start":"9/28/2026","end":"11/20/2026","milestones":[{"id":"trm_0066d1b6","label":"SOW submitted","due":"11/6/2026","revised":"","status":"onTrack"},{"id":"trm_dcbe3236","label":"SOW approved","due":"11/20/2026","revised":"","status":"onTrack"}],"notes":[{"text":"Discovery/planning is in progress"}]},
      {"id":"trp_1c5359b7","phase":"Onboarding","status":"onTrack","start":"11/20/2026","end":"12/18/2026","milestones":[]},
      {"id":"trp_f31ec421","phase":"Transition / KT","status":"notStarted","start":"12/21/2027","end":"3/12/2027","milestones":[]},
      {"id":"trp_2396d634","phase":"Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_30537c78","phase":"Reverse Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_d6f1993c","phase":"Steady State","status":null,"start":"","end":"","milestones":[]},
    ] },
    { workstream: "Enrollment & Billing", tower: "Customer Implementation & Core Operations", phases: [
      {"id":"trp_f85dcfe6","phase":"Discovery & Planning","status":"notStarted","start":"10/6/2026","end":"12/18/2026","milestones":[{"id":"trm_9310b691","label":"SOW submitted","due":"12/4/2026","revised":"","status":"notStarted"},{"id":"trm_f76c02bb","label":"SOW approved","due":"12/18/2026","revised":"","status":"notStarted"}],"notes":[{"text":"Discovery planning kickoff planned for next week"}]},
      {"id":"trp_fb2bbc99","phase":"Onboarding","status":"notStarted","start":"12/18/2026","end":"TBD","milestones":[]},
      {"id":"trp_f4b7ed5e","phase":"Transition / KT","status":"notStarted","start":"TBD","end":"5/31/2027","milestones":[]},
      {"id":"trp_0234d4f9","phase":"Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_9622c9c6","phase":"Reverse Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_54cfd726","phase":"Steady State","status":null,"start":"","end":"","milestones":[]},
    ] },
    { workstream: "Product Config & Group Set-up", tower: "Customer Implementation & Core Operations", phases: [
      {"id":"trp_0febe32e","phase":"Discovery & Planning","status":"notStarted","start":"TBD","end":"","milestones":[{"id":"trm_2ae404a8","label":"SOW submitted","due":"TBD","revised":"","status":"notStarted"}],"notes":[{"text":"Discovery planning kickoff start TBD"}]},
      {"id":"trp_db18e9c3","phase":"Onboarding","status":"notStarted","start":"","end":"","milestones":[]},
      {"id":"trp_d38ed5da","phase":"Transition / KT","status":"notStarted","start":"TBD","end":"TBD","milestones":[]},
      {"id":"trp_28b8347f","phase":"Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_0871cee0","phase":"Reverse Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_b4cc77f8","phase":"Steady State","status":null,"start":"","end":"","milestones":[]},
    ] },
    { workstream: "Connectivity & Access", tower: "Cross Functional", phases: [
      {"id":"trp_fd90aaa2","phase":"Discovery & Planning","status":"onTrack","start":"9/21/2026","end":"","milestones":[]},
      {"id":"trp_0ad18412","phase":"Onboarding","status":"onTrack","start":"","end":"","milestones":[]},
      {"id":"trp_ffd4b1dd","phase":"Transition / KT","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_b32beb98","phase":"Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_84ab3445","phase":"Reverse Shadow","status":null,"start":"","end":"","milestones":[]},
      {"id":"trp_2ddce176","phase":"Steady State","status":null,"start":"","end":"","milestones":[]},
    ] },
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
