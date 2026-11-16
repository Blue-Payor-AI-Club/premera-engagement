// Client demo walkthrough, ready to screen-record: a real browser, a presenter's pace, a caption
// bar and a visible cursor. It signs in by itself with the two demo accounts (no code needed):
// vp@premera.com (Premera VP: several operational areas) and director@premera.com (one area).
//
//   npm run demo              # web: the header sections first, then each page in detail (VP, then Director)
//                               starts 10 s after the browser opens
//   npm run demo:phone        # phone: the same portal, laid out like the mobile app (VP, then Director)
//                               opens with DevTools and waits 15 s: turn on the device toolbar
//                               (Ctrl+Shift+M) and pick the device, then it starts
//
//   DEMO_DEVICE="iPhone 16 Pro"   demo:phone without DevTools: Playwright emulates this device instead
//   DEMO_START_WAIT=20             a different start pause, in seconds
//   DEMO_URL=http://localhost:5173   another server (default: the live portal)
//   DEMO_SPEED=1.5                   slower (1 = default pace, 0.7 = faster)
//   DEMO_SEND=1                      also sends the sample reply / thumbs-up (writes data)
//   (PowerShell: $env:DEMO_SPEED='1.5'; npm run demo)
//
// By default nothing is written: the reply is typed but not sent, thumbs are only pointed at.
// The demo accounts and their tabs live on the server (Super Admin > Tab access).

import { pathToFileURL } from 'node:url'
import { chromium, devices } from '@playwright/test'

const BASE = (process.env.DEMO_URL ?? 'http://10.100.242.71:8082').replace(/\/$/, '')
const SEND = process.env.DEMO_SEND === '1'
const PHONE = process.argv.includes('--phone')
// Unset: you choose the device yourself in DevTools during the start pause. Set: Playwright emulates it.
const DEVICE = process.env.DEMO_DEVICE ?? ''
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

// ─── web walkthrough ─────────────────────────────────────────────────────────

/** The header first: the portal's sections and the account menu, before any page detail. */
async function headerTour(page, who) {
  await toTop(page)
  await caption(page, 'Transition Status Portal — the transition program status, shared by UST and Premera', 3200)
  const brand = page.getByText('Transition Status Portal', { exact: true })
  if (await visible(brand, 1000)) await point(page, brand, { hold: 1000 }) // the name hides on narrow windows
  await caption(page, 'The header holds the three sections of the portal', 2400)
  await point(page, page.getByRole('link', { name: 'Program Level' }).filter({ visible: true }), { hold: 600 })
  await caption(page, 'Program Level — the status of each operational area, one tab per area', 2600)
  await point(page, page.getByRole('link', { name: 'Feedback to UST' }).filter({ visible: true }), { hold: 600 })
  await caption(page, 'Feedback to UST — a direct line to the UST team, with every submission tracked', 2600)
  await point(page, page.getByRole('link', { name: 'Transition Summary Report' }).filter({ visible: true }), { hold: 600 })
  await caption(page, 'Transition Summary Report — the program-wide view, in the familiar slide format', 2600)
  await caption(page, `On the right, the account menu: signed in as the ${who.title}, a Premera Stakeholder`, 1200)
  await point(page, page.getByRole('button', { name: 'Account menu' }), { click: true, hold: 500 })
  await pause(2200)
  await page.keyboard.press('Escape')
  await pause(500)
}

/** Program Level in detail: page header, the user's operational areas, then one area top to bottom. */
async function programLevel(page, who, { full }) {
  await toTop(page)
  await caption(page, 'Program Level: the As-Of date and the status key sit at the top, so every colour reads the same way')
  await point(page, page.getByRole('group', { name: 'Status key' }), { hold: 1300 })

  const tabs = page.getByRole('tab')
  const names = await tabs.allTextContents()
  await caption(page, names.length > 1
    ? `Below, one tab per operational area — the ${who.title} sees only the ${names.length} areas they lead`
    : `Below, the operational areas — the ${who.title} sees only the one area they lead`, 3000)
  await point(page, page.getByRole('tablist', { name: 'Operational area' }), { hold: 1200 })
  for (const name of names.slice(1, full ? 3 : 1)) {
    await point(page, tabs.filter({ hasText: name }), { click: true, hold: 400 })
    await pause(1800)
  }
  if (names.length > 1) {
    await point(page, tabs.first(), { click: true, hold: 300 })
    await pause(1000)
  }

  await caption(page, 'For the selected area, the KPI cards count its phases and milestones by status')
  await point(page, page.getByRole('group', { name: 'Status counts' }), { hold: 1300 })
  await caption(page, '# of RAID is every RAID item in the area; Premera Attention required counts the ones Premera needs to act on')
  await point(page, page.getByText(/# of RAID:/), { hold: 900 })
  await point(page, page.getByText(/Premera Attention required:/), { hold: 1200 })

  const card = page.getByRole('region', { name: /^Transition Program Summary - / })
  if (await visible(card)) {
    await caption(page, "The area's title card: overall status as a coloured badge, then the summary, accomplishments and priorities")
    await point(page, card, { hold: 1800 })
  }

  const dashboard = page.getByRole('region', { name: 'Transition Program Dashboard' })
  if (await visible(dashboard)) {
    await caption(page, 'Its dashboard: each phase with its status, dates and milestones; red notes flag what needs attention')
    await point(page, dashboard, { hold: 1000 })
    const phase = dashboard.locator('.ag-row').filter({ hasText: 'Transition / KT' })
    if (await visible(phase, 2000)) {
      await caption(page, 'Click a phase for its details and milestones')
      await point(page, phase.getByText('Transition / KT').first(), { click: true })
      await pause(2800)
      await page.keyboard.press('Escape')
      await pause(600)
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
  const up = scope.locator('[title="Good"]').filter({ visible: true })
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
  await caption(page, 'Next section: the Transition Summary Report')
  await point(page, page.getByRole('link', { name: 'Transition Summary Report' }).filter({ visible: true }), { click: true })
  await page.getByRole('heading', { level: 1, name: 'Transition Summary Report' }).waitFor()
  await pause(1200)
  const toggle = page.getByRole('button', { name: /Transition Program Executive Summary/ })
  if (await visible(toggle)) {
    await caption(page, 'The Executive Summary: contacts, overall status, accomplishments, priorities, key risks and where executive focus is needed', 3400)
    await point(page, toggle, { hold: 600 })
    await scrollBy(page, 650, 1800)
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
  await caption(page, 'Last section: Feedback to UST')
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
  await scrollBy(page, 500, 1200)
  await caption(page, 'Every submission is listed below, searchable and filterable', 2400)
}

// ─── phone walkthrough ───────────────────────────────────────────────────────

/** The phone layout, explained piece by piece: it mirrors the UST mobile app. */
async function phoneProgram(page, who, { full }) {
  await toTop(page)
  if (full) {
    await caption(page, 'The same portal on a phone — same data, same access rules, laid out like the mobile app', 3200)
    await caption(page, 'At the top: the UST and Premera brands, and the account menu', 1200)
    await point(page, page.getByRole('button', { name: 'Account menu' }), { hold: 1200 })
  }
  await caption(page, 'The page title sits beside the As-Of date, with the status key right underneath', 1400)
  await point(page, page.getByRole('heading', { level: 1 }), { hold: 900 })
  await point(page, page.getByRole('group', { name: 'Status key' }), { hold: 1300 })

  const tabs = page.getByRole('tab')
  const names = await tabs.allTextContents()
  await caption(page, names.length > 1
    ? `Operational areas are a strip of tabs — swipe sideways to switch. The ${who.title} has ${names.length}`
    : `The ${who.title} has one operational area, so there is a single tab`, 1600)
  await point(page, page.getByRole('tablist', { name: 'Operational area' }), { hold: 1200 })
  if (names.length > 1) {
    await point(page, tabs.nth(1), { click: true, hold: 300 })
    await pause(1800)
    await point(page, tabs.first(), { click: true, hold: 300 })
    await pause(1000)
  }

  await caption(page, "Five KPI tiles in one row: the area's phases and milestones by status", 1400)
  await point(page, page.getByRole('group', { name: 'Status counts' }), { hold: 1400 })
  await caption(page, 'Then the RAID count, and how many items need Premera to act', 1200)
  await point(page, page.getByText(/# of RAID:/), { hold: 700 })
  await point(page, page.getByText(/Premera Attention required:/), { hold: 1100 })

  const card = page.getByRole('region', { name: /^Transition Program Summary - / })
  if (await visible(card)) {
    await caption(page, "The area's title card: overall status badge, then the summary — scroll to read it all", 1400)
    await point(page, card, { hold: 1400 })
    await scrollBy(page, 420, 1600)
  }

  const dashboard = page.getByRole('region', { name: 'Transition Program Dashboard' })
  if (await visible(dashboard)) {
    await caption(page, 'Each phase is a card: status on the right, dates underneath, and notes — red where something needs attention', 3400)
    const more = dashboard.locator('summary').first()
    if (await visible(more, 1500)) {
      await caption(page, 'Tap a milestone count to open its milestones in place', 1200)
      await point(page, more, { click: true, hold: 500 })
      await pause(2600)
      await point(page, more, { click: true, hold: 300 }) // fold it again
    }
    if (full) {
      await caption(page, 'Thumbs up or down on every phase, just like on the web', 1200)
      await point(page, dashboard.locator('[title="Good"]').filter({ visible: true }), { hold: 1200 })
    }
    await scrollBy(page, 700, 1600)
  }

  const raid = page.locator('#tab-raid')
  if (await visible(raid)) {
    await caption(page, 'RAID items are cards too: type, status, owner and due date — overdue dates and Premera actions in red', 1600)
    await point(page, raid, { hold: 1400 })
    const tag = raid.getByText('Action required')
    if (await visible(tag, 1500)) await point(page, tag, { hold: 1200 })
    if (full) {
      const reply = raid.getByRole('button', { name: /^Replies on / })
      if (await visible(reply)) {
        await caption(page, "Reply opens the item's thread, right on the phone", 1200)
        await point(page, reply, { click: true })
        const dialog = page.getByRole('dialog')
        await dialog.waitFor({ state: 'visible' })
        await pause(1000)
        const box = dialog.getByLabel('Your reply')
        await point(page, box, { click: true, hold: 300 })
        await box.pressSequentially('On it — will confirm by Friday.', { delay: 50 * SPEED })
        await pause(1200)
        if (SEND) await dialog.getByRole('button', { name: 'Send reply' }).click()
        await page.keyboard.press('Escape')
        await pause(700)
      }
    }
  }
}

/** The bottom tab bar, then the report and feedback on a phone. */
async function phoneSections(page) {
  const bar = page.getByRole('navigation', { name: 'Sections' })
  await caption(page, 'Sections live in a bottom tab bar, as in the app: Program, Feedback and Report', 1400)
  await point(page, bar, { hold: 1600 })
  await point(page, bar.getByRole('link', { name: 'Transition Summary Report' }), { click: true })
  await page.getByRole('heading', { level: 1, name: 'Transition Summary Report' }).waitFor()
  await pause(1000)
  const toggle = page.getByRole('button', { name: /Transition Program Executive Summary/ })
  if (await visible(toggle)) {
    await caption(page, 'The Executive Summary reads top to bottom; tap its header to fold it away', 1400)
    await point(page, toggle, { click: true, hold: 400 })
    await pause(1400)
    await point(page, toggle, { click: true, hold: 300 })
    await scrollBy(page, 700, 1800)
  }
  const dash = page.getByRole('region', { name: 'Transition Program Dashboard' })
  if (await visible(dash)) {
    await caption(page, 'The slide-format dashboard keeps all its columns — swipe it sideways on a phone', 1400)
    await point(page, dash, { hold: 1800 })
  }
  await caption(page, 'Feedback to UST works the same on a phone', 800)
  await point(page, bar.getByRole('link', { name: 'Feedback to UST' }), { click: true })
  await pause(1200)
  await scrollBy(page, 400, 1400)
  await point(page, bar.getByRole('link', { name: 'Program Level' }), { click: true })
  await pause(1200)
}

// ─── runners ─────────────────────────────────────────────────────────────────

/** Caption bar + cursor on every page; no onboarding tour. */
export async function prepare(context) {
  await context.addInitScript(OVERLAY)
  await context.addInitScript(() => { try { localStorage.setItem('ustpremera_tour_v3', 'done') } catch { /* private mode */ } })
}

/** Web: the header sections first, then each page in detail as the VP; then the Director briefly. */
export async function runWeb(page) {
  await signIn(page, VP)
  await headerTour(page, VP)
  await programLevel(page, VP, { full: true })
  await report(page, { full: true })
  await feedback(page)
  await signOut(page)

  await signIn(page, DIRECTOR)
  await caption(page, 'The Premera Director: the same portal, scoped to the one area they lead', 2800)
  await programLevel(page, DIRECTOR, { full: false })
  await report(page, { full: false })
  await toTop(page)
  await caption(page, 'Transition Status Portal — live status, shared decisions, one source of truth', 4000)
  await caption(page, '', 0)
}

/** Phone: the VP in detail, then the Director briefly. */
export async function runPhone(page) {
  await signIn(page, VP)
  await phoneProgram(page, VP, { full: true })
  await phoneSections(page)
  await signOut(page)
  await signIn(page, DIRECTOR)
  await caption(page, 'The Premera Director on a phone: one area, the same layout', 2600)
  await phoneProgram(page, DIRECTOR, { full: false })
  await toTop(page)
  await caption(page, 'Transition Status Portal — on the desk or on the go', 4000)
  await caption(page, '', 0)
}

/** A fixed (not DEMO_SPEED-scaled) wait before the demo starts, with a countdown in the terminal. */
async function startPause(seconds, what) {
  if (seconds <= 0) return
  console.log(what)
  for (let s = seconds; s > 0; s--) {
    process.stdout.write(`\r  starting in ${s}s `)
    await new Promise((r) => setTimeout(r, 1000))
  }
  process.stdout.write('\r  starting now     \n')
}

async function main() {
  const headless = process.env.DEMO_HEADLESS === '1'
  // Manual phone mode: you pick the device in DevTools' device toolbar during the pause.
  const manualPhone = PHONE && !DEVICE
  const wait = Number(process.env.DEMO_START_WAIT ?? (PHONE ? 15 : 10))
  const browser = await chromium.launch({
    headless,
    args: manualPhone ? ['--start-maximized', '--auto-open-devtools-for-tabs'] : PHONE ? [] : ['--start-maximized'],
  })
  let context
  if (PHONE && DEVICE) {
    const device = devices[DEVICE]
    if (!device) throw new Error(`Unknown DEMO_DEVICE "${DEVICE}" — use a Playwright device name such as "iPhone 16 Pro".`)
    context = await browser.newContext({ ...device })
  } else {
    context = await browser.newContext({ viewport: null })
  }
  await prepare(context)
  const page = await context.newPage()
  await startPause(headless ? 0 : wait, manualPhone
    ? `Phone demo: in DevTools, turn on the device toolbar (Ctrl+Shift+M) and pick the device. Starting in ${wait}s.`
    : `Starting the ${PHONE ? 'phone' : 'web'} demo in ${wait}s — start your recording.`)
  if (PHONE) await runPhone(page)
  else await runWeb(page)
  console.log('Demo finished. Close the browser window when you have stopped recording.')
  await page.waitForEvent('close', { timeout: 0 }).catch(() => {})
  await browser.close()
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
