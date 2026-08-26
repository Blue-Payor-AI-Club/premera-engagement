import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  ApiError,
  apiFetch,
  setApiToken,
  validateExcelFile,
  uploadPortalExcel,
  downloadPortalWorkbook,
  saveBlobAs,
  MAX_UPLOAD_BYTES,
  XLSX_MIME,
} from './api'

function makeFile(name: string, size: number, content = 'x'): File {
  const bytes = size > 0 ? new Uint8Array(size) : new Uint8Array(0)
  const file = new File([bytes], name, { type: content })
  // jsdom's File.size is derived from the blob content, which already matches `size`.
  return file
}

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('validateExcelFile', () => {
  it('accepts a well-formed .xlsx under the size limit', () => {
    expect(validateExcelFile(makeFile('portal-data.xlsx', 1024))).toBeNull()
  })

  it('is case-insensitive about the extension', () => {
    expect(validateExcelFile(makeFile('REPORT.XLSX', 1024))).toBeNull()
  })

  it.each([
    ['legacy.xls', /legacy \.xls/i],
    ['macro.xlsm', /macro-enabled/i],
    ['export.csv', /CSV files are not supported/i],
    ['notes.txt', /choose the \.xlsx/i],
  ])('rejects %s with a distinguishing message', (name, pattern) => {
    const message = validateExcelFile(makeFile(name, 1024))
    expect(message).toMatch(pattern)
  })

  it('rejects an empty file', () => {
    expect(validateExcelFile(makeFile('empty.xlsx', 0))).toMatch(/empty/i)
  })

  it('rejects a file over the shared upload limit', () => {
    const message = validateExcelFile(makeFile('huge.xlsx', MAX_UPLOAD_BYTES + 1))
    expect(message).toMatch(/limit/i)
  })
})

describe('apiFetch / ApiError', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    setApiToken(null)
  })

  it('surfaces error.details from a non-2xx JSON body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ error: { code: 'VALIDATION_ERROR', message: 'bad workbook', details: { problems: [{ code: 'X' }] } } }, { status: 422 }),
    ))

    await expect(apiFetch('/portal')).rejects.toMatchObject({
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'bad workbook',
      details: { problems: [{ code: 'X' }] },
    })
  })

  it('attaches the bearer token once set', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}))
    vi.stubGlobal('fetch', fetchMock)
    setApiToken('tok_123')

    await apiFetch('/portal')

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok_123')
  })
})

describe('uploadPortalExcel', () => {
  beforeEach(() => setApiToken('tok_admin'))
  afterEach(() => vi.unstubAllGlobals())

  it('sends the raw file as the body with the xlsx content-type, not multipart/FormData', async () => {
    const file = makeFile('portal-data.xlsx', 2048)
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ unchanged: false, dryRun: false, version: 5, warnings: [] }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await uploadPortalExcel(file)

    expect(result.version).toBe(5)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/portal/import?')
    expect(url).toContain('filename=portal-data.xlsx')
    expect(url).not.toContain('dryRun')
    expect(init.method).toBe('POST')
    expect(init.body).toBe(file)
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(XLSX_MIME)
  })

  it('passes dryRun and If-Match through as query param / header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ unchanged: false, dryRun: true, warnings: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await uploadPortalExcel(makeFile('a.xlsx', 10), { dryRun: true, etag: '"7"' })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('dryRun=true')
    expect((init.headers as Record<string, string>)['If-Match']).toBe('"7"')
  })

  it('rejects with an ApiError carrying the aggregated problem list on 422', async () => {
    const details = { totalProblems: 1, returnedProblems: 1, truncated: false, problems: [{ severity: 'error', code: 'INVALID_ENUM', sheet: 'Workstreams', cell: 'E2', message: 'bad status' }] }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ error: { code: 'VALIDATION_ERROR', message: 'Import rejected', details } }, { status: 422 }),
    ))

    let caught: unknown
    try {
      await uploadPortalExcel(makeFile('bad.xlsx', 10))
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(ApiError)
    expect((caught as ApiError).details).toEqual(details)
  })
})

describe('downloadPortalWorkbook / saveBlobAs', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('fetches the requested workbook kind and returns it as a blob', async () => {
    const blob = new Blob(['fake xlsx bytes'], { type: XLSX_MIME })
    const fetchMock = vi.fn().mockResolvedValue(new Response(blob, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await downloadPortalWorkbook('export')

    expect(fetchMock.mock.calls[0][0]).toContain('/portal/export.xlsx')
    expect(result).toBeInstanceOf(Blob)
    expect(result.size).toBeGreaterThan(0)
  })

  it('triggers a browser download via a temporary anchor', () => {
    const blob = new Blob(['x'], { type: XLSX_MIME })
    const clickSpy = vi.fn()
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
      set href(_v: string) {},
      set download(_v: string) {},
      click: clickSpy,
    } as unknown as HTMLAnchorElement)
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake')
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    saveBlobAs(blob, 'portal-data.xlsx')

    expect(createElementSpy).toHaveBeenCalledWith('a')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(createUrlSpy).toHaveBeenCalledWith(blob)
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:fake')
  })
})
