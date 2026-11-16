// Client demo walkthrough, ready to screen-record: a real browser, a presenter's pace, a caption
// bar and a visible cursor. It signs in by itself with the two demo accounts (no code needed):
//
//   1. Web   — vp@premera.com        (Premera VP: several operational areas)
//   2. Web   — director@premera.com  (Premera Director: one operational area)
//   3. Phone — the VP, then the Director (a phone-sized window, the same layout as the mobile app)
//
//   npm run demo                         # against the live portal (http://10.100.242.71:8082)
//   DEMO_URL=http://localhost:5173 npm run demo
//   DEMO_ONLY=web | phone npm run demo   # just one half
//   DEMO_SEND=1 npm run demo             # also sends the sample reply / thumbs-up (writes data)
//   DEMO_SPEED=0.6 npm run demo          # faster (1 = default pace, 2 = twice as slow)
//
// By default nothing is written: the reply is typed but not sent, thumbs are only pointed at.
// The demo accounts and their tabs live on the server (Super Admin > Tab access).

import { pathToFileURL } from 'node:url'
import { chromium, devices } from '@playwright/test'

const BASE = (process.env.DEMO_URL ?? 'http://10.100.242.71:8082').replace(/\/$/, '')
const SEND = process.env.DEMO_SEND === '1'
const ONLY = process.env.DEMO_ONLY ?? ''
const SPEED = Number(process.env.DEMO_SPEED ?? 1) || 1
const pause = (ms) => new Promise((r) => setTimeout(r, ms * SPEED))

export const VP = { email: 'vp@premera.com', title: 'Premera VP' }
export const DIRECTOR = { email: 'director@premera.com', title: 'Premera Director' }

// ─── presenter helpers ───────────────────────────────────────────────────────

/** A caption bar and a cursor dot that follows the mouse (re-added on every page load). */
const OVERLAY = () => {
  const add = () => {
    if (document.getElementById('demo-caption')) return
    const phone = innerWidth < 640
    const cap = document.createElement('div')
    cap.id = 'demo-caption'
    Object.assign(cap.style, {
      position: 'fixed', left: '50%', transform: 'translateX(-50%)', zIndex: 2147483647,
      // Phones: above the bottom tab bar, smaller type.
      bottom: phone ? '84px' : '24px', width: phone ? '92vw' : 'auto', maxWidth: phone ? '92vw' : '80vw',
      padding: phone ? '10px 14px' : '12px 22px', borderRadius: '12px', background: 'rgba(11,58,83,.94)', color: '#fff',
      font: `600 ${phone ? 14 : 18}px/1.35 system-ui, sans-serif`, boxShadow: '0 8px 30px rgba(0,0,0,.3)', textAlign: 'center',
      transition: 'opacity .3s', opacity: '0', pointerEvents: 'none',
    })
    const dot = document.createElement('div')
    dot.id = 'demo-cursor'
    Object.assign(dot.style, {
      position: 'fixed', width: '22px', height: '22px', margin: '-11px 0 0 -11px', borderRadius: '50%', zIndex: 2147483647,
      background: 'rgba(14,165,233,.35)', border: '2px solid #0ea5e9', pointerEvents: 'none', left: '-50px', top: '-50px',
      transition: 'left .05s linear, top .05s linear, transform .15s',
    })
    document.body.append(cap, dot)
    const move = (x, y) => { dot.style.left = `${x}px`; dot.style.top = `${y}px` }
    addEventListener('mousemove', (e) => move(e.clientX, e.clientY), true)
    addEventListener('touchstart', (e) => { const t = e.touches[0]; if (t) move(t.clientX, t.clientY); dot.style.transform = 'scale(.7)' }, true)
    addEventListener('touchend', () => { dot.style.transform = '' }, true)
    addEventListener('mousedown', () => { dot.style.transform = 'scale(.7)' }, true)
    addEventListener('mouseup', () => { dot.style.transform = '' }, true)
  }
  if (document.body) add()
  else addEventListener('DOMContentLoaded', add)
}

async function caption(page, text, hold = 2600) {
  if (text && process.env.DEMO_LOG) console.log('  ▸', text)
  await page.evaluate((t) => {
    const c = document.getElementById('demo-caption')
    if (!c) return
    c.textContent = t
    c.style.opacity = t ? '1' : '0'
  }, text).catch(() => {})
  if (text) await pause(hold)
}

/** Scroll into view, glide the cursor over, outline it for a moment; optionally click (tap on phones). */
async function point(page, locator, { click = false, hold = 900 } = {}) {
  const el = locator.first()
  await el.scrollIntoViewIfNeeded()
  await pause(300)
  const box = await el.boundingBox()
  if (!box) return
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 25 })
  await el.evaluate((n) => {
    const prev = n.style.outline
    n.style.outline = '3px solid #f59e0b'
    n.style.outlineOffset = '2px'
    setTimeout(() => { n.style.outline = prev }, 1400)
  }).catch(() => {})
  await pause(hold)
  if (click) await el.click()
}

/** Smooth scroll (works on phones too, where there is no mouse wheel). */
async function scrollBy(page, dy, wait = 900) {
  await page.evaluate((y) => scrollBy({ top: y, behavior: 'smooth' }), dy)
  await pause(wait)
}
const toTop = (page) => page.evaluate(() => scrollTo({ top: 0, behavior: 'smooth' }))

const visible = async (locator, timeout = 4000) => locator.first().waitFor({ state: 'visible', timeout }).then(() => true, () => false)

// ─── sign in / out ───────────────────────────────────────────────────────────

async function signIn(page, who) {
  await page.goto(`${BASE}/program`)
  const email = page.getByPlaceholder('you@company.com')
  await email.waitFor({ timeout: 60_000 })
  await caption(page, `Signing in as the ${who.title} — demo accounts need no sign-in code`, 1800)
  await point(page, email, { click: true, hold: 300 })
  await email.pressSequentially(who.email, { delay: 55 * SPEED })
  await pause(500)
  await point(page, page.getByRole('button', { name: 'Send sign-in code' }), { click: true, hold: 400 })
  await page.getByRole('heading', { level: 1, name: 'Transition Status Dashboard' }).waitFor({ timeout: 60_000 })
  await caption(page, '', 0)
  await pause(1200)
}

async function signOut(page) {
  await toTop(page)
  await point(page, page.getByRole('button', { name: 'Account menu' }), { click: true, hold: 400 })
  await pause(500)
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await page.getByPlaceholder('you@company.com').waitFor()
  await pause(800)
}

// ─── the walkthrough ─────────────────────────────────────────────────────────

/** Program Level: header, KPIs, RAID badges, the user's tabs, then one tab in depth. */
async function programLevel(page, who, { full }) {
  const phone = (page.viewportSize()?.width ?? 1280) < 640
  await toTop(page)
  if (full) await caption(page, 'Transition Status Portal — the transition program status, shared by UST and Premera', 3200)
  await caption(page, 'The status key sits right under the As-Of date, so every colour reads the same way')
  await point(page, page.getByRole('group', { name: 'Status key' }), { hold: 1300 })
  await caption(page, "KPI cards: the selected area's phases and milestones, counted by status")
  await point(page, page.getByRole('group', { name: 'Status counts' }), { hold: 1300 })
  await caption(page, '# of RAID is every RAID item in the area; Premera Attention required counts the ones Premera needs to act on')
  await point(page, page.getByText(/# of RAID:/), { hold: 900 })
  await point(page, page.getByText(/Premera Attention required:/), { hold: 1200 })

  const tabs = page.getByRole('tab')
  const names = await tabs.allTextContents()
  await caption(page, names.length > 1
    ? `The ${who.title} sees only the operational areas they lead: ${names.length} here`
    : `The ${who.title} sees only the one operational area they lead`, 3000)
  await point(page, page.getByRole('tablist', { name: 'Operational area' }), { hold: 1200 })
  for (const name of names.slice(1, full ? 3 : 1)) {
    await point(page, tabs.filter({ hasText: name }), { click: true, hold: 400 })
    await pause(1600)
  }
  if (names.length > 1) {
    await point(page, tabs.first(), { click: true, hold: 300 })
    await pause(1000)
  }

  const card = page.getByRole('region', { name: /^Transition Program Summary - / })
  if (await visible(card)) {
    await caption(page, "The area's title card: overall status as a coloured badge, and the status summary")
    await point(page, card, { hold: 1500 })
  }

  const dashboard = page.getByRole('region', { name: 'Transition Program Dashboard' })
  if (await visible(dashboard)) {
    await caption(page, 'Its dashboard: each phase with its status, dates and milestones')
    await point(page, dashboard, { hold: 1000 })
    if (phone) {
      // Phone cards: open the first phase's milestones in place.
      const more = dashboard.locator('summary').first()
      if (await visible(more, 1500)) {
        await point(page, more, { click: true, hold: 500 })
        await pause(2200)
      }
    } else {
      const phase = dashboard.locator('.ag-row').filter({ hasText: 'Transition / KT' })
      if (await visible(phase, 2000)) {
        await caption(page, 'Click a phase for its details and milestones')
        await point(page, phase.getByText('Transition / KT').first(), { click: true })
        await pause(2800)
        await page.keyboard.press('Escape')
        await pause(600)
      }
    }
  }

  const raid = page.locator('#tab-raid')
  if (await visible(raid)) {
    await caption(page, "Then the area's RAID log — items needing Premera's action are tagged in red")
    await point(page, raid, { hold: 1200 })
    const tag = raid.getByText('Action required')
    if (await visible(tag, 1500)) await point(page, tag, { hold: 1200 })
    if (full) await raidFeedback(page, raid)
  }
}

/** Thumbs and the reply thread on the first RAID item in `scope`. */
async function raidFeedback(page, scope) {
  const up = scope.locator('[title="Good"]')
  if (await visible(up)) {
    await caption(page, 'Every row takes a quick thumbs up or down — a thumbs-down asks what the concern is')
    await point(page, up, { click: SEND, hold: 1200 })
    if (SEND) { await pause(1200); await up.first().click(); await pause(600) } // leave no vote behind
  }
  const reply = scope.getByRole('button', { name: /^Replies on / })
  if (!(await visible(reply))) return
  await caption(page, 'And every RAID item has a reply thread: Premera and UST discuss it right where it sits')
  await point(page, reply, { click: true })
  const dialog = page.getByRole('dialog')
  await dialog.waitFor({ state: 'visible' })
  await pause(1200)
  const box = dialog.getByLabel('Your reply')
  await point(page, box, { click: true, hold: 300 })
  await box.pressSequentially('Thanks — can UST confirm the revised date by Friday?', { delay: 45 * SPEED })
  await pause(900)
  if (SEND) {
    await point(page, dialog.getByRole('button', { name: 'Send reply' }), { click: true })
    await caption(page, 'Sent: it shows in the thread, and UST is notified by email', 2400)
  } else {
    await caption(page, 'Send reply posts it to the thread and notifies UST by email', 2400)
  }
  await page.keyboard.press('Escape')
  await pause(600)
}

async function report(page, { full }) {
  await toTop(page)
  await caption(page, 'The Transition Summary Report: the program-wide view, in the familiar slide format')
  await point(page, page.getByRole('link', { name: 'Transition Summary Report' }).filter({ visible: true }), { click: true })
  await page.getByRole('heading', { level: 1, name: 'Transition Summary Report' }).waitFor()
  await pause(1200)
  const toggle = page.getByRole('button', { name: /Transition Program Executive Summary/ })
  if (await visible(toggle)) {
    await caption(page, 'The Executive Summary: overall status, accomplishments, priorities, key risks and where executive focus is needed', 3200)
    await point(page, toggle, { hold: 600 })
    await scrollBy(page, 650, 1600)
  }
  if (!full) return
  const dash = page.getByRole('region', { name: 'Transition Program Dashboard' })
  if (await visible(dash)) {
    await caption(page, 'The program dashboard in its original format, limited to the areas this user leads')
    await point(page, dash.getByText('Discovery / Planning / Onboarding'), { hold: 1500 })
    await scrollBy(page, 450, 1200)
  }
  const raid = page.getByRole('region', { name: 'RAID log' }).last()
  if (await visible(raid)) {
    await caption(page, 'And the program-wide RAID items, with the same thumbs and reply thread')
    await point(page, raid, { hold: 1500 })
  }
}

async function feedback(page) {
  await toTop(page)
  await caption(page, 'Feedback to UST: a direct line for anything else')
  await point(page, page.getByRole('link', { name: 'Feedback to UST' }).filter({ visible: true }), { click: true })
  await pause(1500)
  const stars = page.getByLabel('4 stars')
  if (await visible(stars)) {
    await caption(page, 'Rate the engagement, pick the area and priority, and describe it — UST is notified straight away')
    await point(page, stars, { click: true, hold: 500 })
    const subject = page.getByPlaceholder('Brief summary of your feedback')
    await point(page, subject, { click: true, hold: 300 })
    await subject.pressSequentially('Weekly status cadence is working well', { delay: 40 * SPEED })
    await pause(1500)
    await subject.fill('') // nothing is submitted in the demo
  }
}

/** Phones: the same content, laid out like the mobile app (bottom tab bar, stacked cards). */
async function phoneTour(page, who, { full }) {
  await caption(page, `On a phone, the ${who.title} gets the same portal, laid out like the mobile app`, 2800)
  await programLevel(page, who, { full: false })
  await scrollBy(page, 500, 1200)
  if (full) {
    await caption(page, 'Sections sit in a bottom tab bar, as in the app')
    const bar = page.getByRole('navigation', { name: 'Sections' })
    await point(page, bar, { hold: 1000 })
    await point(page, bar.getByRole('link', { name: 'Transition Summary Report' }), { click: true })
    await page.getByRole('heading', { level: 1, name: 'Transition Summary Report' }).waitFor()
    await pause(1200)
    await scrollBy(page, 600, 1500)
    await point(page, bar.getByRole('link', { name: 'Feedback to UST' }), { click: true })
    await pause(1800)
    await point(page, bar.getByRole('link', { name: 'Program Level' }), { click: true })
    await pause(1200)
  }
}

// ─── runners ─────────────────────────────────────────────────────────────────

/** Caption bar + cursor on every page; no onboarding tour. */
export async function prepare(context) {
  await context.addInitScript(OVERLAY)
  await context.addInitScript(() => { try { localStorage.setItem('ustpremera_tour_v3', 'done') } catch { /* private mode */ } })
}

/** Web: the VP in depth, then the Director, in one window. */
export async function runWeb(page) {
  await signIn(page, VP)
  await programLevel(page, VP, { full: true })
  await report(page, { full: true })
  await feedback(page)
  await signOut(page)

  await signIn(page, DIRECTOR)
  await programLevel(page, DIRECTOR, { full: false })
  await report(page, { full: false })
  await signOut(page)
}

/** Phone: the VP, then the Director. */
export async function runPhone(page) {
  await signIn(page, VP)
  await phoneTour(page, VP, { full: true })
  await signOut(page)
  await signIn(page, DIRECTOR)
  await phoneTour(page, DIRECTOR, { full: false })
  await toTop(page)
  await caption(page, 'Transition Status Portal — live status, shared decisions, one source of truth', 4000)
  await caption(page, '', 0)
}

async function main() {
  const browser = await chromium.launch({ headless: process.env.DEMO_HEADLESS === '1', args: ['--start-maximized'] })

  if (ONLY !== 'phone') {
    const context = await browser.newContext({ viewport: null })
    await prepare(context)
    const page = await context.newPage()
    await runWeb(page)
    await context.close()
  }

  if (ONLY !== 'web') {
    // A phone-sized window (iPhone 14), touch and all.
    const context = await browser.newContext({ ...devices['iPhone 14'] })
    await prepare(context)
    const page = await context.newPage()
    await runPhone(page)
    console.log('Demo finished. Close the browser window when you have stopped recording.')
    await page.waitForEvent('close', { timeout: 0 }).catch(() => {})
  }
  await browser.close()
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
