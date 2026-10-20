const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/v1'

let _token: string | null = null

export function setApiToken(t: string | null): void {
  _token = t
}

let _onUnauthorized: (() => void) | null = null

/** Registered by AuthProvider: called when the server says the session is no longer valid
 * (token expired, or the user was disabled/removed) so the app drops back to sign-in. */
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  _onUnauthorized = fn
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  /** The backend's error.details, when present — e.g. the aggregated Excel-import
   * problem list. Previously thrown away; kept now so callers can surface it. */
  readonly details?: unknown
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export async function apiFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (_token) headers['Authorization'] = `Bearer ${_token}`
  Object.assign(headers, opts.headers as Record<string, string> | undefined)

  const res = await fetch(`${BASE}${path}`, { ...opts, headers })
  if (!res.ok) {
    // A 401 from /auth/* is just "wrong code" etc. — only a 401 elsewhere means the
    // session itself is dead.
    if (res.status === 401 && !path.startsWith('/auth/') && _token) _onUnauthorized?.()
    let code = String(res.status)
    let message = res.statusText
    let details: unknown
    try {
      const body = await res.clone().json() as { error?: { code?: string; message?: string; details?: unknown } }
      code = body.error?.code ?? code
      message = body.error?.message ?? message
      details = body.error?.details
    } catch { /* ignore parse error */ }
    throw new ApiError(res.status, code, message, details)
  }
  return res
}

// ─── Excel portal-data import ────────────────────────────────────────────────
// Mirrors the backend's ImportProblem/ImportOutcome shapes (premera-engagement-api
// src/import/types.ts, src/import/service.ts) — keep in sync if either changes.

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
// Matches the backend's express.raw({ limit: '5mb' }) on POST /portal/import — checking
// client-side too means a too-large file fails instantly instead of after a full upload.
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export type ExcelProblemSeverity = 'error' | 'warning'

export interface ExcelProblem {
  severity: ExcelProblemSeverity
  code: string
  sheet: string
  cell?: string
  row?: number
  column?: string
  value?: string
  message: string
}

export interface ExcelImportSummary {
  workstreams: { ito: number; bpo: number }
  milestoneSections: number
  milestoneRows: number
  issues: number
  riskActions: number
  /** Optional: absent from an API that predates the Transition sheets. */
  transition?: { dashboardRows: number; raidItems: number }
}

export interface ExcelMergeInfo {
  baseVersion: number
  currentVersion: number
  /** People who updated the portal in between; their changes were kept. */
  changedBy: string[]
  yourChanges: number
}

export interface ExcelIdChanges {
  preserved: number
  minted: number
  removed: string[]
}

export interface ExcelOrphanedVotes {
  count: number
  itemIds: string[]
}

/** Body of a successful (200) POST /portal/import or /portal/rollback/:version response. */
export interface ExcelImportResult {
  version?: number
  unchanged: boolean
  dryRun: boolean
  summary?: ExcelImportSummary
  /** Set when the workbook was built on an older version than the portal had reached, and its
   * changes were merged with the changes made since instead of replacing them. */
  merge?: ExcelMergeInfo
  ids?: ExcelIdChanges
  orphanedVotes?: ExcelOrphanedVotes
  warnings: ExcelProblem[]
}

/** Shape of ApiError.details when an import is rejected with 422 VALIDATION_ERROR. */
export interface ExcelImportErrorDetails {
  totalProblems: number
  returnedProblems: number
  truncated: boolean
  problems: ExcelProblem[]
}

/**
 * Client-side gate before ever hitting the network — catches the wrong file type or
 * an oversized upload instantly, rather than after a full round-trip to the server.
 * Returns a user-facing message when the file is rejected, or null when it's fine to
 * upload (the server still re-validates; this is a fast-fail convenience, not a
 * substitute for server-side validation).
 */
export function validateExcelFile(file: File): string | null {
  const name = file.name.toLowerCase()
  if (name.endsWith('.xls')) {
    return 'Legacy .xls files are not supported. In Excel, use File › Save As and choose "Excel Workbook (.xlsx)", then upload that file.'
  }
  if (name.endsWith('.xlsm')) {
    return 'Macro-enabled .xlsm files are not supported. Save as .xlsx and try again.'
  }
  if (name.endsWith('.csv')) {
    return 'CSV files are not supported — the portal needs the multi-sheet .xlsx workbook.'
  }
  if (!name.endsWith('.xlsx')) {
    return 'Please choose the .xlsx portal workbook.'
  }
  if (file.size === 0) {
    return 'That file is empty.'
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `File is ${(file.size / 1_048_576).toFixed(1)} MB — the limit is ${MAX_UPLOAD_BYTES / 1_048_576} MB.`
  }
  return null
}

export interface UploadPortalExcelOptions {
  dryRun?: boolean
  /** Current document ETag, sent as If-Match for optimistic concurrency. */
  etag?: string | null
}

/**
 * Uploads the raw file bytes (not multipart/FormData — matches the backend's
 * `express.raw` route). The explicit Content-Type header below overrides apiFetch's
 * default 'application/json' via its existing Object.assign(headers, opts.headers)
 * merge, so no change to apiFetch itself is needed.
 */
export async function uploadPortalExcel(
  file: File,
  opts: UploadPortalExcelOptions = {},
): Promise<ExcelImportResult> {
  const params = new URLSearchParams()
  if (opts.dryRun) params.set('dryRun', 'true')
  params.set('filename', file.name)

  const headers: Record<string, string> = { 'Content-Type': XLSX_MIME }
  if (opts.etag) headers['If-Match'] = opts.etag

  const res = await apiFetch(`/portal/import?${params.toString()}`, {
    method: 'POST',
    headers,
    body: file,
  })
  return await res.json() as ExcelImportResult
}

export async function rollbackPortalTo(version: number): Promise<ExcelImportResult> {
  const res = await apiFetch(`/portal/rollback/${version}`, { method: 'POST' })
  return await res.json() as ExcelImportResult
}

/** Downloads the current portal-data workbook. `kind` picks the label the backend
 * sends back as Content-Disposition — both routes return the same pre-filled
 * generator output in Phase 1 (see the backend's routes/portalImport.ts). */
export async function downloadPortalWorkbook(kind: 'template' | 'export'): Promise<Blob> {
  const res = await apiFetch(`/portal/${kind}.xlsx`)
  return await res.blob()
}

/** Triggers a browser "Save As" for an in-memory blob — the same pattern Admin.tsx's
 * JSON export already used inline; centralized here so it isn't duplicated. */
export function saveBlobAs(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
