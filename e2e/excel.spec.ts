import { test, expect, type APIRequestContext } from '@playwright/test'
import { createRequire } from 'node:module'
import path from 'node:path'
import fs from 'node:fs'
import { E2E_DIR } from '../playwright.config'
import { USERS, api, loadPortal, signInAs, tokenFor } from './helpers'

// ExcelJS lives in the API project; borrow it rather than add it to the web app.
const requireFromApi = createRequire(path.join(E2E_DIR, '..', '..', '..', 'premera-engagement-api', 'package.json'))
const ExcelJS = requireFromApi('exceljs')

async function exportWorkbook(request: APIRequestContext): Promise<Buffer> {
  const token = await tokenFor(request, USERS.ust)
  const res = await api(request, token, 'GET', '/portal/export.xlsx')
  expect(res.ok()).toBeTruthy()
  return Buffer.from(await res.body())
}

/** Sets the Workstreams "Status Note" of the first data row. */
async function withStatusNote(buffer: Buffer, note: string): Promise<string> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer)
  const ws = wb.getWorksheet('Workstreams')
  const header: string[] = []
  ws.getRow(1).eachCell((c: { value: unknown }, i: number) => (header[i] = String(c.value)))
  ws.getRow(2).getCell(header.indexOf('Status Note')).value = note
  const file = path.join(E2E_DIR, `upload-${Date.now()}-${Math.random().toString(36).slice(2)}.xlsx`)
  await wb.xlsx.writeFile(file)
  return file
}

test.beforeEach(async ({ request }) => {
  await loadPortal(request)
})

test.describe('Data Sync (Excel)', () => {
  test('Download current workbook gives an .xlsx file', async ({ page, request }) => {
    await signInAs(page, request, USERS.ust, '/admin')
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Download current workbook/ }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/)
    const file = path.join(E2E_DIR, 'downloaded.xlsx')
    await download.saveAs(file)
    expect(fs.statSync(file).size).toBeGreaterThan(10_000)
  })

  test('a non-Excel file is refused before upload, and Sync stays disabled', async ({ page, request }) => {
    await signInAs(page, request, USERS.ust, '/admin')
    const file = path.join(E2E_DIR, 'notes.txt')
    fs.writeFileSync(file, 'hello')
    await page.locator('input[type=file]').setInputFiles(file)
    await expect(page.getByText(/xlsx/i).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sync now' })).toBeDisabled()
  })

  test('re-uploading an unchanged workbook reports nothing to change', async ({ page, request }) => {
    const file = path.join(E2E_DIR, 'unchanged.xlsx')
    fs.writeFileSync(file, await exportWorkbook(request))
    await signInAs(page, request, USERS.ust, '/admin')
    await page.locator('input[type=file]').setInputFiles(file)
    await page.getByRole('button', { name: 'Sync now' }).click()
    await expect(page.getByText(/no changes|already up to date|unchanged|nothing to/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('dry run previews a change without saving it; Sync now saves it and the Program page shows it', async ({ page, request }) => {
    const note = `E2E note ${Date.now()}`
    const file = await withStatusNote(await exportWorkbook(request), note)
    await signInAs(page, request, USERS.ust, '/admin')
    await page.locator('input[type=file]').setInputFiles(file)
    await page.getByRole('button', { name: 'Preview (dry run)' }).click()
    await expect(page.getByText(/preview|dry run/i).first()).toBeVisible({ timeout: 15_000 })
    const token = await tokenFor(request, USERS.ust)
    expect(JSON.stringify(await (await api(request, token, 'GET', '/portal')).json())).not.toContain(note)

    await page.getByRole('button', { name: 'Sync now' }).click()
    await expect.poll(async () => JSON.stringify(await (await api(request, token, 'GET', '/portal')).json()), { timeout: 15_000 }).toContain(note)
  })

  test('two people editing the same field from the same download get a clear choice', async ({ page, request }) => {
    const base = await exportWorkbook(request)
    const first = await withStatusNote(base, 'First person wins the race')
    const second = await withStatusNote(base, 'Second person, same field')
    // Someone else uploads first (different user, so it is a real clash).
    const other = await tokenFor(request, { email: 'e2e.other@ust.com', role: 'ust_stakeholder' })
    const up = await request.post(`${(await import('../playwright.config')).API}/portal/import`, {
      headers: { Authorization: `Bearer ${other}`, 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      data: fs.readFileSync(first),
    })
    expect(up.ok(), await up.text()).toBeTruthy()

    await signInAs(page, request, USERS.ust, '/admin')
    await page.locator('input[type=file]').setInputFiles(second)
    await page.getByRole('button', { name: 'Sync now' }).click()
    await expect(page.getByRole('button', { name: "Keep the portal's values" })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Use my values' }).click()
    const token = await tokenFor(request, USERS.ust)
    await expect.poll(async () => JSON.stringify(await (await api(request, token, 'GET', '/portal')).json()), { timeout: 15_000 }).toContain('Second person, same field')
  })

  test('a workbook with a broken row is rejected with a row-level report and nothing changes', async ({ page, request }) => {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await exportWorkbook(request))
    const ws = wb.getWorksheet('Workstreams')
    const header: string[] = []
    ws.getRow(1).eachCell((c: { value: unknown }, i: number) => (header[i] = String(c.value)))
    ws.getRow(2).getCell(header.indexOf('Status')).value = 'Sort of OK'
    const file = path.join(E2E_DIR, 'broken.xlsx')
    await wb.xlsx.writeFile(file)
    await signInAs(page, request, USERS.ust, '/admin')
    await page.locator('input[type=file]').setInputFiles(file)
    await page.getByRole('button', { name: 'Sync now' }).click()
    await expect(page.getByText(/Sort of OK/).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Nothing was changed|not imported|rejected|fix/i).first()).toBeVisible()
  })

  test('Reset to defaults is only offered to the Super Admin', async ({ page, request }) => {
    await signInAs(page, request, USERS.ust, '/admin')
    await expect(page.getByRole('button', { name: /Reset to defaults/ })).toHaveCount(0)
  })
})
