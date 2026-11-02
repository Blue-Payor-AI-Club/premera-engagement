# QA observations (Aiswarya, 28 Oct – 2 Nov 2026): open items and fix plan

Source: the email thread "Premera - Engagement Portal - Observation". Items 1–4 have been retested
and pass. Everything below is still open. Each item was traced in code; file references are
`web/` = `premera-engagement/src`, `api/` = `premera-engagement-api/src`.

Sizes: **S** ≈ under half a day, **M** ≈ 1–2 days. "BPO too" means the same component renders
both programs, so one fix covers both.

## Status at a glance

| # | Observation | Verdict | Phase |
|---|---|---|---|
| 5 | "At Risk" on Transition looks like a button | By design; relabel proposed | 1 (if agreed) |
| 6 | "Other" in Feedback Area | Enhancement, awaiting confirmation | 4 |
| 7 | Refresh button doesn't respond | No such button exists; awaiting URL/screenshot | 4 (optional) |
| 8 | Status counts incomplete; Risks & Issues / Attention counts wrong | Confirmed | 1 (interim), 3 (proper) |
| 9 | No visibility tags on workstreams | Confirmed (desktop only) | 1 |
| 10 | Icon doesn't match workbook | Not reproduced in code | Needs info |
| 11 | Concern box disappears, text lost | Confirmed, but the cause is a scroll bug, not a limit | 1 |
| 12 | Duplicate workstream names mis-map milestones | Confirmed | 2 |
| 13 | Dates accept any format / text; year appended | Confirmed | 3 |
| 14 | Long milestone text doesn't wrap | Confirmed | 1 |
| 15 | Re-upload duplicates workstream milestones | Confirmed for one scenario | 2 |
| 16 | Expand/collapse icon out of sync | Confirmed | 1 |
| 17 | Blank Workstream Name attaches to the row above | Confirmed (fill-down by design, but unsafe) | 2 |
| 18 | Re-upload duplicates program milestones | Same cause as 15 | 2 |
| 19 | Submit/Skip hidden for last program milestone | Confirmed | 1 |
| 20 | Risk Action dialog footer shows issue status, unlabelled | Confirmed (confusing) | 1 |
| 21 | Issue column locked on RiskActions | Partly by design; spare rows lack the lookup | 2 |
| 22 | Premera user sees everything + UST note | Not a code bug — the account's role is wrong | Needs info, then 0/3 |
| 23 | Export / filter options | Enhancement | 4 |
| 24 | TransitionRAID Status dropdown | Confirmed free text | 2 |
| 25 | TransitionSummary Title not shown | By design, but silently dropped | 2 (warning) |

---

## Phase 1 — Web UI fixes (no data or workbook change) · ~2 days

Low risk, web app only, independent of each other. All also fix BPO.

**11 + 19. Feedback concern popup** — `web/components/QuickFeedback.tsx`
- Cause (11): the popup closes on *any* scroll in capture phase (`:41-50`). The textarea is
  3 rows with `resize-none`, so once text passes 3 lines the textarea scrolls itself and the
  popup unmounts. Reopening resets the draft (`:91`), so the text is lost. A failed save also
  closes the box (`:112`). There is no character limit anywhere today (web, API zod, DB).
- Cause (19): the popup is placed at `rect.bottom + 6` and never flips (`:87-90`). For the last
  milestone it lands below the viewport; scrolling or zooming to reach it closes it.
- Fix: ignore scroll events from inside the popup; flip above the button when there isn't room
  below; keep the popup open with an inline error when saving fails; add `maxLength={1000}`
  with an "n / 1000" counter, and `.max(1000)` on the API side (`api/validation/feedback.ts`).
- Test: component tests for type-past-3-lines, failed save, and flip near the bottom; the
  existing e2e `program.spec › thumbs down with a typed concern…` should go green.
- Size S.

**9. Visibility tags on workstreams** — `web/pages/ProgramLevel.tsx:87-107`
- The desktop grid's operational-area cell never renders `<VisibleToPremera>`; only the
  mobile accordion does (`:520`).
- Fix: add `<VisibleToPremera flagged={ws.needsPremeraAttention} />` after the name. Size S.

**14. Long milestone text** — `web/pages/ProgramLevel.tsx:169-190, 406-412`, `web/components/MilestoneTable.tsx:56`
- ag-grid sets `white-space: nowrap` on rows and `overflow: hidden` on full-width rows, and the
  detail row height is a fixed 38 px per milestone.
- Fix: `whitespace-normal` on the detail wrapper, `break-words` on the label cell, and measure
  the rendered detail height (`node.setRowHeight` + `onRowHeightChanged`) instead of estimating.
- Size S–M.

**16. Expand/collapse chevron** — `web/pages/ProgramLevel.tsx:99, 336`
- The chevron reads `ws._expanded` from row data, but ag-grid only re-renders a cell when its
  field (`name`) changes, so the icon goes stale until the row is re-created.
- Fix: pass `expandedIds` through the grid context and read `expandedIds.has(ws.id)`. Size S.

**20. Risk Action dialog footer** — `web/components/RiskActionsModal.tsx:158-165`
- The footer shows the *issue's* due date and status with no label, and prints raw keys
  (`onTrack`, `notStarted`) for non-risk statuses.
- Fix: label it "Issue status" / "Issue due" and use `STATUS[status].label` from
  `data/status.ts`. Size S.

**8 (interim). Scorecard and count pills** — `web/pages/ProgramLevel.tsx:216-257`, `web/pages/Risks.tsx:200-203`, `web/components/RiskSummaryBanner.tsx:8`
- Status pills: On Track is always shown, At Risk + Delayed are merged, Complete only when > 0,
  and Not Started never — so the pills don't add up to the Operational Areas total.
  Fix: one pill per status from `LEGEND_ORDER` in `data/status.ts`, Delayed kept separate.
- "Attention Required from Premera" counts every flagged issue at *any* status, including
  closed/complete, while the list beside it shows only at-risk/delayed. For a Premera user every
  row is flagged, so the number equals all issues they can see. The Premera pill also disappears
  when there are no at-risk items (`ProgramLevel.tsx:256`).
  Fix: count `isAtRisk(status) && needsPremeraAttention`, and derive both pills from the same
  filtered list the page renders (so "Include Resolved" changes them too).
- Size S. The underlying design problem is in Phase 3.

**5. Transition "Overall: At Risk" label** (only if Aiswarya agrees) — `web/components/transition/StatusChip.tsx`,
`ExecutiveSummary.tsx:49`, `TransitionDashboard.tsx:151`. Add a `prefix` prop. Size S.

Exit: web unit tests + `npm run e2e` green for the touched specs; deploy web only.

---

## Phase 2 — Workbook import integrity · ~2–3 days

API (`api/import/`) plus the generated workbook. Bump `WORKBOOK_LAYOUT_VERSION` once for the
phase, and ask testers to download a fresh workbook afterwards.

**12. Duplicate workstream names** — `api/import/assemble.ts:123`
- Milestones link to workstreams by `division::name`; the map overwrites, so all milestones of
  a duplicated name attach to the *last* one. Nothing checks uniqueness (issues already do:
  `DUPLICATE_ISSUE_KEY`, `assemble.ts:236-246`).
- Fix: reject with a row-level `DUPLICATE_WORKSTREAM_NAME` error, same pattern as issues. Size S.

**17. Blank Workstream Name fills down** — `api/import/parseWorkbook.ts:94`, `layout.ts:217`
- Deliberate fill-down, but undocumented for this sheet, and it ignores Division changes.
  The generator already writes the name on every row, so it only "helps" typed-in rows.
- Fix: drop the fill-down and make the column required (`REQUIRED_VALUE` error). Do the same
  for RiskActions' Issue Key (`parseWorkbook.ts:104`), which silently attaches a blank-key action
  to the issue above. Size S.

**15 + 18. Re-upload duplicates milestones** — `api/import/idRegistry.ts:41-52`, `rows.ts:230-235`, `service.ts:99-154`, `merge.ts:322-342`
- Rows with an ID update correctly. The duplicate happens with **new rows typed into an old
  copy**: upload once (the server mints an ID from the row's label/section/workstream), keep
  editing the *same* file, rename one of those new rows, upload again. The rename produces a
  different minted ID, the merge sees "added in live" + "added in upload", and keeps both.
  Editing only Due/Revised/Status doesn't trigger it. This is known and documented only in the
  Instructions sheet.
- Fix (S): during the merge, if an uploaded row has a minted ID in a section that also gained
  rows since the workbook's version, refuse with a clear message: "Download a fresh workbook
  and re-apply your changes." (Option M: auto-match by position — more convenient, riskier.)
- Confirm with Aiswarya that this is the scenario (see questions); if rows that already had an
  ID also duplicated, that is a different bug.

**21. RiskActions Issue column** — `api/import/generate.ts:265-276, 471-476`
- "Issue" is a read-only lookup from Issue Key, by design. But the formula is written only on
  existing rows; the 200 spare rows are locked and blank, so a new action never shows its issue.
  An unknown Issue Key is already rejected.
- Fix: write the lookup formula on the spare rows too; optionally make Issue Key a dropdown of
  the Issues sheet's keys. Size S.

**24. TransitionRAID Status dropdown** — `api/import/layout.ts:327`
- Free text today. Dropdowns are just `kind: "enum"` + a list in `ENUM_LISTS` /
  `LIST_COLUMN_ORDER`; upload validation comes with it.
- Fix: add a `RaidStatus` list with label = stored value, so the web needs no change. Size S.
- Needs the allowed values (see questions); existing values outside the list would fail the
  next upload, so check live data first.

**25. TransitionSummary Title** — `api/import/assemble.ts:409-433`, `web/components/transition/ExecutiveSummary.tsx:39-77`
- Title is used only for "Upcoming Priority" rows (shown in bold before the text). For Key
  Accomplishment / Key Risk / Executive Focus it is discarded without a word. The panel heading
  "Transition Program Executive Summary" is hard-coded.
- Fix (S): a sync-report warning when a Title is given on a row type that doesn't use it.
  If the expectation is a configurable heading, that's a Meta row + type + web change (M).

Exit: API unit tests for each new error/warning; parseWorkbook fixtures updated; e2e
`excel.spec` green (it currently fails with `ECONNRESET` on the unchanged code — investigate
that first, it blocks verifying this phase).

---

## Phase 3 — Data model decisions · ~2–3 days once decided

These need a product decision before code.

**13. Date validation** (Program, BPO, Risks & Issues, Transition sheets)
- Every date column is plain text (`api/import/layout.ts:221-222, 235-236, 250, 267, 304-311, 326`),
  stored unchecked and printed as-is. The "year appended" comes from Excel itself: typing
  "3/15" into a General cell becomes a real date in the current year, which we format M/D/YYYY.
- Fix: a `date` column kind — Excel date validation and `m/d/yyyy` format in the workbook;
  on upload accept a real date, M/D/YYYY or YYYY-MM-DD (normalised), else a row-level
  `INVALID_DATE` error. Also validate the Meta As-Of dates.
- Before shipping: scan live data for existing free-text dates ("TBD", "Q3") — otherwise the next
  upload of untouched rows fails. Size M.

**8 (proper) + 22. One flag is doing two jobs**
- `needsPremeraAttention` (the "Premera Attention" column) decides *visibility* to Premera
  (`api/auth/visibility.ts:89`) **and** is shown as "Attention required from Premera" / "Action
  Required" in the UI. So every row Premera can see counts as "needs their attention".
- Fix: a separate "Premera Action Required" column (import, `types/portal.ts`, UI badges and
  counts), leaving "Premera Attention" as visibility only. Size M. Schema change — follow the
  `portal-schema-change` skill.

**22. Premera stakeholder sees everything and the UST note**
- The note only renders for users with `portal:write` (UST / Super Admin), and the API filters
  the document by the role stored in the database on every request. So the account the tester
  used is not a Premera Stakeholder on the server. Likely causes, all present on the server today:
  trusted login (signs in as Super Admin with no code), `SUPERADMIN_BOOTSTRAP_EMAILS` (forces a
  role back to Super Admin on every restart), or dev login (sets whatever role is sent).
- The Phase 0 security fix (committed, not yet deployed) removes trusted login outside local
  development. Check the tester's account on the Super Admin page once we know the email.
- Separate real leak, already in PRODUCTION-READINESS.md as **D1**: after a UST sign-out and a
  Premera sign-in in the same tab, the previous document stays on screen until (or if) the
  fetch fails. Fix in `web/context/PortalDataContext.tsx` (clear in-memory data on sign-out,
  never render the seed document). Size S — schedule with Phase 1.

---

## Phase 4 — Enhancements (after confirmation) · ~2 days

**23. Export and filters**
- Today: Risks has two toggles; the Program grid sorts and paginates but has no filters;
  `/portal/export.xlsx` exists but is UST-only (Admin page).
- Proposal: a search box + division/severity/status filters on Risks; column filters on the
  Program grid (ag-grid `filter: true`); "Export CSV" on both pages built from the data already
  on screen (already filtered by role, so it's safe for Premera). Size S–M.

**6. "Other" in Feedback Area** — `api/types/feedback.ts:15-28`, `web/pages/Feedback.tsx:5-18, 178`,
`api/validation/feedback.ts`. Add "Other" and require Details when chosen. Size S.
- Also fix while there: the web's fallback list writes "End‑to‑End Testing" with non-breaking
  hyphens, which the API would reject, and the form swallows that error (PRODUCTION-READINESS **F1**).

**7. Refresh button** — none exists on Program/Risks/Feedback (only Activity and Super Admin
Email Log). If wanted: a Refresh button in `SlideHeader` calling the existing
`usePortalData().refresh()`. Size S.

**10. Icon tooltip** — if the icon issue can't be reproduced, show the icon's label as a
tooltip so testers can check the mapping themselves. Size S.

---

## Questions for Aiswarya (draft reply)

1. **#8** — Should the scorecard show a count for every status (On Track, At Risk, Delayed,
   Complete, Not Started), including zeros? And should "Attention Required from Premera" mean
   *open at-risk items that need Premera's action*, separate from what Premera is allowed to see?
2. **#10** — Which icon did you pick in the workbook, and which did you expect to see? Did the
   sync report show a warning or a conflict for that row?
3. **#13** — Do any date cells need to stay free text (e.g. "TBD", "N/A", "Q3 2026")?
4. **#15/#18** — Did you upload, then keep editing the same file (without downloading a fresh
   one) and change the name of milestones you had added? Did any row that already had an ID
   get duplicated? Please send both workbooks if possible.
5. **#22** — Which email did you sign in with as a Premera Stakeholder, and what role does the
   account menu (top right) show?
6. **#24** — What should the TransitionRAID Status list be (e.g. Open / In Progress / Closed)?
7. **#25** — Which Section did the row use, and did you expect the panel heading to change, or
   the title to appear next to the text?
8. **#5, #6, #7** — still waiting on your confirmation: "Overall: At Risk" label; "Other" area
   (with a required description?); and the URL + screenshot for the Refresh button.

## Suggested order

1. Phase 0 security deploy (already committed) — also likely resolves #22.
2. Phase 1 + D1, deploy web, ask for retest of 9, 11, 14, 16, 19, 20, 8 (counts).
3. Phase 2 once the `excel.spec` ECONNRESET is understood; new workbook version.
4. Phase 3 and 4 after the answers above.
