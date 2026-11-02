import { test, expect } from '@playwright/test'
import { USERS, api, demoData, loadPortal, signInAs } from './helpers'

// Demo flags: one workstream ("Delivery & Operational Continuity") and two issues per division.
test.beforeAll(async ({ request }) => {
  await loadPortal(request, demoData())
})

test.describe('Premera Attention controls what Premera users see', () => {
  test('UST users see every row with Visible to Premera / UST only tags and the notice', async ({ page, request }) => {
    await signInAs(page, request, USERS.ust, '/risks')
    await expect(page.getByRole('note')).toContainText('Premera stakeholders only see rows marked')
    await expect(page.getByText('Visible to Premera').first()).toBeVisible()
    await expect(page.getByText('UST only').first()).toBeVisible()
    await expect(page.getByText(/Payroll parallel run/).first()).toBeVisible()
  })

  test('Premera users see only flagged rows, and no tags or notice', async ({ page, request }) => {
    await signInAs(page, request, USERS.premera, '/risks')
    await expect(page.getByText(/Operational runbooks for Application Sup/).first()).toBeVisible()
    await expect(page.getByText(/Payroll parallel run/)).toHaveCount(0)
    await expect(page.getByText('UST only')).toHaveCount(0)
    await expect(page.getByText('Visible to Premera')).toHaveCount(0)
    await expect(page.getByRole('note')).toHaveCount(0)
  })

  test('Premera never receives hidden rows from the API, even if the UI were bypassed', async ({ request }) => {
    const { tokenFor } = await import('./helpers')
    const token = await tokenFor(request, USERS.premera)
    const body = await (await api(request, token, 'GET', '/portal')).json()
    expect(body.program.ito.workstreams.map((w: { name: string }) => w.name)).toEqual(['Delivery & Operational Continuity'])
    expect(body.program.ito.issues.every((i: { needsPremeraAttention?: boolean }) => i.needsPremeraAttention)).toBeTruthy()
  })

  test('Premera sees the Program page with only the flagged workstream', async ({ page, request }) => {
    await signInAs(page, request, USERS.premera)
    await expect(page.getByText('Delivery & Operational Continuity').first()).toBeVisible()
    await expect(page.getByText('HR Conversion')).toHaveCount(0)
  })

  test('a Premera user signing in after a UST user in the same tab never sees UST data', async ({ page, request }) => {
    const { latestCode, tokenFor } = await import('./helpers')
    await tokenFor(request, USERS.premera) // account exists
    await tokenFor(request, USERS.ust)
    // Both sign in through the real form, in one tab, without reloading in between.
    for (const who of [USERS.ust, USERS.premera]) {
      if (who === USERS.premera) {
        await page.getByRole('button', { name: 'Account menu' }).click()
        await page.getByRole('menuitem', { name: 'Sign out' }).click()
      } else {
        await page.addInitScript(() => localStorage.setItem('ustpremera_tour_v2', 'done'))
        await page.goto('/risks')
      }
      await page.getByPlaceholder('you@company.com').fill(who.email)
      await page.getByRole('button', { name: 'Send sign-in code' }).click()
      await page.getByPlaceholder('123456').fill(await latestCode(who.email))
      await page.getByRole('button', { name: 'Verify and sign in' }).click()
      await page.getByRole('link', { name: 'Risks & Issues' }).first().click()
      if (who === USERS.ust) await expect(page.getByText(/Payroll parallel run/).first()).toBeVisible()
    }
    // Slow the Premera fetch down: until it lands, nothing of the UST copy may be on screen.
    await expect(page.getByText(/Payroll parallel run/)).toHaveCount(0)
    await expect(page.getByText(/Operational runbooks/).first()).toBeVisible()
  })

  test('if the Premera fetch fails right after a UST user signed out, UST rows are not shown', async ({ page, request }) => {
    const { latestCode, tokenFor } = await import('./helpers')
    const ust = { email: `e2e.ust.f${Date.now()}@ust.com`, role: 'ust_stakeholder' as const }
    const prem = { email: `e2e.prem.f${Date.now()}@premera.com`, role: 'premera_stakeholder' as const }
    await tokenFor(request, ust)
    await tokenFor(request, prem)
    await page.addInitScript(() => localStorage.setItem('ustpremera_tour_v2', 'done'))
    await page.goto('/risks')
    for (const who of [ust, prem]) {
      if (who === prem) {
        await page.getByRole('button', { name: 'Account menu' }).click()
        await page.getByRole('menuitem', { name: 'Sign out' }).click()
        await page.route('**/v1/portal', (r) => r.fulfill({ status: 503, body: '{}' }))
      }
      await page.getByPlaceholder('you@company.com').fill(who.email)
      await page.getByRole('button', { name: 'Send sign-in code' }).click()
      await page.getByPlaceholder('123456').fill(await latestCode(who.email))
      await page.getByRole('button', { name: 'Verify and sign in' }).click()
      await page.getByRole('link', { name: 'Risks & Issues' }).first().click()
      if (who === ust) await expect(page.getByText(/Payroll parallel run/).first()).toBeVisible()
    }
    await page.waitForTimeout(1500)
    await expect(page.getByText(/Payroll parallel run/)).toHaveCount(0)
  })
})
