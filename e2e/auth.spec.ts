import { test, expect } from '@playwright/test'
import { USERS, api, latestCode, signInAs, tokenFor } from './helpers'

test.describe('sign-in', () => {
  test('registered user signs in with the emailed code (email typed with caps and spaces)', async ({ page, request }) => {
    await tokenFor(request, USERS.ust) // make sure the account exists
    await page.goto('/')
    await page.getByPlaceholder('you@company.com').fill(`  ${USERS.ust.email.toUpperCase()} `)
    await page.getByRole('button', { name: 'Send sign-in code' }).click()
    await expect(page.getByText('Check your email')).toBeVisible()
    await page.getByPlaceholder('123456').fill(await latestCode(USERS.ust.email))
    await page.getByRole('button', { name: 'Verify and sign in' }).click()
    await expect(page).toHaveURL(/\/program/)
    await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible()
  })

  test('a wrong code is refused with a message and the user can retry', async ({ page, request }) => {
    const who = { email: 'e2e.wrongcode@ust.com', role: 'ust_stakeholder' as const }
    await tokenFor(request, who)
    await page.goto('/')
    await page.getByPlaceholder('you@company.com').fill(who.email)
    await page.getByRole('button', { name: 'Send sign-in code' }).click()
    const real = await latestCode(who.email)
    await page.getByPlaceholder('123456').fill(real === '000000' ? '111111' : '000000')
    await page.getByRole('button', { name: 'Verify and sign in' }).click()
    await expect(page.getByText(/incorrect|invalid|wrong|expired/i)).toBeVisible()
    await page.getByPlaceholder('123456').fill(real)
    await page.getByRole('button', { name: 'Verify and sign in' }).click()
    await expect(page).toHaveURL(/\/program/)
  })

  test('code field only accepts digits and Verify needs all six', async ({ page, request }) => {
    const who = { email: 'e2e.digits@ust.com', role: 'ust_stakeholder' as const }
    await tokenFor(request, who)
    await page.goto('/')
    await page.getByPlaceholder('you@company.com').fill(who.email)
    await page.getByRole('button', { name: 'Send sign-in code' }).click()
    const input = page.getByPlaceholder('123456')
    await input.fill('12ab3')
    await expect(input).toHaveValue('123')
    await expect(page.getByRole('button', { name: 'Verify and sign in' })).toBeDisabled()
  })

  test('an email outside the allowed domains is refused before any code is sent', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder('you@company.com').fill('someone@gmail.com')
    await page.getByRole('button', { name: 'Send sign-in code' }).click()
    await expect(page.getByText(/Sign-in is limited to/)).toBeVisible()
    await expect(page.getByText('Check your email')).toHaveCount(0)
  })

  test('an unregistered colleague can ask for access and sees it is pending', async ({ page }) => {
    const email = `e2e.new${Date.now()}@premera.com`
    await page.goto('/')
    await page.getByPlaceholder('you@company.com').fill(email)
    await page.getByRole('button', { name: 'Send sign-in code' }).click()
    await page.getByPlaceholder('123456').fill(await latestCode(email))
    await page.getByRole('button', { name: 'Verify and sign in' }).click()
    const message = page.getByPlaceholder('Which team are you on, and what do you need access for?')
    await expect(message).toBeVisible()
    await message.fill('Claims ops lead, need to follow the transition')
    await page.getByRole('button', { name: /request/i }).last().click()
    await expect(page.getByRole('button', { name: 'Back to sign in' })).toBeVisible()
  })

  test('sign out returns to sign-in and clears the session and cached portal copy', async ({ page, request }) => {
    await signInAs(page, request, USERS.ust)
    await page.getByRole('button', { name: 'Account menu' }).click()
    await page.getByRole('menuitem', { name: 'Sign out' }).click()
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible()
    const cached = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('ustpremera_portaldata')))
    expect(cached).toEqual([])
    expect(await page.evaluate(() => sessionStorage.getItem('ustpremera_token'))).toBeNull()
  })

  test('a tampered token lands on sign-in, not a broken page', async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem('ustpremera_token', 'not.a.jwt'))
    await page.goto('/program')
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible()
  })

  test('a user disabled mid-session is sent back to sign-in', async ({ page, request }) => {
    const who = { email: `e2e.disable${Date.now()}@ust.com`, role: 'ust_stakeholder' as const }
    await signInAs(page, request, who)
    await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible()
    const admin = await tokenFor(request, USERS.super)
    const res = await api(request, admin, 'PATCH', `/admin/users/${encodeURIComponent(who.email)}`, { status: 'disabled' })
    expect(res.ok(), await res.text()).toBeTruthy()
    await page.reload()
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible()
  })
})
