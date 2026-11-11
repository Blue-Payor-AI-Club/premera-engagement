import { test, expect, type Page } from '@playwright/test'
import { SHARED_RAID, UST_RAID, USERS, api, gridRow, loadPortal, signInAs, tokenFor } from './helpers'
import { API } from '../playwright.config'

// In-app editing (UST only). Each test reloads the demo data so they don't depend on each other.
test.beforeEach(async ({ request }) => {
  await loadPortal(request)
})

const dialog = (page: Page) => page.getByRole('dialog')

test.describe('In-app editing', () => {
  test("UST edits a tab's RAID item: the change shows at once, survives a reload and is in the Activity log", async ({ page, request }) => {
    await signInAs(page, request, USERS.ust, '/program')
    await (await gridRow(page, SHARED_RAID)).getByRole('button', { name: 'Edit RAID item' }).click()
    await dialog(page).getByLabel('Description').fill('RAID edited in the app')
    await dialog(page).getByLabel('Due Date').fill('2026-12-01')
    await dialog(page).getByRole('button', { name: 'Save' }).click()
    await expect(dialog(page)).toBeHidden()
    await expect(page.locator('.ag-row', { hasText: 'RAID edited in the app' })).toContainText('12/1/2026')
    await page.reload()
    await expect(page.locator('.ag-row', { hasText: 'RAID edited in the app' })).toBeVisible()

    await page.goto('/activity')
    await expect(page.getByText(/portal: Edited RAID item/).first()).toBeVisible()
  })

  test('required fields and bad dates are refused in the form, nothing is saved', async ({ page, request }) => {
    await signInAs(page, request, USERS.ust, '/program')
    await (await gridRow(page, SHARED_RAID)).getByRole('button', { name: 'Edit RAID item' }).click()
    await dialog(page).getByLabel('Description').fill('')
    await dialog(page).getByLabel('Due Date').fill('next week')
    await dialog(page).getByRole('button', { name: 'Save' }).click()
    await expect(dialog(page).getByText('Description is required.')).toBeVisible()
    await expect(dialog(page).getByText(/Enter a date as M\/D\/YYYY/)).toBeVisible()
    await dialog(page).getByRole('button', { name: 'Cancel' }).click()
    await expect(page.locator('.ag-row', { hasText: SHARED_RAID })).toBeVisible()
  })

  test("a RAID item added on a tab belongs to that tab's workstream", async ({ page, request }) => {
    await signInAs(page, request, USERS.ust, '/program?tab=Database%20Administration')
    await page.getByRole('button', { name: 'Add RAID item' }).click()
    await expect(dialog(page).getByLabel(/^Workstream/)).toHaveValue('Database Administration')
    await dialog(page).getByLabel('Description').fill('E2E RAID dependency')
    await dialog(page).getByLabel('RAID').selectOption('D')
    await dialog(page).getByRole('button', { name: 'Save' }).click()
    await expect(page.locator('.ag-row', { hasText: 'E2E RAID dependency' })).toContainText('D')
    await page.getByRole('tab', { name: 'Service Desk and ITOC' }).click()
    await expect(page.getByText('E2E RAID dependency')).toHaveCount(0)
  })

  test("UST sets a tab's overall status and summary from its title card", async ({ page, request }) => {
    await signInAs(page, request, USERS.ust, '/program?tab=Claims%20Operations%20(100-400)')
    await page.getByRole('button', { name: 'Edit Claims Operations (100-400) overall status' }).click()
    await dialog(page).getByLabel(/^Overall Status \(/).selectOption('delayed')
    await dialog(page).getByLabel('Overall Status Summary').fill('E2E claims summary')
    await dialog(page).getByRole('button', { name: 'Save' }).click()
    const card = page.getByRole('region', { name: 'Transition Program Summary - Claims Operations (100-400)' })
    await expect(card).toContainText('Overall: Delayed')
    await expect(card).toContainText('E2E claims summary')
    const admin = await tokenFor(request, USERS.super)
    const doc = await (await api(request, admin, 'GET', '/portal')).json()
    const claims = doc.transition.dashboard.find((w: { workstream: string }) => w.workstream === 'Claims Operations')
    expect([claims.status, claims.summary]).toEqual(['delayed', 'E2E claims summary'])
  })

  test('someone else saved first: the user is told, the latest data loads, nothing is overwritten', async ({ page, request }) => {
    await signInAs(page, request, USERS.ust, '/program')
    await (await gridRow(page, SHARED_RAID)).getByRole('button', { name: 'Edit RAID item' }).click()

    // Meanwhile another UST user changes the Transition As-Of date.
    const other = await tokenFor(request, USERS.super)
    const got = await api(request, other, 'GET', '/portal')
    const doc = await got.json()
    doc.transition.asOf = '1/2/2027'
    const put = await request.fetch(`${API}/portal/edit`, {
      method: 'PUT', data: { data: doc, summary: 'other user' },
      headers: { Authorization: `Bearer ${other}`, 'If-Match': got.headers()['etag'] },
    })
    expect(put.ok()).toBeTruthy()

    await dialog(page).getByLabel('Description').fill('My stale edit')
    await dialog(page).getByRole('button', { name: 'Save' }).click()
    await expect(dialog(page).getByText(/Someone else saved a change/)).toBeVisible()
    await dialog(page).getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByText('1/2/2027').first()).toBeVisible()
    await expect(page.getByText('My stale edit')).toHaveCount(0)
  })

  test('Premera users get no edit controls, and the edit endpoint refuses them', async ({ page, request }) => {
    const token = await signInAs(page, request, USERS.premera, '/program')
    await expect(page.getByText('Service desk KT is on plan.')).toBeVisible()
    await expect(page.getByRole('button', { name: /^Edit|^Add / })).toHaveCount(0)
    await page.goto('/report')
    await expect(page.getByText('Transition Program Executive Summary')).toBeVisible()
    await expect(page.getByRole('button', { name: /^Edit|^Add / })).toHaveCount(0)
    const res = await request.fetch(`${API}/portal/edit`, {
      method: 'PUT', data: { data: {}, summary: 'x' }, headers: { Authorization: `Bearer ${token}`, 'If-Match': '"1"' },
    })
    expect(res.status()).toBe(403)
  })
})

test.describe('Client-facing view', () => {
  test('UST "View as Premera" shows exactly the Premera view, with editing off, and exits cleanly', async ({ page, request }) => {
    await signInAs(page, request, USERS.ust, '/program')
    await expect(page.getByText(UST_RAID).first()).toBeVisible() // UST only
    await page.getByRole('button', { name: 'View as Premera' }).click()
    await expect(page.getByText('Previewing as Premera.')).toBeVisible()
    await expect(page.getByText(UST_RAID)).toHaveCount(0)
    await expect(page.getByText(SHARED_RAID).first()).toBeVisible() // shared with Premera
    await expect(page.getByRole('button', { name: /^Edit|^Add / })).toHaveCount(0)
    await expect(page.getByText('UST only')).toHaveCount(0)
    await page.getByRole('button', { name: 'Exit preview' }).click()
    await expect(page.getByText(UST_RAID).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add RAID item' })).toBeVisible()
  })

  test('past-due RAID items are tagged Overdue and counted; Premera sees empty-state text for areas not shared', async ({ page, request }) => {
    await signInAs(page, request, USERS.premera, '/program')
    // The demo RAID due dates are October 2026.
    await expect(page.getByText(/^Overdue: \d+/)).toBeVisible()
    await expect(page.getByText('Overdue', { exact: true }).first()).toBeVisible()
    await page.getByRole('tab', { name: 'Claims Operations (100-400)' }).click()
    await expect(page.getByText('Nothing shared for Claims Operations (100-400) yet.')).toBeVisible()
    await expect(page.getByText(/Updated /).first()).toBeVisible()
  })
})
