import { test, expect, type Page } from '@playwright/test'
import { USERS, api, loadPortal, signInAs, tokenFor } from './helpers'
import { API } from '../playwright.config'

// In-app editing (UST only). Each test reloads the demo data so they don't depend on each other.
test.beforeEach(async ({ request }) => {
  await loadPortal(request)
})

const RUNBOOKS = /Operational runbooks for Application Support tower \(sections 4–7\) not finalized/
const dialog = (page: Page) => page.getByRole('dialog')

test.describe('In-app editing', () => {
  test('UST edits a risk: the change shows at once, survives a reload and is in the Activity log', async ({ page, request }) => {
    await signInAs(page, request, USERS.ust, '/risks')
    const row = page.locator('tr', { hasText: RUNBOOKS })
    await row.getByRole('button', { name: 'Edit risk / issue' }).click()
    await dialog(page).getByLabel('Risk / Issue').fill('Runbooks edited in the app')
    await dialog(page).getByLabel('Due').fill('2026-12-01')
    await dialog(page).getByRole('button', { name: 'Save' }).click()
    await expect(dialog(page)).toBeHidden()
    const edited = page.locator('tr', { hasText: 'Runbooks edited in the app' })
    await expect(edited).toContainText('12/1/2026')
    await page.reload()
    await expect(page.locator('tr', { hasText: 'Runbooks edited in the app' })).toBeVisible()

    await page.goto('/activity')
    await expect(page.getByText(/portal: Edited risk \/ issue/).first()).toBeVisible()
  })

  test('required fields and bad dates are refused in the form, nothing is saved', async ({ page, request }) => {
    await signInAs(page, request, USERS.ust, '/risks')
    await page.locator('tr', { hasText: RUNBOOKS }).getByRole('button', { name: 'Edit risk / issue' }).click()
    await dialog(page).getByLabel('Risk / Issue').fill('')
    await dialog(page).getByLabel('Due').fill('next week')
    await dialog(page).getByRole('button', { name: 'Save' }).click()
    await expect(dialog(page).getByText('Risk / Issue is required.')).toBeVisible()
    await expect(dialog(page).getByText(/Enter a date as M\/D\/YYYY/)).toBeVisible()
    await dialog(page).getByRole('button', { name: 'Cancel' }).click()
    await expect(page.locator('tr', { hasText: RUNBOOKS })).toBeVisible()
  })

  test('add a risk, then add and delete an action on it', async ({ page, request }) => {
    await signInAs(page, request, USERS.ust, '/risks')
    await page.getByRole('button', { name: 'Add risk / issue' }).click()
    await dialog(page).getByLabel('Division').selectOption('bpo')
    await dialog(page).getByLabel('Risk / Issue').fill('E2E new BPO risk')
    await dialog(page).getByRole('button', { name: 'Save' }).click()
    const row = page.locator('tr', { hasText: 'E2E new BPO risk' })
    await expect(row).toBeVisible()

    await row.getByRole('button', { name: 'Actions' }).click()
    await page.getByRole('button', { name: 'Add action' }).click()
    await dialog(page).getByRole('textbox', { name: /^Action/ }).fill('E2E follow-up')
    await dialog(page).getByLabel('Owner').fill('UST PMO')
    await dialog(page).getByRole('button', { name: 'Save' }).click()
    await expect(page.locator('td', { hasText: 'E2E follow-up' })).toBeVisible()
    // Esc on the edit form must not also close the actions window underneath.
    await page.locator('tr', { hasText: 'E2E follow-up' }).getByRole('button', { name: 'Edit action' }).click()
    await page.keyboard.press('Escape')
    await expect(page.getByText('Actions & Ownership')).toBeVisible()

    await page.locator('tr', { hasText: 'E2E follow-up' }).getByRole('button', { name: 'Edit action' }).click()
    page.once('dialog', (d) => d.accept())
    await dialog(page).getByRole('button', { name: 'Delete' }).click()
    await expect(page.locator('td', { hasText: 'E2E follow-up' })).toHaveCount(0)
  })

  test('someone else saved first: the user is told, the latest data loads, nothing is overwritten', async ({ page, request }) => {
    await signInAs(page, request, USERS.ust, '/risks')
    await page.locator('tr', { hasText: RUNBOOKS }).getByRole('button', { name: 'Edit risk / issue' }).click()

    // Meanwhile another UST user changes the As-Of date.
    const other = await tokenFor(request, USERS.super)
    const got = await api(request, other, 'GET', '/portal')
    const doc = await got.json()
    doc.asOf = '1/2/2027'
    const put = await request.fetch(`${API}/portal/edit`, {
      method: 'PUT', data: { data: doc, summary: 'other user' },
      headers: { Authorization: `Bearer ${other}`, 'If-Match': got.headers()['etag'] },
    })
    expect(put.ok()).toBeTruthy()

    await dialog(page).getByLabel('Risk / Issue').fill('My stale edit')
    await dialog(page).getByRole('button', { name: 'Save' }).click()
    await expect(dialog(page).getByText(/Someone else saved a change/)).toBeVisible()
    await dialog(page).getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByText('1/2/2027')).toBeVisible()
    await expect(page.getByText('My stale edit')).toHaveCount(0)
  })

  test('edit an operational area and add a program milestone on Program Level', async ({ page, request }) => {
    await signInAs(page, request, USERS.ust, '/program')
    const grid = page.locator('[data-tour="workstream-grid"]')
    await grid.getByRole('button', { name: /^Edit / }).first().click()
    await dialog(page).getByLabel('Status Note').fill('E2E status note')
    await dialog(page).getByRole('button', { name: 'Save' }).click()
    await expect(dialog(page)).toBeHidden()
    // Reopening starts from the saved row, not the grid's stale copy (which would undo the edit on the next save).
    await grid.getByRole('button', { name: /^Edit / }).first().click()
    await expect(dialog(page).getByLabel('Status Note')).toHaveValue('E2E status note')
    await dialog(page).getByRole('button', { name: 'Cancel' }).click()

    await page.getByRole('button', { name: 'Add milestone', exact: true }).last().click()
    await dialog(page).getByRole('textbox', { name: /^Milestone/ }).fill('E2E milestone')
    await dialog(page).getByLabel('Due').fill('TBD')
    await dialog(page).getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('E2E milestone').first()).toBeVisible()

    // A workstream's own milestones, inside the grid's expanded row.
    await grid.getByRole('button', { name: 'Expand milestones' }).first().click()
    await grid.getByRole('button', { name: 'Add milestone', exact: true }).first().click()
    await dialog(page).getByRole('textbox', { name: /^Milestone/ }).fill('E2E workstream milestone')
    await dialog(page).getByRole('button', { name: 'Save' }).click()
    await expect(grid.getByText('E2E workstream milestone').first()).toBeVisible()

    const admin = await tokenFor(request, USERS.super)
    const doc = await (await api(request, admin, 'GET', '/portal')).json()
    expect(JSON.stringify(doc.program.ito.workstreams[0].milestones)).toContain('E2E workstream milestone')
    expect(doc.program.ito.workstreams.some((w: { statusMessage?: string }) => w.statusMessage === 'E2E status note')).toBe(true)
  })

  test('Transition: add a RAID item and edit the header status', async ({ page, request }) => {
    await signInAs(page, request, USERS.ust, '/program')
    await page.getByRole('tab', { name: /Transition/ }).click()
    await page.getByRole('button', { name: 'Add RAID item' }).click()
    await dialog(page).getByLabel('Description').fill('E2E RAID dependency')
    await dialog(page).getByLabel('RAID').selectOption('D')
    await dialog(page).getByRole('button', { name: 'Save' }).click()
    await expect(page.locator('tr', { hasText: 'E2E RAID dependency' })).toContainText('D')

    await page.getByRole('button', { name: 'Edit transition header' }).click()
    await dialog(page).getByLabel('Transition Overall Status').selectOption('delayed')
    await dialog(page).getByRole('button', { name: 'Save' }).click()
    await expect(dialog(page)).toBeHidden()
    const admin = await tokenFor(request, USERS.super)
    const doc = await (await api(request, admin, 'GET', '/portal')).json()
    expect(doc.transition.overallStatus).toBe('delayed')
  })

  test('Premera users get no edit controls, and the edit endpoint refuses them', async ({ page, request }) => {
    const token = await signInAs(page, request, USERS.premera, '/risks')
    await expect(page.getByText(/Risks & Issues:/)).toBeVisible()
    await expect(page.getByRole('button', { name: /^Edit|^Add / })).toHaveCount(0)
    await page.goto('/program')
    await expect(page.getByText(/Operational Areas/)).toBeVisible()
    await expect(page.getByRole('button', { name: /^Edit|^Add / })).toHaveCount(0)
    const res = await request.fetch(`${API}/portal/edit`, {
      method: 'PUT', data: { data: {}, summary: 'x' }, headers: { Authorization: `Bearer ${token}`, 'If-Match': '"1"' },
    })
    expect(res.status()).toBe(403)
  })
})
