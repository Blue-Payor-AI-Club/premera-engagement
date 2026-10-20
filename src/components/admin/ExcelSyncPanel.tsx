import { useRef, useState } from 'react'
import { Download, Upload, PlayCircle, RefreshCw, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import {
  ApiError,
  downloadPortalWorkbook,
  saveBlobAs,
  uploadPortalExcel,
  validateExcelFile,
  type ExcelImportErrorDetails,
  type ExcelImportResult,
} from '../../lib/api'
import { usePortalData } from '../../context/PortalDataContext'
import SyncValidationReport from './SyncValidationReport'

type Phase = 'idle' | 'busy' | 'success' | 'rejected' | 'transportError'

export default function ExcelSyncPanel() {
  const { refresh } = usePortalData()
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<ExcelImportResult | null>(null)
  const [rejection, setRejection] = useState<ExcelImportErrorDetails | null>(null)
  const [transportMessage, setTransportMessage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function pickFile(next: File | undefined) {
    setResult(null)
    setRejection(null)
    setTransportMessage(null)
    setPhase('idle')
    if (!next) {
      setFile(null)
      setFileError(null)
      return
    }
    const message = validateExcelFile(next)
    setFile(next)
    setFileError(message)
  }

  async function runImport(dryRun: boolean, onConflict?: 'mine' | 'current') {
    if (!file || fileError) return
    setPhase('busy')
    setResult(null)
    setRejection(null)
    setTransportMessage(null)

    try {
      const outcome = await uploadPortalExcel(file, { dryRun, onConflict })
      setResult(outcome)
      setPhase('success')
      if (!dryRun) refresh()
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR' && err.details) {
        setRejection(err.details as ExcelImportErrorDetails)
        setPhase('rejected')
        return
      }
      setTransportMessage(transportErrorMessage(err))
      setPhase('transportError')
    }
  }

  async function downloadCurrent(kind: 'template' | 'export') {
    const blob = await downloadPortalWorkbook(kind)
    saveBlobAs(blob, kind === 'template' ? 'portal-data-template.xlsx' : 'portal-data.xlsx')
  }

  const busy = phase === 'busy'
  const canImport = !!file && !fileError && !busy

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <div>
        <h2 className="text-sm font-bold text-slate-700">Sync from Excel</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Portal data is maintained in the workbook kept in Teams/SharePoint. Download it, edit it there, then upload
          the updated file here to sync.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => downloadCurrent('export')}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          <Download size={15} /> Download current workbook
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          <Upload size={15} /> {file ? 'Change file' : 'Choose file'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
      </div>

      {file && (
        <div className="text-xs text-slate-500">
          Selected: <span className="font-medium text-slate-700">{file.name}</span>{' '}
          ({(file.size / 1024).toFixed(0)} KB)
        </div>
      )}
      {fileError && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <span>{fileError}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canImport}
          onClick={() => runImport(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <PlayCircle size={15} /> Preview (dry run)
        </button>
        <button
          type="button"
          disabled={!canImport}
          onClick={() => runImport(false)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(150deg,#00a0df,#0067b1)' }}
        >
          {busy ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
          {busy ? 'Syncing…' : 'Sync now'}
        </button>
      </div>

      {phase === 'transportError' && transportMessage && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <span>{transportMessage}</span>
        </div>
      )}

      {phase === 'rejected' && rejection && (
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>
              Import rejected: {rejection.totalProblems} problem{rejection.totalProblems !== 1 ? 's' : ''} found.
              Nothing was changed.
            </span>
          </div>
          <SyncValidationReport
            problems={rejection.problems}
            totalProblems={rejection.totalProblems}
            truncated={rejection.truncated}
          />
          {rejection.problems.some((p) => p.code === 'MERGE_CONFLICT') && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 space-y-2">
              <p className="text-sm text-slate-700">
                Someone else changed the same thing you did. Everything else in your workbook will be applied either way — no
                need to download a new copy.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runImport(false, 'current')}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40"
                >
                  Keep the portal&apos;s values
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runImport(false, 'mine')}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40"
                >
                  Use my values
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'success' && result && (
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
            <span>
              {result.dryRun
                ? 'Preview only — nothing was saved.'
                : result.unchanged
                  ? 'No changes — this workbook matches what the portal already has.'
                  : 'Sync complete.'}
              {result.summary && (
                <>
                  {' '}
                  {result.summary.workstreams.ito + result.summary.workstreams.bpo} workstreams,{' '}
                  {result.summary.issues} issues, {result.summary.riskActions} risk actions,{' '}
                  {result.summary.milestoneRows} milestone rows
                  {result.summary.transition && (
                    <>
                      , {result.summary.transition.dashboardRows} transition workstreams,{' '}
                      {result.summary.transition.raidItems} RAID items
                    </>
                  )}
                  .
                </>
              )}
            </span>
          </div>

          {result.merge && (
            <div className="flex items-start gap-3 text-sm text-sky-900 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2.5">
              <Info size={15} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>
                  <strong>{result.dryRun ? 'This would merge with newer changes.' : 'Merged with newer changes.'}</strong>{' '}
                  Your workbook was downloaded at version {result.merge.baseVersion}, but the portal had moved to version{' '}
                  {result.merge.currentVersion}
                  {result.merge.changedBy.length > 0 && <> ({result.merge.changedBy.join(', ')} updated it since)</>}.{' '}
                  Your {result.merge.yourChanges} change{result.merge.yourChanges !== 1 ? 's' : ''}{' '}
                  {result.dryRun ? 'would be applied' : 'were applied'} on top of theirs, and theirs {result.dryRun ? 'would be' : 'were'} kept.
                </p>
                {!result.dryRun && (
                  <>
                    <p className="mt-1 text-sky-800">
                      Your copy of the workbook doesn&apos;t have their changes — download the updated one before editing again.
                    </p>
                    <button
                      type="button"
                      onClick={() => downloadCurrent('export')}
                      className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border border-sky-300 text-sky-900 hover:bg-sky-100"
                    >
                      <Download size={12} /> Download updated workbook
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {result.ids && result.ids.minted > 0 && (
            <div className="flex items-start gap-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>
                  {result.ids.minted} new row{result.ids.minted !== 1 ? 's' : ''} {result.ids.minted !== 1 ? 'were' : 'was'} assigned
                  {' '}an ID. Download the updated workbook and replace the copy in Teams — otherwise those rows will be
                  re-created (and lose any feedback on them) on the next sync.
                </p>
                <button
                  type="button"
                  onClick={() => downloadCurrent('export')}
                  className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border border-amber-300 text-amber-800 hover:bg-amber-100"
                >
                  <Download size={12} /> Download updated workbook
                </button>
              </div>
            </div>
          )}

          {result.orphanedVotes && result.orphanedVotes.count > 0 && (
            <div className="text-xs text-slate-500">
              Note: {result.orphanedVotes.count} feedback vote{result.orphanedVotes.count !== 1 ? 's' : ''} on removed
              item{result.orphanedVotes.count !== 1 ? 's' : ''} — the votes are preserved and will reattach if the item
              reappears.
            </div>
          )}

          {result.warnings.length > 0 && (
            <SyncValidationReport problems={result.warnings} totalProblems={result.warnings.length} truncated={false} />
          )}
        </div>
      )}
    </div>
  )
}

function transportErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return 'Your account is not an admin — ask your portal administrator to run the sync.'
    if (err.status === 413) return 'That file is too large.'
    // The server says exactly why (out-of-date workbook it can't merge, a concurrent write, …).
    return err.message
  }
  return 'Could not reach the API. Check your connection and try again.'
}
