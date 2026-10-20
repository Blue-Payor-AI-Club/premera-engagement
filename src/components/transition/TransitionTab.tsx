import { TRANSITION_DATA, type TransitionData } from '../../data/transitionData'
import ExecutiveSummary from './ExecutiveSummary'
import TransitionDashboard from './TransitionDashboard'

/** Transition tab of /program: the Executive Summary (collapsible) followed by the Dashboard. */
export default function TransitionTab({ data = TRANSITION_DATA }: { data?: TransitionData }) {
  return (
    <div data-testid="transition-tab" className="space-y-6">
      <ExecutiveSummary data={data} />
      <TransitionDashboard data={data} />
    </div>
  )
}
