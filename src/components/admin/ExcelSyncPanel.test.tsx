import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExcelSyncPanel from './ExcelSyncPanel'
import { PortalDataContext } from '../../context/PortalDataContext'
import { DEFAULT_PORTAL_DATA } from '../../data/portalData'
import { ApiError, type ExcelImportResult } from '../../lib/api'
import * as api from '../../lib/api'

vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api')>()
  return {
    ...actual,
    uploadPortalExcel: vi.fn(),
    downloadPortalWorkbook: vi.fn(),
    saveBlobAs: vi.fn(),
  }
})

function renderPanel(refresh = vi.fn()) {
  return render(
    <PortalDataContext.Provider
      value={{
        data: DEFAULT_PORTAL_DATA,
        loading: false,
        error: null,
        refresh,
        replaceDocument: vi.fn(),
        reset: vi.fn(),
      }}
    >
      <ExcelSyncPanel />
    </PortalDataContext.Provider>,
  )
}

function pngFile(name: string): File {
  return new File([new Uint8Array(10)], name, { type: 'image/png' })
}

function xlsxFile(name = 'portal-data.xlsx'): File {
  return new File([new Uint8Array(10)], name)
}

function successResult(overrides: Partial<ExcelImportResult> = {}): ExcelImportResult {
  return {
    version: 8,
    unchanged: false,
    dryRun: false,
    summary: { workstreams: { ito: 7, bpo: 7 }, milestoneSections: 11, milestoneRows: 62, issues: 12, riskActions: 9 },
    ids: { preserved: 118, minted: 0, removed: [] },
    orphanedVotes: { count: 0, itemIds: [] },
    warnings: [],
    ...overrides,
  }
}

// Not userEvent.upload() — it honors the input's `accept` attribute and silently
// skips files that don't match (as a real browser's file picker would), which is
// exactly the case the "non-xlsx file" test needs to exercise. fireEvent bypasses
// that filtering and dispatches the change event directly.
function selectFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
}

beforeEach(() => {
  vi.mocked(api.uploadPortalExcel).mockReset()
  vi.mocked(api.downloadPortalWorkbook).mockReset()
  vi.mocked(api.saveBlobAs).mockReset()
})

describe('ExcelSyncPanel', () => {
  it('a non-xlsx file is rejected client-side with zero network call', async () => {
    renderPanel()

    selectFile(pngFile('logo.png'))

    expect(await screen.findByText(/choose the \.xlsx/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sync now/i })).toBeDisabled()
    expect(api.uploadPortalExcel).not.toHaveBeenCalled()
  })

  it('upload success renders the summary and refreshes the document', async () => {
    const refresh = vi.fn()
    vi.mocked(api.uploadPortalExcel).mockResolvedValue(successResult())
    const user = userEvent.setup()
    renderPanel(refresh)

    selectFile(xlsxFile())
    await user.click(screen.getByRole('button', { name: /sync now/i }))

    expect(await screen.findByText(/sync complete/i)).toBeInTheDocument()
    expect(screen.getByText(/14 workstreams/)).toBeInTheDocument()
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
  })

  it('a dry run does not call refresh', async () => {
    const refresh = vi.fn()
    vi.mocked(api.uploadPortalExcel).mockResolvedValue(successResult({ dryRun: true }))
    const user = userEvent.setup()
    renderPanel(refresh)

    selectFile(xlsxFile())
    await user.click(screen.getByRole('button', { name: /preview/i }))

    expect(await screen.findByText(/preview only/i)).toBeInTheDocument()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('renders grouped cell-level validation errors on rejection, without calling refresh', async () => {
    const refresh = vi.fn()
    vi.mocked(api.uploadPortalExcel).mockRejectedValue(
      new ApiError(422, 'VALIDATION_ERROR', 'Import rejected', {
        totalProblems: 1,
        returnedProblems: 1,
        truncated: false,
        problems: [{ severity: 'error', code: 'INVALID_ENUM', sheet: 'Workstreams', cell: 'E2', message: "'On Trak' is not a valid Status" }],
      }),
    )
    const user = userEvent.setup()
    renderPanel(refresh)

    selectFile(xlsxFile())
    await user.click(screen.getByRole('button', { name: /sync now/i }))

    expect(await screen.findByText(/import rejected: 1 problem/i)).toBeInTheDocument()
    expect(screen.getByText('Workstreams!E2')).toBeInTheDocument()
    expect(screen.getByText(/is not a valid status/i)).toBeInTheDocument()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('shows the "download updated workbook" callout whenever ids.minted > 0', async () => {
    vi.mocked(api.uploadPortalExcel).mockResolvedValue(successResult({ ids: { preserved: 100, minted: 3, removed: [] } }))
    const user = userEvent.setup()
    renderPanel()

    selectFile(xlsxFile())
    await user.click(screen.getByRole('button', { name: /sync now/i }))

    expect(await screen.findByText(/3 new rows were assigned/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /download updated workbook/i })).toBeInTheDocument()
  })

  it('maps a 403 transport error to an admin-actionable message', async () => {
    vi.mocked(api.uploadPortalExcel).mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'nope'))
    const user = userEvent.setup()
    renderPanel()

    selectFile(xlsxFile())
    await user.click(screen.getByRole('button', { name: /sync now/i }))

    expect(await screen.findByText(/not an admin/i)).toBeInTheDocument()
  })
})
