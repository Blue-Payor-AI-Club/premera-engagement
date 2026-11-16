import { useContext } from 'react'
import { RefreshCw } from 'lucide-react'
import { PortalDataContext } from '../context/PortalDataContext'
import { EditButton } from './Editor'
import Legend from './Legend'
import type { EditRequest } from '../lib/editRequests'
import { formatDateTime, timeAgo } from '../lib/format'

interface Props {
  title: string
  sampleLines: string[]
  asOf?: string
  /** UST only: what the pencil next to the As-Of date edits. */
  edit?: () => EditRequest
  /** Show the status key, right-aligned under the As-Of date (full width under the title on phones). */
  legend?: boolean
}

export default function SlideHeader({ title, sampleLines, asOf = 'DD/MM/YYYY', edit, legend = false }: Props) {
  // Read directly so the header still renders outside a PortalDataProvider (isolated tests).
  const portal = useContext(PortalDataContext)
  return (
    // Phones mirror the mobile app: title and As-Of pill side by side, the status key below.
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-3 mb-6">
      <h1 className="min-w-0 flex-1 text-[22px] leading-tight sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">{title}</h1>
      <div className="flex shrink-0 flex-col items-end">
        <div className="flex items-start gap-3 md:gap-6">
          {sampleLines.length > 0 && (
            <div className="hidden md:block md:text-right">
              {sampleLines.map((l, i) => (
                <div key={i} className="font-bold text-slate-800 leading-snug text-sm sm:text-base">
                  {l}
                </div>
              ))}
            </div>
          )}
          {portal && (
            <button
              onClick={portal.refresh}
              disabled={portal.loading}
              title="Reload the latest portal data"
              className="hidden sm:inline-flex items-center gap-1.5 self-center px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 bg-white text-slate-600 hover:border-slate-500 disabled:opacity-50 transition"
            >
              <RefreshCw size={12} className={portal.loading ? 'animate-spin' : ''} aria-hidden />
              {portal.loading ? 'Refreshing…' : 'Refresh'}
            </button>
          )}
          <div className="rounded-full bg-slate-100 px-4 sm:px-6 py-2 sm:py-3 text-right leading-tight shrink-0">
            <div className="text-[10px] tracking-widest text-slate-500 font-semibold">AS OF:</div>
            <div className="text-sm font-semibold text-slate-700">
              {asOf}{edit && <EditButton request={edit} title="Edit report header" />}
            </div>
            {portal?.updatedAt && (
              <div className="text-[10px] text-slate-500 mt-0.5" title={`Last saved ${formatDateTime(portal.updatedAt)}`}>
                Updated {timeAgo(portal.updatedAt)}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Under the As-Of pill; on phones it takes the full row below the title. */}
      {legend && <div className="col-span-2 md:col-span-1 md:col-start-2 justify-self-end"><Legend compact /></div>}
    </header>
  )
}
