import { test, expect } from '@playwright/test'
import { USERS, demoData, loadPortal, signInAs } from './helpers'

// Demo data has only At Risk issues; mark two as resolved so the filter has something to reveal.
test.beforeAll(async ({ request }) => {
  const d = demoData()
  d.program.ito.issues[3].status = 'complete'
  d.program.bpo.issues[3].status = 'onTrack'
  await loadPortal(request, d)
})

const ITO_RESOLVED = /Background checks for 2 transitioning/
const ITO_AT_RISK = /Operational runbooks for Application Sup/

test.describe('Risks & Issues', () => {
  test('shows the status key', async ({ page, request }) => {
    await signInAs(page, request, USERS.ust, '/risks')
    for (const label of ['On Track', 'At Risk', 'Delayed', 'Complete', 'Not Started']) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible()
    }
  })

  test('by default only At Risk / Delayed items show; "Show All Statuses" adds the others', async ({ page, request }) => {
    await signInAs(page, request, USERS.ust, '/risks')
    await expect(page.getByText(ITO_AT_RISK).first()).toBeVisible()
    await expect(page.getByText(ITO_RESOLVED)).toHaveCount(0)
    await page.getByRole('button', { name: 'Show All Statuses' }).click()
    await expect(page.getByText(ITO_RESOLVED).first()).toBeVisible()
    await expect(page.getByText(ITO_AT_RISK).first()).toBeVisible()
    await page.getByRole('button', { name: 'Showing All Statuses' }).click()
    await expect(page.getByText(ITO_RESOLVED)).toHaveCount(0)
  })

  test('the risk count pill matches the At Risk items listed', async ({ page, request }) => {
    await signInAs(page, request, USERS.ust, '/risks')
    await expect(page.getByText(/Risks & Issues:\s*6/)).toBeVisible()
  })

  test('"Premera Action Items Only" combined with Show All Statuses', async ({ page, request }) => {
    await signInAs(page, request, USERS.ust, '/risks')
    await page.getByRole('button', { name: 'Premera Action Items Only' }).click()
    await expect(page.getByText(/Risks & Issues:\s*4/)).toBeVisible() // counts follow the filter
    await expect(page.getByText(/Payroll parallel run/)).toHaveCount(0)
    await expect(page.getByText(ITO_AT_RISK).first()).toBeVisible()
    await page.getByRole('button', { name: 'Show All Statuses' }).click()
    await expect(page.getByText(ITO_RESOLVED)).toHaveCount(0) // resolved but not a Premera item
  })

  test('the actions modal opens with the actions and closes with Esc and the X', async ({ page, request }) => {
    await signInAs(page, request, USERS.ust, '/risks')
    await page.getByRole('button', { name: /actions|View/i }).first().click()
    await expect(page.getByText('Actions & Ownership')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByText('Actions & Ownership')).toBeHidden()
    await page.getByRole('button', { name: /actions|View/i }).first().click()
    await page.locator('button:has(svg.lucide-x)').first().click()
    await expect(page.getByText('Actions & Ownership')).toBeHidden()
  })

  test('an issue with no actions says so', async ({ page, request }) => {
    await signInAs(page, request, USERS.ust, '/risks')
    const row = page.locator('tr', { hasText: /Background checks for 2|Enrollment & Billing reconciliation/ }).first()
    await page.getByRole('button', { name: 'Show All Statuses' }).click()
    await row.getByRole('button').last().click()
    await expect(page.getByText('No actions recorded yet.')).toBeVisible()
  })
})
