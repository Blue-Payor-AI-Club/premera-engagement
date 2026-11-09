import { useContext } from 'react'
import { RefreshCw } from 'lucide-react'
import { PortalDataContext } from '../context/PortalDataContext'
import { EditButton } from './Editor'
import type { EditRequest } from '../lib/editRequests'

interface Props {
  title: string
  sampleLines: string[]
  asOf?: string
  /** UST only: what the pencil next to the As-Of date edits. */
  edit?: () => EditRequest
}

export default function SlideHeader({ title, sampleLines, asOf = 'DD/MM/YYYY', edit }: Props) {
  // Read directly so the header still renders outside a PortalDataProvider (isolated tests).
  const portal = useContext(PortalDataContext)
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">{title}</h1>
      <div className="flex items-start gap-4 md:gap-6 md:shrink-0">
        <div className="md:text-right">
          {sampleLines.map((l, i) => (
            <div key={i} className="font-bold text-slate-800 leading-snug text-sm sm:text-base">
              {l}
            </div>
          ))}
        </div>
        {portal && (
          <button
            onClick={portal.refresh}
            disabled={portal.loading}
            title="Reload the latest portal data"
            className="inline-flex items-center gap-1.5 self-center px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 bg-white text-slate-600 hover:border-slate-500 disabled:opacity-50 transition"
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
        </div>
      </div>
    </header>
  )
}
