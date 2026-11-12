import { test, expect } from '@playwright/test'
import { SHARED_RAID, UST_RAID, USERS, api, demoData, loadPortal, signInAs } from './helpers'

// e2e flags (helpers.loadPortal): Service Desk and ITOC's phases and one of its RAID items.
test.beforeAll(async ({ request }) => {
  await loadPortal(request, demoData())
})

test.describe('Premera Attention controls what Premera users see', () => {
  test('UST users see every row with Visible to Premera / UST only tags and the notice', async ({ page, request }) => {
    await signInAs(page, request, USERS.ust, '/program')
    await expect(page.getByRole('note')).toContainText('Premera stakeholders only see rows marked')
    await expect(page.getByText('Visible to Premera').first()).toBeVisible()
    await expect(page.getByText('UST only').first()).toBeVisible()
    await expect(page.getByText(UST_RAID).first()).toBeVisible()
  })

  test('Premera users see only flagged rows, and no tags or notice', async ({ page, request }) => {
    await signInAs(page, request, USERS.premera, '/program')
    await expect(page.getByText(SHARED_RAID).first()).toBeVisible()
    await expect(page.getByText(UST_RAID)).toHaveCount(0)
    await expect(page.getByText('UST only')).toHaveCount(0)
    await expect(page.getByText('Visible to Premera')).toHaveCount(0)
    await expect(page.getByRole('note')).toHaveCount(0)
  })

  test('Premera never receives hidden rows from the API, even if the UI were bypassed', async ({ request }) => {
    const { tokenFor } = await import('./helpers')
    const token = await tokenFor(request, USERS.premera)
    const body = await (await api(request, token, 'GET', '/portal')).json()
    expect(body.transition.dashboard.map((w: { workstream: string }) => w.workstream)).toEqual(['Service Desk and ITOC'])
    expect(body.transition.raid.map((r: { description: string }) => r.description)).toEqual([expect.stringMatching(SHARED_RAID)])
  })

  test('Premera sees only the shared operational area; the others say nothing is shared', async ({ page, request }) => {
    await signInAs(page, request, USERS.premera)
    await expect(page.getByText('Service desk KT is on plan.')).toBeVisible()
    await page.getByRole('tab', { name: 'Provider Contact Center' }).click()
    await expect(page.getByText('Nothing shared for Provider Contact Center yet.')).toBeVisible()
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
        await page.addInitScript(() => localStorage.setItem('ustpremera_tour_v3', 'done'))
        await page.goto('/program')
      }
      await page.getByPlaceholder('you@company.com').fill(who.email)
      await page.getByRole('button', { name: 'Send sign-in code' }).click()
      await page.getByPlaceholder('123456').fill(await latestCode(who.email))
      await page.getByRole('button', { name: 'Verify and sign in' }).click()
      await page.getByRole('link', { name: 'Program Level' }).first().click()
      if (who === USERS.ust) await expect(page.getByText(UST_RAID).first()).toBeVisible()
    }
    // Slow the Premera fetch down: until it lands, nothing of the UST copy may be on screen.
    await expect(page.getByText(UST_RAID)).toHaveCount(0)
    await expect(page.getByText(SHARED_RAID).first()).toBeVisible()
  })

  test('if the Premera fetch fails right after a UST user signed out, UST rows are not shown', async ({ page, request }) => {
    const { latestCode, tokenFor } = await import('./helpers')
    const ust = { email: `e2e.ust.f${Date.now()}@ust.com`, role: 'ust_stakeholder' as const }
    const prem = { email: `e2e.prem.f${Date.now()}@premera.com`, role: 'premera_stakeholder' as const }
    await tokenFor(request, ust)
    await tokenFor(request, prem)
    await page.addInitScript(() => localStorage.setItem('ustpremera_tour_v3', 'done'))
    await page.goto('/program')
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
      await page.getByRole('link', { name: 'Program Level' }).first().click()
      if (who === ust) await expect(page.getByText(UST_RAID).first()).toBeVisible()
    }
    await page.waitForTimeout(1500)
    await expect(page.getByText(UST_RAID)).toHaveCount(0)
  })
})

test.describe('Premera Executives / Leads (Super Admin > Tab access)', () => {
  test('a tab Executive gets only their tabs, and the API sends only those tabs\' content', async ({ page, request }) => {
    // Default assignments: Todd Manning is Executive for Service Desk and ITOC and Provider Contact Center.
    const token = await signInAs(page, request, { email: 'todd.manning@premera.com', role: 'premera_stakeholder' })
    await expect(page.getByRole('tab')).toHaveText(['Service Desk and ITOC', 'Provider Contact Center'])
    await expect(page.getByText('Service desk KT is on plan.')).toBeVisible()
    const body = await (await api(request, token, 'GET', '/portal')).json()
    expect(body.transition.dashboard.map((w: { workstream: string }) => w.workstream)).toEqual(['Service Desk and ITOC'])
  })
})
