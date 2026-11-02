import { test, expect } from '@playwright/test'
import { API } from '../playwright.config'
import { USERS, api, latestCode, tokenFor } from './helpers'

// API-level checks for behaviour the browser tests can't reach. Each one states the expected
// production behaviour; a failure here is a finding, not a flaky test.

test('trusted login: an allowlisted address gets a Super Admin session without any code', async ({ request }) => {
  const res = await request.post(`${API}/auth/trusted-login`, { data: { email: 'e2e.trusted@ust.com' } })
  const body = await res.json()
  // Documents the current design: anyone who types an allowlisted address is in, as Super Admin.
  expect.soft(res.status(), 'trusted login should not grant a session without proof of the address').not.toBe(200)
  expect.soft(body.user?.role).not.toBe('super_admin')
})

test('trusted login: a disabled trusted account stays disabled', async ({ request }) => {
  const admin = await tokenFor(request, USERS.super)
  await request.post(`${API}/auth/trusted-login`, { data: { email: 'e2e.trusted@ust.com' } })
  await api(request, admin, 'PATCH', `/admin/users/${encodeURIComponent('e2e.trusted@ust.com')}`, { status: 'disabled' })
  const again = await request.post(`${API}/auth/trusted-login`, { data: { email: 'e2e.trusted@ust.com' } })
  expect(again.status(), 'disabling a trusted account should block its sign-in').not.toBe(200)
})

test('OTP: burning a code with wrong guesses must not reset the resend cooldown', async ({ request }) => {
  const email = `e2e.burn${Date.now()}@ust.com`
  await tokenFor(request, { email, role: 'ust_stakeholder' })
  expect((await request.post(`${API}/auth/request-code`, { data: { email } })).ok()).toBeTruthy()
  const real = await latestCode(email)
  for (let i = 0; i < 6; i++) await request.post(`${API}/auth/verify-code`, { data: { email, code: real === '000000' ? '111111' : '000000' } })
  const resend = await request.post(`${API}/auth/request-code`, { data: { email } })
  expect(resend.status(), 'a new code within the 60 s cooldown should be refused').toBe(429)
})

test('feedback list: a bad cursor is a 4xx, not a server error', async ({ request }) => {
  const t = await tokenFor(request, USERS.premera)
  const res = await api(request, t, 'GET', '/feedback?cursor=abc')
  expect(res.status()).toBeLessThan(500)
})

test('admin: an email with a % in the path is a 4xx, not a server error', async ({ request }) => {
  const t = await tokenFor(request, USERS.super)
  const res = await api(request, t, 'PATCH', '/admin/users/100%25@ust.com', { role: 'ust_stakeholder' })
  expect(res.status()).toBeLessThan(500)
})

test('quick feedback: votes on items that do not exist are refused', async ({ request }) => {
  const t = await tokenFor(request, USERS.premera)
  const res = await api(request, t, 'PUT', '/quick-feedback/no-such-item-xyz', { vote: 'down', comment: 'x'.repeat(50_000) })
  expect(res.status(), 'unknown item ids (and 50 KB comments) should be rejected').toBeGreaterThanOrEqual(400)
})

test('feedback: very long subject/details are capped', async ({ request }) => {
  const t = await tokenFor(request, USERS.premera)
  const areas = await (await api(request, t, 'GET', '/feedback/areas')).json()
  const res = await api(request, t, 'POST', '/feedback', { rating: 3, area: areas[0], priority: 'Low', subject: 's'.repeat(100_000), details: 'd' })
  expect(res.status(), 'a 100 KB subject should be rejected').toBe(422)
})

test('errors keep the standard shape with a request id', async ({ request }) => {
  const res = await request.get(`${API}/no-such-route`)
  const body = await res.json()
  expect(res.status()).toBe(404)
  expect(body.error).toMatchObject({ code: 'NOT_FOUND' })
  expect(body.error.requestId).toBeTruthy()
})

test('security headers are set on API responses', async ({ request }) => {
  const res = await request.get(`${API.replace('/v1', '')}/health`)
  const h = res.headers()
  expect.soft(h['x-content-type-options'], 'X-Content-Type-Options').toBe('nosniff')
  expect.soft(h['x-frame-options'] ?? h['content-security-policy'], 'framing protection').toBeTruthy()
})
