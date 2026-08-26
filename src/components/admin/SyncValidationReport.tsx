import { useMemo, useState } from 'react'
import { Copy, Download, Check } from 'lucide-react'
import { saveBlobAs, type ExcelProblem } from '../../lib/api'

const RENDER_CAP = 50

function problemLine(p: ExcelProblem): string {
  const address = p.cell ? `${p.sheet}!${p.cell}` : p.column ? `${p.sheet} (${p.column})` : p.sheet
  return `${address}: ${p.message}`
}

function toCsv(problems: ExcelProblem[]): string {
  const header = ['severity', 'sheet', 'cell', 'row', 'column', 'value', 'message']
  const rows = problems.map((p) => [p.severity, p.sheet, p.cell ?? '', p.row ?? '', p.column ?? '', p.value ?? '', p.message])
  const escape = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`
  return [header, ...rows].map((row) => row.map(escape).join(',')).join('\n')
}

interface Props {
  problems: ExcelProblem[]
  totalProblems: number
  truncated: boolean
}

export default function SyncValidationReport({ problems, totalProblems, truncated }: Props) {
  const [copied, setCopied] = useState(false)

  const bySheet = useMemo(() => {
    const groups = new Map<string, ExcelProblem[]>()
    for (const p of problems) {
      const list = groups.get(p.sheet) ?? []
      list.push(p)
      groups.set(p.sheet, list)
    }
    return [...groups.entries()]
  }, [problems])

  const errorCount = problems.filter((p) => p.severity === 'error').length
  const warningCount = problems.filter((p) => p.severity === 'warning').length
  const shown = problems.slice(0, RENDER_CAP)
  const hiddenCount = totalProblems - shown.length

  async function copyAll() {
    const text = problems.map(problemLine).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* clipboard unavailable — silently ignore */ }
  }

  function downloadCsv() {
    saveBlobAs(new Blob([toCsv(problems)], { type: 'text/csv' }), 'portal-import-report.csv')
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          {errorCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
              {errorCount} error{errorCount !== 1 ? 's' : ''}
            </span>
          )}
          {warningCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
              {warningCount} warning{warningCount !== 1 ? 's' : ''}
            </span>
          )}
          {truncated && (
            <span className="text-xs text-slate-400">({totalProblems} total — showing the first {problems.length})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyAll}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-300 text-slate-600 hover:bg-slate-50"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy all'}
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-300 text-slate-600 hover:bg-slate-50"
          >
            <Download size={12} /> Download CSV
          </button>
        </div>
      </div>

      <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
        {bySheet.map(([sheet, sheetProblems], i) => (
          <details key={sheet} open={i === 0} className="group">
            <summary className="cursor-pointer px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 transition">
              {sheet} <span className="text-slate-400 font-normal">({sheetProblems.length})</span>
            </summary>
            <ul className="divide-y divide-slate-50">
              {sheetProblems.slice(0, RENDER_CAP).map((p, j) => (
                <li key={j} className="px-4 py-2 flex items-start gap-2 text-sm">
                  <span
                    className={`mt-0.5 shrink-0 inline-block h-1.5 w-1.5 rounded-full ${p.severity === 'error' ? 'bg-red-500' : 'bg-amber-500'}`}
                  />
                  <div className="min-w-0">
                    {p.cell && (
                      <span className="font-mono text-xs text-slate-500 mr-1.5">
                        {p.sheet}!{p.cell}
                      </span>
                    )}
                    <span className="text-slate-700">{p.message}</span>
                    {p.value !== undefined && (
                      <code className="ml-1.5 px-1 py-0.5 rounded bg-slate-100 text-[11px] text-slate-500">{p.value}</code>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>

      {hiddenCount > 0 && (
        <div className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">
          +{hiddenCount} more — download the full report above to see everything.
        </div>
      )}
    </div>
  )
}
