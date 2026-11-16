import SlideHeader from '../components/SlideHeader'
import TransitionTab from '../components/transition/TransitionTab'
import { TRANSITION_DATA } from '../data/transitionData'
import { usePortalData } from '../context/PortalDataContext'
import { transitionHeaderRequest } from '../lib/editRequests'

/** /report: the program-wide executive summary and dashboard in the slide's old format. */
export default function TransitionReport() {
  const { data } = usePortalData()
  const transition = data.transition ?? TRANSITION_DATA
  return (
    <div className="slide">
      <SlideHeader title="Transition Summary Report" sampleLines={[]} asOf={transition.asOf} edit={() => transitionHeaderRequest(transition)} legend />
      <TransitionTab data={transition} />
    </div>
  )
}
