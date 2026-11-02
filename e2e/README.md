# End-to-end tests (Playwright)

Browser and API tests against a **local** copy of the stack — never the shared server.

```bash
npm run e2e                      # everything (desktop Chrome + phone viewport for @mobile tests)
npx playwright test risks        # one spec
npx playwright show-report e2e/.run/report
```

`playwright.config.ts` starts both servers itself:

- **API** — `../premera-engagement-api` via `e2e/start-api.cjs`, on port 3999, with a throwaway
  SQLite file in `e2e/.run/` (deleted at every start), dev-login enabled, and the per-IP auth limit
  raised (every test signs in from one IP). Its console goes to `e2e/.run/api.log`, which is where
  tests read sign-in codes (no SMTP, so the console mailer prints them).
- **Web** — Vite on port 5199, pointed at that API.

Specs load the API's demo dataset (`loadPortal`) because a fresh database starts as an empty
template. `signInAs` puts a dev-login token in `sessionStorage`; `auth.spec.ts` covers the real
code-based sign-in.

A failing test here is meant to be a finding: each one asserts the behaviour production should
have. See `../docs/PRODUCTION-READINESS.md` for the current list of known failures.
