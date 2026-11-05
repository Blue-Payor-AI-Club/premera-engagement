# premera-engagement — web app

The web front end of the UST × Premera Engagement Portal. Everyone signed in sees **Program
Level** (ITO, BPO, Transition), **Risks & Issues** and **Feedback to UST**. UST roles also get
**Activity** (the audit trail) and **Data Sync** (Excel import / export / rollback), and Super
Admins get **Super Admin** (users, access requests, invites, notification recipients, email log).

React 19 + Vite + TypeScript, MUI, ag-grid and Tailwind. All data comes from
[`premera-engagement-api`](../premera-engagement-api/README.md); there is no mock-data mode.
The read-only phone app is [`premera-engagement-mobile`](../premera-engagement-mobile/README.md).
These are three separate git repos that share one parent folder.

## Prerequisites

- **Node 24.** Under Node 26, 17 of the unit tests fail because Node's built-in `localStorage`
  replaces jsdom's (issue T3 in [`docs/PRODUCTION-READINESS.md`](./docs/PRODUCTION-READINESS.md)).
- The API running locally. Follow its README.

## Running it

```bash
npm install
npm run dev          # http://localhost:5173
```

The API URL is `VITE_API_BASE_URL`: `.env.development` points it at `http://localhost:3000/v1`,
and `.env.production` points it at the deployed server.

Sign in with your work email and the 6-digit code that the API emails you. In local
development the API prints the code to its console instead of sending it.

## Scripts

```bash
npm run build        # tsc -b && vite build -> dist/
npm run lint
npm test             # vitest (jsdom)
npx vitest run src/pages/Login.test.tsx   # a single file
npm run e2e          # Playwright; see e2e/README.md
```

`npm run e2e` starts its own API (port 3999, with a throwaway database) and its own Vite
server (port 5199). It never touches the shared server.

## How it is put together

- `src/lib/api.ts`: `apiFetch` is the only fetch wrapper. It adds the bearer token, turns error
  bodies into `ApiError`, and signs the user out on a 401 from any path outside `/auth/*`.
- `src/context/AuthContext.tsx` owns the session and the user's permission list.
  `RequirePermission` and `lib/navigation.ts` hide what the role can't use. This is UI only:
  the server enforces every permission itself.
- `src/context/PortalDataContext.tsx` holds the portal document and caches it in localStorage.
  When the document's shape changes, bump `STORAGE_KEY` so stale caches are dropped.
- `src/data/portalData.ts` holds the document types. The API (`src/types/portal.ts`) and the
  mobile app keep their own copies, so a contract change has to be made in all three.
- Portal content is maintained in Excel through **Data Sync**, not edited in the UI.

## Docs

- [`DEPLOY.md`](./DEPLOY.md): Docker (Nginx) and manual deployment.
- [`docs/PRODUCTION-READINESS.md`](./docs/PRODUCTION-READINESS.md): test results and the known issues.
- [`API.md`](./API.md): the API contract as the web app uses it.
