import { test, expect, type Page } from '@playwright/test'
import { USERS, signInAs } from './helpers'

const MANAGE = ['Activity', 'Data Sync', 'Super Admin']

async function managementLinks(page: Page) {
  await page.getByRole('button', { name: 'Account menu' }).click()
  const visible: string[] = []
  for (const label of MANAGE) if (await page.getByRole('menuitem', { name: new RegExp(`^${label}`) }).count()) visible.push(label)
  await page.keyboard.press('Escape')
  return visible
}

test('Premera stakeholder sees only the three main sections', async ({ page, request }) => {
  await signInAs(page, request, USERS.premera)
  for (const label of ['Program Level', 'Feedback to UST', 'Transition Summary Report']) {
    await expect(page.getByRole('link', { name: label }).first()).toBeVisible()
  }
  expect(await managementLinks(page)).toEqual([])
})

test('UST stakeholder also gets Activity and Data Sync, not Super Admin', async ({ page, request }) => {
  await signInAs(page, request, USERS.ust)
  expect(await managementLinks(page)).toEqual(['Activity', 'Data Sync'])
})

test('Super Admin gets every management link', async ({ page, request }) => {
  await signInAs(page, request, USERS.super)
  expect(await managementLinks(page)).toEqual(MANAGE)
})

for (const [path, heading] of [['/admin', /Data Sync|Admin/], ['/activity', /Activity/], ['/superadmin', /Super Admin/]] as const) {
  test(`Premera stakeholder typing ${path} does not reach it`, async ({ page, request }) => {
    await signInAs(page, request, USERS.premera, path)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { level: 1, name: heading })).toHaveCount(0)
  })
}

test('UST stakeholder typing /superadmin does not reach it', async ({ page, request }) => {
  await signInAs(page, request, USERS.ust, '/superadmin')
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('tablist', { name: 'Super Admin sections' })).toHaveCount(0)
})

test('an unknown path goes to Program Level', async ({ page, request }) => {
  await signInAs(page, request, USERS.ust, '/no-such-page')
  await expect(page).toHaveURL(/\/program/)
})
