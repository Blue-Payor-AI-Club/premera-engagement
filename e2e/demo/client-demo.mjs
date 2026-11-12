// Client demo walkthrough: opens a real browser and drives the portal at a presenter's pace,
// with a caption bar and a visible cursor, ready to screen-record.
//
//   npm run demo                         # against the live portal (http://10.100.242.71:8082)
//   DEMO_URL=http://localhost:5173 npm run demo
//   DEMO_SEND=1 npm run demo             # also sends the sample reply / thumbs-up (writes data)
//   DEMO_SPEED=0.6 npm run demo          # faster (1 = default pace, 2 = twice as slow)
//
// You sign in yourself in the window that opens (email + code); the demo starts once the
// Program Level page loads. Sign in as a UST user to also show "View as Premera".
// By default nothing is written: the reply is typed but not sent, thumbs are only pointed at.

import { pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'

const BASE = (process.env.DEMO_URL ?? 'http://10.100.242.71:8082').replace(/\/$/, '')
const SEND = process.env.DEMO_SEND === '1'
const SPEED = Number(process.env.DEMO_SPEED ?? 1) || 1
const pause = (ms) => new Promise((r) => setTimeout(r, ms * SPEED))

// ─── presenter helpers ───────────────────────────────────────────────────────

/** A caption bar along the bottom and a cursor dot that follows the mouse (re-added on every page load). */
const OVERLAY = () => {
  const add = () => {
    if (document.getElementById('demo-caption')) return
    const cap = document.createElement('div')
    cap.id = 'demo-caption'
    Object.assign(cap.style, {
      position: 'fixed', left: '50%', bottom: '24px', transform: 'translateX(-50%)', zIndex: 2147483647,
      maxWidth: '80vw', padding: '12px 22px', borderRadius: '12px', background: 'rgba(11,58,83,.94)', color: '#fff',
      font: '600 18px/1.35 system-ui, sans-serif', boxShadow: '0 8px 30px rgba(0,0,0,.3)', textAlign: 'center',
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
    addEventListener('mousemove', (e) => { dot.style.left = `${e.clientX}px`; dot.style.top = `${e.clientY}px` }, true)
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

/** Scroll into view, glide the cursor over, outline it for a moment; optionally click. */
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

async function scrollBy(page, dy, steps = 12) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, dy / steps)
    await pause(60)
  }
}

const visible = async (locator, timeout = 4000) => locator.first().waitFor({ state: 'visible', timeout }).then(() => true, () => false)

// ─── the demo ────────────────────────────────────────────────────────────────

async function programLevel(page) {
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'smooth' }))
  await caption(page, 'Transition Summary Portal — one place for the transition program status, shared by UST and Premera', 3500)
  await point(page, page.getByRole('heading', { level: 1, name: 'Transition Summary Dashboard' }))
  await caption(page, 'The status key sits on top, so every colour on the page reads the same way')
  await point(page, page.getByText('On Track', { exact: true }))
  await caption(page, "KPI cards: the selected area's phases and milestones, counted by status")
  await point(page, page.getByRole('group', { name: 'Status counts' }), { hold: 1500 })

  const tabs = page.getByRole('tab')
  await caption(page, 'One tab per operational area — Service Desk, Claims, Provider Data Management and more')
  await point(page, page.getByRole('tablist', { name: 'Operational area' }), { hold: 1500 })

  // Walk a few areas that have content, then come back to the first.
  const names = await tabs.allTextContents()
  let shown = 0
  for (const name of names) {
    if (shown === 3) break
    await point(page, tabs.filter({ hasText: name }), { click: true, hold: 500 })
    await pause(900)
    if (await visible(page.getByText(`Nothing shared for ${name} yet.`), 800)) continue
    shown++
    await caption(page, `${name}: its own overall status, summary, phase dashboard and RAID log`, 2200)
  }
  await point(page, tabs.first(), { click: true, hold: 400 })
  await pause(800)

  const card = page.getByRole('region', { name: /^Transition Program Summary - / })
  if (await visible(card)) {
    await caption(page, "The area's title card: overall status as a coloured badge, and the status summary")
    await point(page, card, { hold: 1500 })
  }

  const grid = page.locator('[data-tour="workstream-grid"]')
  if (await visible(grid)) {
    await caption(page, 'The Transition Program Dashboard: each phase with its status, dates and milestones')
    await point(page, grid, { hold: 1200 })
    const phase = grid.locator('.ag-row').filter({ hasText: 'Discovery & Planning' })
    if (await visible(phase)) {
      await caption(page, 'Click a phase to see its details and its milestones')
      await point(page, phase.getByText('Discovery & Planning'), { click: true })
      await pause(2800)
      await page.keyboard.press('Escape')
      await pause(600)
    }
  }

  const raid = page.locator('#tab-raid')
  if (await visible(raid)) {
    await caption(page, "Below it, the area's RAID log — risks, assumptions, issues and dependencies")
    await point(page, raid, { hold: 1200 })
    await raidFeedback(page, raid)
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

async function premeraView(page) {
  const btn = page.getByRole('button', { name: 'View as Premera' })
  if (!(await visible(btn, 1500))) return
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'smooth' }))
  await caption(page, "UST decides what's shared: “View as Premera” shows exactly what Premera sees")
  await point(page, btn, { click: true })
  await pause(2500)
  await scrollBy(page, 500)
  await pause(1200)
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'smooth' }))
  await pause(600)
  await point(page, page.getByRole('button', { name: 'Exit preview' }), { click: true })
  await pause(1000)
}

async function report(page) {
  await caption(page, 'The Transition Summary Report: the program-wide view, in the familiar slide format')
  await point(page, page.getByRole('link', { name: 'Transition Summary Report' }), { click: true })
  await page.getByRole('heading', { level: 1, name: 'Transition Summary Report' }).waitFor()
  await pause(1200)

  const toggle = page.getByRole('button', { name: /Transition Program Executive Summary/ })
  if (await visible(toggle)) {
    await caption(page, 'The Executive Summary: overall status, accomplishments, priorities, key risks and where executive focus is needed', 3200)
    await point(page, toggle, { hold: 800 })
    await scrollBy(page, 650, 20)
    await pause(1500)
  }

  const dash = page.getByRole('region', { name: 'Transition Program Dashboard' })
  if (await visible(dash)) {
    await caption(page, 'The program dashboard in its original format: tower, workstream, planning, onboarding and transition dates')
    await point(page, dash.getByText('Discovery / Planning / Onboarding'), { hold: 1500 })
    await scrollBy(page, 450, 15)
    await pause(1200)
  }

  const raid = page.getByRole('region', { name: 'RAID log' }).last()
  if (await visible(raid)) {
    await caption(page, 'And the program-wide RAID items, with the same thumbs and reply thread')
    await point(page, raid, { hold: 1500 })
  }
}

async function feedback(page) {
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'smooth' }))
  await caption(page, 'Feedback to UST: a direct line for anything else')
  await point(page, page.getByRole('link', { name: 'Feedback to UST' }), { click: true })
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
  await scrollBy(page, 500)
  await caption(page, 'Every submission is listed here, searchable and filterable', 2400)
}

/** Caption bar + cursor on every page; no onboarding tour. */
export async function prepare(context) {
  await context.addInitScript(OVERLAY)
  await context.addInitScript(() => { try { localStorage.setItem('ustpremera_tour_v3', 'done') } catch { /* private mode */ } })
}

/** The walkthrough, starting on a signed-in Program Level page. */
export async function runDemo(page) {
  await programLevel(page)
  await premeraView(page)
  await report(page)
  await feedback(page)
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'smooth' }))
  await caption(page, 'Transition Summary Portal — live status, shared decisions, one source of truth', 4000)
  await caption(page, '', 0)
}

async function main() {
  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] })
  const context = await browser.newContext({ viewport: null })
  await prepare(context)
  const page = await context.newPage()

  await page.goto(`${BASE}/program`)
  console.log('Sign in in the browser window; the demo starts when Program Level loads.')
  await caption(page, 'Sign in to start the demo', 0)
  await page.getByRole('heading', { level: 1, name: 'Transition Summary Dashboard' }).waitFor({ timeout: 10 * 60_000 })
  await caption(page, '', 0)
  await pause(1500)

  await runDemo(page)
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
