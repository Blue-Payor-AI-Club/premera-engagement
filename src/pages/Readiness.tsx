import useMediaQuery from '@mui/material/useMediaQuery'
import SlideHeader from '../components/SlideHeader'
import ReadinessCard from '../components/transition/ReadinessCard'
import { TRANSITION_DATA } from '../data/transitionData'
import { usePortalData } from '../context/PortalDataContext'
import { transitionHeaderRequest } from '../lib/editRequests'

/** /readiness: the program-wide Transition Readiness Score Card, on its own menu item. Phones get
 * the mobile slide's layout, whose dark title band replaces the page header. */
export default function Readiness() {
  const { data } = usePortalData()
  const transition = data.transition ?? TRANSITION_DATA
  const phone = useMediaQuery('(max-width: 639.95px)')
  return (
    <div className="slide">
      {!phone && <SlideHeader title="Transition Readiness Score Card" sampleLines={[]} asOf={transition.asOf} edit={() => transitionHeaderRequest(transition)} />}
      <ReadinessCard data={transition} phone={phone} />
    </div>
  )
}
