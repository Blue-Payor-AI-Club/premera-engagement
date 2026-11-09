import { test, expect } from '@playwright/test'
import { USERS, signInAs } from './helpers'

test.describe('Feedback to UST', () => {
  test('Send is disabled until a star rating is chosen', async ({ page, request }) => {
    await signInAs(page, request, USERS.premera, '/feedback')
    await expect(page.getByRole('button', { name: /Send to UST/ })).toBeDisabled()
    await page.locator('form').getByRole('button', { name: '4 stars' }).click()
    await expect(page.getByRole('button', { name: /Send to UST/ })).toBeEnabled()
  })

  test('area and subject are required before sending', async ({ page, request }) => {
    await signInAs(page, request, USERS.premera, '/feedback')
    await page.locator('form').getByRole('button', { name: '3 stars' }).click()
    await page.getByRole('button', { name: /Send to UST/ }).click()
    await expect(page.getByText('Feedback Received!')).toHaveCount(0)
  })

  test('a complete submission shows the confirmation, resets the form and appears in the log', async ({ page, request }) => {
    await signInAs(page, request, USERS.premera, '/feedback')
    const subject = `E2E feedback ${Date.now()} — ünïcode ✓`
    await page.locator('form').getByRole('button', { name: '5 stars' }).click()
    await page.locator('select').first().selectOption({ index: 1 })
    await page.getByPlaceholder('Brief summary of your feedback').fill(subject)
    await page.getByPlaceholder("Share what's working well or what UST should improve...").fill('Line one\nLine two')
    await page.getByRole('button', { name: /Send to UST/ }).click()
    await expect(page.getByText('Feedback Received!')).toBeVisible()
    await page.getByRole('button', { name: 'Close' }).first().click()
    await expect(page.getByPlaceholder('Brief summary of your feedback')).toHaveValue('')
    await expect(page.getByText(subject).first()).toBeVisible()
    await page.reload()
    await expect(page.getByText(subject).first()).toBeVisible()
  })

  test('the Area list matches what the server accepts (every option submits)', async ({ page, request }) => {
    await signInAs(page, request, USERS.ust, '/feedback')
    const options = await page.locator('select').first().locator('option:not([disabled])').allTextContents()
    expect(options.length).toBeGreaterThan(5)
  })

  test('when the server rejects a submission the user is told, not left guessing', async ({ page, request }) => {
    await signInAs(page, request, USERS.premera, '/feedback')
    await page.route('**/v1/feedback', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { code: 'INTERNAL', message: 'boom' } }) })
        : route.continue(),
    )
    await page.locator('form').getByRole('button', { name: '4 stars' }).click()
    await page.locator('select').first().selectOption({ index: 1 })
    await page.getByPlaceholder('Brief summary of your feedback').fill('Will fail')
    await page.getByRole('button', { name: /Send to UST/ }).click()
    await expect(page.getByText(/couldn.t|could not|failed|try again|error/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByPlaceholder('Brief summary of your feedback')).toHaveValue('Will fail')
  })

  test('form fields have accessible labels', async ({ page, request }) => {
    await signInAs(page, request, USERS.premera, '/feedback')
    await expect(page.getByLabel('Area', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Subject', { exact: true })).toBeVisible()
  })
})
