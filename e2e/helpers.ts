import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { API, E2E_DIR } from '../playwright.config'

export type Role = 'super_admin' | 'ust_stakeholder' | 'premera_stakeholder'

export const USERS = {
  super: { email: 'e2e.super@ust.com', role: 'super_admin' as Role },
  ust: { email: 'e2e.ust@ust.com', role: 'ust_stakeholder' as Role },
  premera: { email: 'e2e.client@premera.com', role: 'premera_stakeholder' as Role },
}

/** A session token for `email` with `role`, via the API's dev-only login (creates the user). */
export async function tokenFor(request: APIRequestContext, who: { email: string; role: Role }): Promise<string> {
  const res = await request.post(`${API}/auth/dev-login`, { data: { sub: who.email, role: who.role } })
  expect(res.ok(), await res.text()).toBeTruthy()
  return (await res.json()).token as string
}

/** Opens `url` already signed in as `who`, the way a returning user's tab would be. */
export async function signInAs(page: Page, request: APIRequestContext, who: { email: string; role: Role }, url = '/program') {
  const token = await tokenFor(request, who)
  await page.addInitScript((t) => {
    sessionStorage.setItem('ustpremera_token', t)
    // Skip the first-run tour in every spec except the tour spec, which clears this.
    localStorage.setItem('ustpremera_tour_v2', 'done')
  }, token)
  await page.goto(url)
  return token
}

export async function api(request: APIRequestContext, token: string, method: string, p: string, data?: unknown) {
  return request.fetch(`${API}${p}`, { method, data, headers: { Authorization: `Bearer ${token}` } })
}

/** The newest sign-in code the console mailer printed for `email`. */
export async function latestCode(email: string): Promise<string> {
  const file = path.join(E2E_DIR, 'api.log')
  for (let i = 0; i < 50; i++) {
    const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
    const blocks = text.split('--- [mail:console]').filter((b) => b.includes(`to=${email}`))
    const match = blocks.at(-1)?.match(/\b(\d{6})\b/)
    if (match) return match[1]
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error(`no sign-in code logged for ${email}`)
}

const DEMO = JSON.parse(
  fs.readFileSync(path.join(E2E_DIR, '..', '..', '..', 'premera-engagement-api', 'src', 'import', '__fixtures__', 'demoSeed.json'), 'utf8'),
)

/** Replaces the portal document (default: the API's demo dataset — the fresh-database seed is an empty template). */
export async function loadPortal(request: APIRequestContext, data: unknown = DEMO) {
  const token = await tokenFor(request, USERS.super)
  const res = await api(request, token, 'PUT', '/portal', data)
  expect(res.ok(), await res.text()).toBeTruthy()
  return res.json()
}

export const demoData = () => structuredClone(DEMO)

/**
 * A row of an AG Grid (components/DataGrid.tsx), found by its text. Returns every part of the row:
 * pinned columns (e.g. the Edit column) render in their own container with the same row-index.
 */
export async function gridRow(scope: Page | Locator, text: string | RegExp): Promise<Locator> {
  const part = scope.locator('.ag-row', { hasText: text }).first()
  await part.waitFor()
  const index = await part.getAttribute('row-index')
  const grid = part.locator('xpath=ancestor::div[contains(@class,"ag-root-wrapper")][1]')
  return grid.locator(`.ag-row[row-index="${index}"]`)
}
