import { test, expect } from '@playwright/test'
import { USERS, api, signInAs, tokenFor } from './helpers'

test.describe('Super Admin', () => {
  test('every tab opens without an error', async ({ page, request }) => {
    await signInAs(page, request, USERS.super, '/superadmin')
    for (const tab of ['Users', 'Access requests', 'Invitations', 'Email notifications', 'Sign-in', 'Email log']) {
      await page.getByRole('tab', { name: new RegExp(`^${tab}`) }).click()
      await expect(page.getByText(/something went wrong|failed to load|error/i)).toHaveCount(0)
    }
  })

  test('your own row cannot be demoted, disabled or removed', async ({ page, request }) => {
    await signInAs(page, request, USERS.super, '/superadmin')
    await page.getByRole('tab', { name: /^Users/ }).click()
    await expect(page.getByLabel(`Role for ${USERS.super.email}`)).toBeDisabled()
    await expect(page.getByLabel(`Remove ${USERS.super.email}`)).toBeDisabled()
  })

  test("changing another user's role takes effect", async ({ page, request }) => {
    const who = { email: `e2e.promote${Date.now()}@ust.com`, role: 'premera_stakeholder' as const }
    await tokenFor(request, who)
    await signInAs(page, request, USERS.super, '/superadmin')
    await page.getByRole('tab', { name: /^Users/ }).click()
    page.once('dialog', (d) => d.accept())
    await page.getByLabel(`Role for ${who.email}`).selectOption('ust_stakeholder')
    const admin = await tokenFor(request, USERS.super)
    await expect.poll(async () => {
      const users = await (await api(request, admin, 'GET', '/admin/users')).json()
      return (users.users ?? users).find((u: { email: string }) => u.email === who.email)?.role
    }).toBe('ust_stakeholder')
  })

  test('sign-in domains: bad entries and removing your own domain are refused; a valid list saves', async ({ page, request }) => {
    await signInAs(page, request, USERS.super, '/superadmin')
    await page.getByRole('tab', { name: /^Sign-in/ }).click()
    const box = page.getByLabel('Allowed email domains')
    await box.fill('ust.com\nhttps://bad')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText(/isn't a valid domain/)).toBeVisible()
    await box.fill('premera.com')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText(/your own|lock|ust\.com/i).first()).toBeVisible()
    await box.fill('@UST.com\nust.com\npremera.com\nexample.org')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Saved')).toBeVisible()
    const admin = await tokenFor(request, USERS.super)
    const saved = await (await api(request, admin, 'GET', '/admin/auth-settings')).json()
    expect(saved.domains).toEqual(['ust.com', 'premera.com', 'example.org'])
    await api(request, admin, 'PUT', '/admin/auth-settings', { domains: ['ust.com', 'premera.com'] })
  })

  test('an invitation can be sent and then revoked', async ({ page, request }) => {
    const email = `e2e.invite${Date.now()}@premera.com`
    await signInAs(page, request, USERS.super, '/superadmin')
    await page.getByRole('tab', { name: /^Invitations/ }).click()
    await page.getByPlaceholder('name@company.com').fill(email)
    await page.getByRole('button', { name: 'Send invite' }).click()
    const row = page.locator('tr', { hasText: email })
    await expect(row).toBeVisible()
    page.once('dialog', (d) => d.accept())
    await row.getByRole('button', { name: /Revoke/ }).click()
    await expect(row.getByText(/revoked/i)).toBeVisible()
  })

  test('an invitation to a domain that is not allowed is refused with a message', async ({ page, request }) => {
    await signInAs(page, request, USERS.super, '/superadmin')
    await page.getByRole('tab', { name: /^Invitations/ }).click()
    await page.getByPlaceholder('name@company.com').fill('someone@gmail.com')
    await page.getByRole('button', { name: 'Send invite' }).click()
    await expect(page.getByText(/Sign-in is limited to/)).toBeVisible()
  })
})

test.describe('Activity', () => {
  test('shows recent actions to UST users', async ({ page, request }) => {
    const admin = await tokenFor(request, USERS.super)
    await api(request, admin, 'PUT', '/quick-feedback/ws1', { vote: 'up' })
    await signInAs(page, request, USERS.ust, '/activity')
    await expect(page.getByRole('heading', { name: 'Activity' })).toBeVisible()
    await expect(page.getByText(USERS.super.email).first()).toBeVisible()
  })
})
