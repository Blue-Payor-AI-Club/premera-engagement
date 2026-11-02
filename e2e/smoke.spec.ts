import { test, expect } from '@playwright/test'
import { USERS, signInAs } from './helpers'

test('stack starts and a UST user lands on Program Level', async ({ page, request }) => {
  await signInAs(page, request, USERS.ust)
  await expect(page.getByRole('heading').first()).toBeVisible()
  await expect(page).toHaveURL(/\/program/)
})
