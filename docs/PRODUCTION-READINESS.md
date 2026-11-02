# Production readiness — Engagement Portal (web, API, mobile)

Run date: 30 Oct 2026. Scope: every feature of the web app, the API behind it, and the mobile app.

## How this was tested

| Layer | What ran | Result |
|---|---|---|
| Browser + API end-to-end (new) | 70 Playwright tests in `premera-engagement/e2e/`, against a local API + web on a throwaway database | **56 pass, 14 fail — every failure is a confirmed issue below** |
| API unit/integration | `npm test` (node:test) | 194 / 194 pass |
| Web components | `npx vitest run` | 114 / 114 pass on Node 24 (see T3 — 17 fail on Node 26) |
| Mobile components | `npx jest` | 137 / 137 pass (needs `--runInBand` on Windows) |
| Code review | Three independent read-only reviews (auth/admin, portal/Excel/feedback, web+mobile UI) | Their claims were re-checked; status is marked on each issue |
| Production server (read-only) | env check of the API container | JWT secret is strong (96 chars), dev-login off; `NODE_ENV=development`, no SMTP, `CORS_ORIGIN` unset |

Not tested: the mobile app on a real device or simulator (no Detox/Maestro set up), real email
delivery, Excel desktop itself (workbooks were checked with ExcelJS), load/performance.

Status legend: **E2E** = reproduced by a failing automated test · **Code** = confirmed by reading
the code path · **Reviewer** = reported by a reviewer with a script, not re-run by me.

---

## 1. Issues found

### Critical / High — fix before wider rollout

| # | Issue | Where | Status |
|---|---|---|---|
| S1 | **Trusted login gives a Super Admin session with no proof of identity.** Anyone who types one of the 7 allowlisted @ust.com addresses (they're in source control) is signed in as Super Admin — no code. This was added deliberately for convenience, but on any reachable server it is an open door. | `api/src/routes/auth.ts:141-154`, `auth/trustedLogin.ts:16-24`; web `Login.tsx:56` | E2E `api.spec › trusted login…without any code` |
| S2 | **Disabling a trusted Super Admin doesn't stick** — the next trusted login (and every restart) re-activates it, so a compromised account can't be locked out. | `trustedLogin.ts` `ensureTrustedUser`, `services/bootstrap.ts` | E2E `api.spec › a disabled trusted account stays disabled` |
| S3 | **Sign-in codes only reach the server log.** The server runs `NODE_ENV=development` with no SMTP, so the console mailer prints every code and invite link, and the outbox marks them "sent". Real users (e.g. Premera) can't get a code; anyone who can read container logs can sign in as anyone. | `api/src/mail/transport.ts:46,61`; server env | Code + server check |
| D1 | **UST-only rows shown to a Premera user.** If a UST user signs out and a Premera user signs in in the same tab and the portal fetch fails (or is slow), the previous user's full document stays on screen. Sign-out clears storage but not the in-memory copy. | web `context/PortalDataContext.tsx` | E2E `visibility.spec › if the Premera fetch fails…` |
| D2 | **Sample data shown as if real.** When the API errors (or before the first response), the web app renders its bundled demo document — realistic fake issues — with no error. | web `PortalDataContext.tsx:49`, `ProgramLevel.tsx:288`, `Risks.tsx:184` | E2E `resilience.spec › API returns 500…` |
| D3 | **A workbook with a blank/garbled SourceVersion silently overwrites newer changes** (merge is skipped). Happens if someone copies data into a fresh sheet or inserts blank rows in Meta. | `api/src/import/meta.ts:302-312`, `service.ts:99` | Reviewer (script) |

### Medium

| # | Issue | Where | Status |
|---|---|---|---|
| S4 | OTP throttling resets when a code is burned: after 5 wrong guesses the cooldown and the 5-per-hour cap are gone, so codes can be re-requested immediately (inbox flooding; ~20 guesses per 15 min per IP indefinitely). | `api/src/repositories/loginCodes.ts:80-92` | E2E `api.spec › burning a code…` |
| S5 | Per-IP sign-in limit (30 / 15 min, shared by all auth routes) — all Premera users behind one corporate NAT/proxy share one bucket and can lock each other out. | `routes/auth.ts:43-56`, `TRUST_PROXY` | E2E (hit it during the run) |
| S6 | Removing a domain doesn't end existing sessions (up to 8 h), and can silently lock out other Super Admins on that domain. | `middleware/auth.ts`, `routes/admin.ts:224` | Code |
| S7 | CORS reflects any origin when `CORS_ORIGIN` is unset (it is on the server); no security headers (helmet); `/docs` public. | `api/src/app.ts:39` | E2E `api.spec › security headers` + server check |
| V1 | Premera users see tower go-live rows and the tower block unfiltered (no Premera Attention flag on them). Not shown on any current page, but returned by the API. | `api/src/auth/visibility.ts` | Reviewer (script) |
| V2 | A renamed/missing "Premera Attention" column, or an unrecognised value ("YES.", "on"), silently becomes No — mass hiding from Premera with no warning. | `import/rows.ts:94`, `cells.ts:46` | Reviewer (script) |
| F1 | Feedback form: a failed submission is silently swallowed (no message, user thinks it went). | web `pages/Feedback.tsx:110` | E2E `feedback.spec › server rejects…` |
| F2 | Feedback area list fallback uses non-breaking hyphens ("End‑to‑End Testing") the API rejects — if `/feedback/areas` fails, picking it 422s, silently (F1). | web `Feedback.tsx:11`, mobile `data/feedback.ts:30` | Code |
| F3 | Thumbs-down popup opens below the screen for lower rows, and any scroll closes it — users can't reach Submit. | web `components/QuickFeedback.tsx:44,86` | E2E `program.spec › thumbs down with a typed concern…` |
| F4 | Quick feedback accepts any item id and unlimited comment length; feedback subject/details have no max length (100 KB accepted). | `routes/quickFeedback.ts`, `validation/feedback.ts` | E2E `api.spec › quick feedback…`, `…very long subject…` |
| F5 | Premera users can read all feedback, including other people's email addresses — confirm this is intended. | `auth/permissions.ts` (`feedback:read: ALL`) | Code |
| X1 | Rollback, reset and `PUT /portal/meta` ignore concurrency and can wipe an upload that just landed. | `import/service.ts:275`, `routes/portal.ts` | Reviewer |
| X2 | Excel panel: download errors are unhandled; choosing the same file again does nothing; break-glass JSON restore updates the screen before the server confirms. | web `ExcelSyncPanel.tsx:65,103`, `PortalDataContext.tsx:83` | Reviewer |
| A1 | Accessibility: Feedback labels not tied to their fields; icon-only X buttons and thumbs have no accessible name/pressed state; modals have no `role=dialog`/focus trap; read-only star ratings in the log are exposed as buttons. | web `Feedback.tsx`, `QuickFeedback.tsx:126`, `RiskActionsModal.tsx:65` | E2E `feedback.spec › accessible labels` + Code |
| U1 | The Program tab (ITO/BPO/Transition) resets to ITO on every reload. | web `ProgramLevel.tsx` | E2E `program.spec › tab survives a reload` |

### Low

| # | Issue | Status |
|---|---|---|
| L1 | Server errors (500) instead of 4xx: bad feedback `cursor`; `%` in a user email path. | E2E (`api.spec`) |
| L2 | Hyperlink cells with rich text import as "[object Object]". | Reviewer |
| L3 | Risks page shows a blank area when filters leave nothing (no empty-state text). | Code |
| L4 | Tour: card overflows below ~384 px wide; no replay on web; mobile tour reappears after sign-out/in. | Reviewer |
| L5 | Mobile: Activity reachable by deep link for Premera (shows raw 403); Risks has no stale banner/pull-to-refresh. | Reviewer |
| L6 | `portal_document_history` is never pruned (grows forever). | Code |
| L7 | Placeholder copy still visible: "Program Level Status Reporting Sample", "<<ITO Program Level>> Highlights" (the latter is workbook content). | E2E screenshot |
| L8 | Deleted-then-recreated users get their old tokens back (no token revocation/logout endpoint). | Code |

### Test infrastructure

| # | Issue |
|---|---|
| T1 | No CI runs any of the suites; the new e2e suite needs a CI job. |
| T2 | No mobile end-to-end on a device/simulator. |
| T3 | Web unit tests fail on Node 26 (built-in `localStorage` replaces jsdom's) — pin Node 24 (`engines`/`.nvmrc`) or set up storage in `src/test/setup.ts`. |
| T4 | Mobile Jest on Windows needs `--runInBand` (cache rename errors). |

---

## 2. Test-case catalogue

✅ automated and passing · ❌ automated and failing (= issue above) · ⬜ not automated yet (manual or to add)

### Sign-in and access (web; mobile shares the API)
| ID | Case | Expected | |
|---|---|---|---|
| AU-01 | Registered user, email typed with caps/spaces, correct code | Signed in, lands on Program | ✅ |
| AU-02 | Wrong code, then the right one | Error shown, retry works | ✅ |
| AU-03 | Code box with letters / fewer than 6 digits | Digits only; Verify disabled | ✅ |
| AU-04 | Email outside allowed domains | Refused before a code is sent, names the domains | ✅ |
| AU-05 | Unregistered colleague | Access-request form → "pending" | ✅ |
| AU-06 | Sign out | Back to sign-in; token and cached portal removed | ✅ |
| AU-07 | Tampered token | Sign-in screen, no broken page | ✅ |
| AU-08 | User disabled mid-session | Sent back to sign-in on next load | ✅ |
| AU-09 | Trusted address without a code | Should require proof (S1) | ❌ |
| AU-10 | Disabled trusted account | Stays disabled (S2) | ❌ |
| AU-11 | Burn a code, request again within 60 s | 429 (S4) | ❌ |
| AU-12 | Expired code (>10 min), resend after 60 s, 6th request in an hour | Expired error; resend works; 429 | ⬜ |
| AU-13 | Subdomain / look-alike domain (a@sub.ust.com, a@ust.com.evil.com) | 403 | ⬜ (API) |
| AU-14 | Access request: repeat while pending, after rejection, token expired, email registered meanwhile | 200 same id / 201 / 401 / 409 | ⬜ |
| AU-15 | Invite: accept, accept twice, expired, revoked, resent (old link dead), disallowed domain | session / 404 / 404 / 404 / 404+new works / 403 | partly ✅ (send, revoke, disallowed) |
| AU-16 | Session expires mid-session | Sign-in with a "session expired" message | ⬜ |
| AU-17 | Remove a domain while its users are signed in | Their sessions end (S6) | ⬜ |
| AU-18 | 31+ sign-ins from one network in 15 min | Not locked out (S5) | ⬜ |

### Roles and navigation
| ID | Case | Expected | |
|---|---|---|---|
| RB-01 | Premera menu | Program, Risks, Feedback only | ✅ |
| RB-02 | UST menu | + Activity, Data Sync | ✅ |
| RB-03 | Super Admin menu | + Super Admin | ✅ |
| RB-04 | Premera types /admin, /activity, /superadmin | No access page | ✅ |
| RB-05 | UST types /superadmin | No access | ✅ |
| RB-06 | Unknown URL | Redirect to Program | ✅ |
| RB-07 | Premera calls legacy /portal/program/* reads | 403 | ✅ (API unit) |
| RB-08 | Mobile Premera deep-links to Activity | Blocked (L5) | ⬜ |

### Premera visibility ("Premera Attention")
| ID | Case | Expected | |
|---|---|---|---|
| PV-01 | UST view | All rows, Visible/UST-only tags, notice | ✅ |
| PV-02 | Premera view | Only Yes rows, no tags/notice | ✅ |
| PV-03 | Premera API response | No hidden rows even bypassing the UI | ✅ |
| PV-04 | Premera Program page | Only the flagged workstream | ✅ |
| PV-05 | UST then Premera in one tab | No UST rows | ✅ |
| PV-06 | Same, with the Premera fetch failing | No UST rows (D1) | ❌ |
| PV-07 | Hidden parent with Yes children; empty sections; notes row span | Children hidden; section dropped; span moved | ✅ (API unit) |
| PV-08 | Tower go-lives / tower block | Filtered (V1) | ⬜ |
| PV-09 | Column renamed / value "YES." | Warning on import (V2) | ⬜ |
| PV-10 | Premera ETag differs from UST | No cross-user 304 | ✅ (API unit) |

### Program Level
| ID | Case | Expected | |
|---|---|---|---|
| PG-01 | Default ITO tab, workstreams, status key | Shown | ✅ |
| PG-02 | Switch BPO / Transition | Content swaps | ✅ |
| PG-03 | Executive Summary collapse/expand | Toggles | ✅ |
| PG-04 | Reload keeps the tab (U1) | Same tab | ❌ |
| PG-05 | Phone width: menu toggle, tabs, no sideways scroll | Works | ✅ |
| PG-06 | Empty data (0 workstreams, no RAID) | Zero states, no crash | ⬜ |
| PG-07 | 200+ rows, very long/unicode text | Wraps, usable | ⬜ |
| PG-08 | Workstream milestones expand | Toggle + accessible name | ⬜ |

### Quick feedback (thumbs)
| ID | Case | Expected | |
|---|---|---|---|
| QF-01 | Thumbs up, reload, click again | Saved, survives reload, removed | ✅ |
| QF-02 | Thumbs down → empty Submit | "Please describe your concern, or choose Skip." | ✅ |
| QF-03 | Skip keeps the vote | Red stays | ✅ |
| QF-04 | Esc closes popup, keeps vote | ✅ | ✅ |
| QF-05 | Typed concern (unicode) on a lower row | Saved (F3) | ❌ |
| QF-06 | Save fails | Error shown, vote/draft kept | ⬜ |
| QF-07 | Rapid up/down/up | Server matches UI | ⬜ |
| QF-08 | Vote on unknown id / 50 KB comment | Rejected (F4) | ❌ |

### Risks & Issues
| ID | Case | Expected | |
|---|---|---|---|
| RI-01 | Status key | Shown | ✅ |
| RI-02 | Default filter / Include Resolved / toggle back | At Risk+Delayed / adds others / back | ✅ |
| RI-03 | Count pill | Matches listed At Risk items | ✅ |
| RI-04 | Premera only + Include Resolved | Only Premera items, any status | ✅ |
| RI-05 | Actions modal: Esc, X | Closes | ✅ |
| RI-06 | Issue with no actions | "No actions recorded yet." | ✅ |
| RI-07 | Filters leave nothing | Empty-state text (L3) | ⬜ |
| RI-08 | Browser Back with modal open | Closes modal | ⬜ |

### Feedback to UST
| ID | Case | Expected | |
|---|---|---|---|
| FB-01 | No rating | Send disabled | ✅ |
| FB-02 | Missing area/subject | Not sent | ✅ |
| FB-03 | Full submission (unicode, multiline) | Confirmation, form reset, in log after reload | ✅ |
| FB-04 | Area list | Loaded from server | ✅ |
| FB-05 | Server rejects | User told, input kept (F1) | ❌ |
| FB-06 | Labels tied to fields | Accessible (A1) | ❌ |
| FB-07 | 100 KB subject | 422 (F4) | ❌ |
| FB-08 | Bad cursor | 4xx (L1) | ❌ |
| FB-09 | Areas endpoint down, pick "End-to-End Testing" | Submits (F2) | ⬜ |
| FB-10 | Double-click Send | One entry | ⬜ |

### Data Sync (Excel)
| ID | Case | Expected | |
|---|---|---|---|
| XL-01 | Download workbook | .xlsx file | ✅ |
| XL-02 | Non-xlsx file | Refused, Sync disabled | ✅ |
| XL-03 | Unchanged re-upload | "No changes" | ✅ |
| XL-04 | Dry run then Sync | Preview writes nothing; Sync saves | ✅ |
| XL-05 | Two people, same field, same download | Conflict choice; "Use my values" wins | ✅ |
| XL-06 | Invalid status value | Row-level report, nothing changed | ✅ |
| XL-07 | Reset button for UST | Hidden | ✅ |
| XL-08 | New row typed in spare rows; row after a gap; copied row with ID | Imported; imported; duplicate-ID error | ✅ (API unit) |
| XL-09 | Blank/garbled SourceVersion | Refused or merged, never a silent overwrite (D3) | ⬜ |
| XL-10 | Missing sheet / renamed column / old template version | Clear errors / Transition kept | ✅ (API unit) |
| XL-11 | Formulas, #REF!, hyperlinks, merged cells, numeric IDs | Values or clear errors (L2) | ⬜ |
| XL-12 | File > 5 MB / zip bomb | 413 / rejected without memory blow-up | partly (413 ✅ unit) |
| XL-13 | Rollback to v1 / missing / current version; reset with concurrent upload | Restored / 404 / defined / no lost write (X1) | partly ✅ |
| XL-14 | Download fails; same file chosen twice | Error shown; re-reads (X2) | ⬜ |

### Super Admin and Activity
| ID | Case | Expected | |
|---|---|---|---|
| SA-01 | Every tab opens | No errors | ✅ |
| SA-02 | Own row | Can't demote/disable/remove | ✅ |
| SA-03 | Change another user's role | Saved | ✅ |
| SA-04 | Domains: bad entry, own domain removed, valid list (normalised, de-duplicated) | Refused / refused / saved | ✅ |
| SA-05 | Invite send + revoke; disallowed domain | Works; refused | ✅ |
| SA-06 | Approve/reject request (twice quickly) | One decision | ⬜ |
| SA-07 | Notifications: no recipients warning; email log retry | Warns; retries only retriable | ⬜ |
| SA-08 | Email with % in path | 4xx (L1) | ❌ |
| AC-01 | Activity lists recent actions | Shown to UST | ✅ |

### Resilience and security
| ID | Case | Expected | |
|---|---|---|---|
| RS-01 | API 500 on first load | Error, no sample data (D2) | ❌ |
| RS-02 | Slow API | No sample data flash | ✅ |
| RS-03 | Outage after one good load | Last real data shown | ✅ |
| RS-04 | Error shape with requestId | Standard | ✅ |
| RS-05 | Security headers | Present (S7) | ❌ |
| RS-06 | CORS from unknown origin with `CORS_ORIGIN` set | Refused | ⬜ |

### Mobile (unit-tested only today)
Login steps, tabs per role, Program/Risks/Feedback/Activity screens, quick feedback (incl. empty Submit),
legend, filters, tour replay, cache with conditional GET, pull to refresh — covered by Jest component
tests (137). ⬜ Not yet run on a device: sign-in with a real code, offline launch with cache, Android back
button in modals, deep links, 304 with no cache, small screens.

---

## 3. Phased plan

### Phase 0 — Security blockers (before any wider rollout) · ~2–3 days
1. **S1/S2 trusted login**: switch it off outside local development (env flag, default off), or make it
   "OTP once, then remember this device". Make disable/delete stick (don't re-activate in
   `ensureTrustedUser` / bootstrap).
2. **S3 email**: configure SMTP (or Azure mail) on the server and set `NODE_ENV=production` so the
   console mailer can't be used and the startup config checks run.
3. **S7**: set `CORS_ORIGIN` to the portal's address; add helmet headers; hide `/docs` in production.
4. **S4**: keep the send window when a code is burned (don't delete the whole row).
5. Re-run `npm run e2e` — AU-09/10/11 and RS-05 must go green.

### Phase 1 — Data correctness and leaks · ~3 days
1. **D1/D2**: reset the in-memory document on sign-out; drop the bundled demo document as a
   fallback — show a loading state and a clear error instead; only use the cache that belongs to the
   signed-in user.
2. **D3**: refuse (or force a dry run) when SourceVersion is blank/invalid.
3. **V1/V2**: filter tower go-lives/tower block for Premera; warn on a missing "Premera Attention"
   column and on unrecognised Yes/No values.
4. **X1**: honour `If-Match` on rollback/reset/meta.
5. **F5**: confirm with the business whether Premera should see everyone's feedback; restrict if not.

### Phase 2 — User-facing errors and robustness · ~3 days
1. **F1/F2/F3**: show feedback errors; fix the area-name hyphens; keep the thumbs popup on screen
   (flip above, don't close on scroll inside it), show save errors.
2. **F4/L1**: length limits on feedback and comments, reject unknown item ids, 4xx not 500 for bad
   input.
3. **S5/S6**: set `TRUST_PROXY` correctly; per-email rather than per-IP limits for sign-in; end
   sessions when a domain is removed.
4. **X2**: Excel panel download errors, re-pick same file, confirm-before-update for JSON restore.
5. **U1, L3**: remember the Program tab (URL `?tab=`); empty states on Risks.

### Phase 3 — Accessibility, mobile and polish · ~3–4 days
1. **A1**: label/field association, accessible names and `aria-pressed` on icon buttons,
   `role=dialog` + focus trap on modals, ratings as text in the log.
2. **L4/L5**: tour on small screens and replay on web; mobile Activity permission check, Risks
   stale banner and pull-to-refresh, tour not reappearing.
3. **L2, L7, L8**: hyperlink text, placeholder copy, token revocation on delete.
4. Mobile: add Maestro flows (sign-in, tabs per role, thumbs, feedback) and run them on an Android
   emulator; produce a preview build for testers.

### Phase 4 — Release engineering · ~2 days
1. CI pipeline (GitHub Actions) running API, web, mobile unit tests and the e2e suite on every push;
   pin Node 24 (`engines` + `.nvmrc`) (T1, T3, T4).
2. Add the ⬜ cases above to the e2e suite as each fix lands (each fix should flip a ❌ to ✅).
3. Operations: database backup job, history pruning policy (L6), error logging/alerting,
   a short release checklist (deploy, smoke test, rollback step).

Exit criteria for "production ready": all ❌ above green, Phase 0–2 complete, CI green on every push,
mobile flows passing on an emulator, and one full manual pass of the catalogue by QA.
