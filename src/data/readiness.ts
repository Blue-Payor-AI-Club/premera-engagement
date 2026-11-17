// Transition Readiness Score Card (from "Transition Readiness Score Card.pptx"): what must be in
// place with Premera before the transition begins. Program-wide; the levers, "what is needed" and
// the scoring guide are fixed, only score and remarks change. Same list as the API's types/readiness.ts.

export const READINESS_LEVERS = [
  { key: 'contract', label: 'Contract and scope', need: 'Signed agreement, services taken over, exclusions agreed' },
  { key: 'governance', label: 'Sponsors and governance', need: 'Named sponsors and leads, meeting cadence, escalation path' },
  { key: 'volume', label: 'Volume and baseline', need: 'Several months of transaction, or workload data' },
  { key: 'documents', label: 'Current-state documents', need: 'Process maps, runbooks, SOPs, application inventory' },
  { key: 'ktPlan', label: 'Knowledge transfer plan', need: 'SME schedule by topic, with completion checks' },
  { key: 'access', label: 'Access and tooling', need: 'User IDs, VPN, application and tool logins raised early' },
  { key: 'staffing', label: 'Staffing plan', need: 'Named roles, skills, onshore/offshore split, backups' },
  { key: 'sla', label: 'SLAs and KPIs', need: 'Expected service levels, measurement method, baseline' },
  { key: 'security', label: 'Security and compliance', need: 'Data handling rules, privacy duties, mandatory training' },
  { key: 'timeline', label: 'Timeline and milestones', need: 'Phased plan with dates, owners, and phase-exit criteria' },
  { key: 'risk', label: 'Risk register', need: 'Known risks with owners and mitigations agreed at kickoff' },
] as const

export type ReadinessLeverKey = (typeof READINESS_LEVERS)[number]['key']
/** 1–6, per the slide's scoring guide. 6 is "Yet to start" — not better than 5 (Green). */
export type ReadinessScore = 1 | 2 | 3 | 4 | 5 | 6

export interface ReadinessItem {
  key: ReadinessLeverKey
  /** null = not scored yet. */
  score: ReadinessScore | null
  remarks?: string
}

/** The slide's scoring guide, in its order (6 first), with its colours. */
export const READINESS_GUIDE: { score: ReadinessScore; label: string; meaning: string; bg: string; fg: string }[] = [
  { score: 6, label: 'Yet to start', meaning: 'Not yet begun', bg: '#D0D5D6', fg: '#1A1A1A' },
  { score: 5, label: 'Green', meaning: 'Complete, validated, sustainable', bg: '#0B4F55', fg: '#FFFFFF' },
  { score: 4, label: 'Light green', meaning: 'Complete, minor gaps with owners', bg: '#3C7F80', fg: '#FFFFFF' },
  { score: 3, label: 'Amber', meaning: 'Partial; timeline risk', bg: '#D9A441', fg: '#1A1A1A' }, // dark text, as on the mobile slide (white on amber is hard to read)
  { score: 2, label: 'Red', meaning: 'Significant gaps; escalate', bg: '#C0504D', fg: '#FFFFFF' },
  { score: 1, label: 'Critical', meaning: 'Blocking the transition', bg: '#7A1F1F', fg: '#FFFFFF' },
]
export const guideFor = (score: ReadinessScore) => READINESS_GUIDE.find((g) => g.score === score)!

/** All 11 levers in slide order; missing ones come back not scored. */
export function completeReadiness(items: ReadinessItem[] | undefined): ReadinessItem[] {
  return READINESS_LEVERS.map(({ key }) => items?.find((i) => i.key === key) ?? { key, score: null })
}
