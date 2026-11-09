import { test, expect } from '@playwright/test'
import { USERS, api, loadPortal, signInAs, tokenFor } from './helpers'

test.beforeAll(async ({ request }) => {
  await loadPortal(request)
})

test.describe('Program Level', () => {
  test('ITO is the default tab and shows its workstreams and the status key', async ({ page, request }) => {
    await signInAs(page, request, USERS.ust)
    await expect(page.getByRole('tab', { name: /ITO/ })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('Delivery & Operational Continuity').first()).toBeVisible()
    for (const label of ['On Track', 'At Risk', 'Delayed', 'Complete']) {
      await expect(page.getByText(label, { exact: true }).filter({ visible: true }).first()).toBeVisible()
    }
  })

  test('switching to BPO and Transition changes the content', async ({ page, request }) => {
    await signInAs(page, request, USERS.ust)
    await page.getByRole('tab', { name: /BPO/ }).click()
    await expect(page.getByRole('tab', { name: /BPO/ })).toHaveAttribute('aria-selected', 'true')
    await page.getByRole('tab', { name: /Transition/ }).click()
    await expect(page.getByTestId('transition-tab')).toBeVisible()
    await expect(page.getByText('Transition Program Executive Summary')).toBeVisible()
    await expect(page.getByText('Transition Program Dashboard')).toBeVisible()
  })

  test('the Executive Summary collapses and expands', async ({ page, request }) => {
    await signInAs(page, request, USERS.ust)
    await page.getByRole('tab', { name: /Transition/ }).click()
    const toggle = page.getByRole('button', { name: /Transition Program Executive Summary/ })
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByText('Key Accomplishments')).toBeHidden()
    await toggle.click()
    await expect(page.getByText('Key Accomplishments')).toBeVisible()
  })

  test('the selected tab survives a page reload', async ({ page, request }) => {
    await signInAs(page, request, USERS.ust)
    await page.getByRole('tab', { name: /BPO/ }).click()
    await page.reload()
    // Expected for production: a reload keeps the user where they were.
    await expect(page.getByRole('tab', { name: /BPO/ })).toHaveAttribute('aria-selected', 'true')
  })
})

test.describe('quick feedback (thumbs)', () => {
  // The grid renders its rows a moment after the page; until then the first thumbs on screen is a
  // milestone's, so 'first visible' would point at different controls before and after.
  const gridReady = (page: import('@playwright/test').Page) => expect(page.locator('[data-tour="workstream-grid"] [row-id] [title="Needs attention"]').first()).toBeVisible()

  test('thumbs up records a vote that survives a reload, and a second click removes it', async ({ page, request }) => {
    const who = { email: `e2e.thumbs${Date.now()}@ust.com`, role: 'ust_stakeholder' as const }
    const token = await signInAs(page, request, who)
    await gridReady(page)
    // The first operational area's thumbs-up, in the grid (not a milestone's, whose grid can render first).
    const up = page.locator('[data-tour="workstream-grid"] [row-id] [title="Good"]').first()
    const id = await up.locator('xpath=ancestor::*[@row-id][1]').getAttribute('row-id')
    await up.click()
    await expect(up).toHaveClass(/emerald-600/)
    await expect.poll(async () => (await api(request, token, 'GET', `/quick-feedback/${id}`)).json().then((v) => v?.vote), { timeout: 10_000 }).toBe('up')
    await page.reload()
    await gridReady(page)
    await expect(up).toHaveClass(/emerald-600/)
    await up.click()
    await expect(up).not.toHaveClass(/emerald-600/)
  })

  test('thumbs down: empty Submit is refused, Skip keeps the vote, a typed concern is saved', async ({ page, request }) => {
    const who = { email: `e2e.down${Date.now()}@premera.com`, role: 'premera_stakeholder' as const }
    // Premera users need something visible to vote on: the demo flags one workstream per division.
    await signInAs(page, request, who)
    await gridReady(page)
    // Wait for the real document: clicking during the bundled-sample flash (D2) votes on a row that is then replaced.
    await expect(page.getByText('Delivery & Operational Continuity').first()).toBeVisible()
    await expect(page.getByText(/1 Operational Area shared with you/)).toBeVisible()
    // Each row renders the control twice (grid + phone layout); always use the visible one.
    const down = page.getByTitle('Needs attention').filter({ visible: true }).first()
    await down.click()
    await page.getByRole('button', { name: 'Submit' }).click()
    await expect(page.getByRole('alert')).toHaveText('Please describe your concern, or choose Skip.')
    await page.getByRole('button', { name: 'Skip' }).click()
    await expect(page.getByPlaceholder('Describe the concern...')).toHaveCount(0)
    await expect(down).toHaveClass(/red-500/)

  })

  test('thumbs down with a typed concern saves the comment (unicode kept)', async ({ page, request }) => {
    const who = { email: `e2e.concern${Date.now()}@ust.com`, role: 'ust_stakeholder' as const }
    const admin = await tokenFor(request, USERS.super)
    await signInAs(page, request, who)
    await gridReady(page)
    await page.getByTitle('Needs attention').filter({ visible: true }).nth(1).click()
    await page.getByPlaceholder('Describe the concern...').fill('Dates slipped twice ✓ — ünïcode check')
    await page.getByRole('button', { name: 'Submit' }).click()
    await expect(page.getByPlaceholder('Describe the concern...')).toHaveCount(0)
    const votes = await (await api(request, admin, 'GET', '/quick-feedback')).json()
    const list = Array.isArray(votes) ? votes : votes.entries
    expect(list.some((v: { comment?: string }) => v.comment === 'Dates slipped twice ✓ — ünïcode check')).toBeTruthy()
  })

  test('Esc closes the concern popup without losing the vote', async ({ page, request }) => {
    await signInAs(page, request, { email: `e2e.esc${Date.now()}@ust.com`, role: 'ust_stakeholder' })
    await gridReady(page)
    await page.getByTitle('Needs attention').filter({ visible: true }).first().click()
    await expect(page.getByPlaceholder('Describe the concern...')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByPlaceholder('Describe the concern...')).toHaveCount(0)
    await expect(page.getByTitle('Needs attention').filter({ visible: true }).first()).toHaveClass(/red-500/)
  })
})

test('@mobile Program Level is usable on a phone: nav menu toggles and tabs work', async ({ page, request }) => {
  await signInAs(page, request, USERS.ust)
  await page.getByRole('button', { name: 'Toggle menu' }).click()
  await expect(page.getByRole('link', { name: 'Risks & Issues' }).last()).toBeVisible()
  await page.getByRole('button', { name: 'Toggle menu' }).click()
  await page.getByRole('tab', { name: /BPO/ }).click()
  await expect(page.getByRole('tab', { name: /BPO/ })).toHaveAttribute('aria-selected', 'true')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow, 'page should not scroll sideways').toBeLessThanOrEqual(1)
})
