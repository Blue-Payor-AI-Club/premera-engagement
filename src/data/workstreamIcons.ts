// Single source of truth for how a WorkstreamIcon key maps to a lucide component and
// a human-friendly label. Previously duplicated independently in ProgramLevel.tsx
// (icon map only) and Admin.tsx (icon map + labels) — consolidated here so a new
// consumer (PortalPreview) doesn't need a third copy.
import {
  Share2,
  UserCog,
  ArrowLeftRight,
  Truck,
  Building2,
  ShieldCheck,
  ClipboardCheck,
  type LucideIcon,
} from 'lucide-react'
import type { WorkstreamIcon } from './portalData'

export const WORKSTREAM_ICON_COMPONENTS: Record<WorkstreamIcon, LucideIcon> = {
  share2: Share2,
  userCog: UserCog,
  arrowLeftRight: ArrowLeftRight,
  truck: Truck,
  building2: Building2,
  shieldCheck: ShieldCheck,
  clipboardCheck: ClipboardCheck,
}

export const WORKSTREAM_ICON_LABELS: Record<WorkstreamIcon, string> = {
  share2: 'Communications',
  userCog: 'HR / People',
  arrowLeftRight: 'Knowledge Transfer',
  truck: 'Delivery / Operations',
  building2: 'Infrastructure',
  shieldCheck: 'Security',
  clipboardCheck: 'Day One / Readiness',
}
