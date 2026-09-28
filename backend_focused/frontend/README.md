# Fleet frontend

A Next.js / React workspace for the Django fleet API. Material UI supplies accessible
controls and layout, Axios handles HTTP, and TanStack Query owns server state.

## Run

Requires Node.js 20.9+ and a running backend. From `backend_focused/frontend`:

```bash
npm ci
# Optional: copy .env.example to .env.local and change the API URL.
npm run dev
```

Open http://localhost:3000. The default API is http://localhost:8000/api.
Start and seed Django using the instructions in `../README.md`.
The frontend and backend both use trailing-slash API routes; no authentication is
required for this assessment.

## Workflows

- **Vehicles:** URL-based search, server pagination, create/edit/delete and status.
- **Vehicle detail:** office, complete maintenance history displayed ten rows at a
  time, maintenance create/edit/delete, and office reassignment.
- **Maintenance due:** the chosen additional endpoint. Review a due vehicle, record
  completed maintenance and see it leave the list.
- **Offices and mechanics:** full CRUD with meaningful protected-delete errors.

## Checks

```bash
npm run typecheck
npm run lint
npm run format
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests start their own frontend on port 3100 and Django on port 8011.
Both ports must be free. Tests use a temporary SQLite database, apply the real
migrations, seed data and exercise the actual API; your normal database is untouched.
The test runner uses `../backend/.venv/bin/python` when present, otherwise `python3`.
That Python must have `../backend/requirements.txt` installed. You can select it:

```bash
FLEET_TEST_PYTHON=/absolute/path/to/python npm run test:e2e
```

The browser suite covers CRUD for every entity, maintenance-due cache refresh,
assignment, field validation with preserved input, protected deletion, URL navigation,
pagination, empty results, network retry, later-page office options and mobile layout.
Failure screenshots, video and traces are written to ignored `test-results/`;
`npx playwright show-report` opens the report.

## Architecture and tradeoffs

- Routes in `app/` are thin entry points. Interactive screens and focused forms
  live in `components/`; no generic CRUD schema/framework is introduced.
- `lib/types.ts` distinguishes list/detail/write contracts. `lib/fleet-api.ts`
  contains typed HTTP operations, reference pagination and error translation.
- URL parameters own applied filters and page. Form drafts remain local; successful
  writes invalidate the `fleet` query family, including cached report/detail pages.
  This is deliberately broad for the small application. Narrow invalidation would
  become worthwhile if inactive screens/reference datasets became expensive.
- An Apply button avoids a request on every keystroke and makes date-range changes
  atomic from the user's perspective. Applying filters resets to page one.
- Read requests receive cancellation signals. Client-side validation improves UX;
  API field errors and database constraints remain authoritative.
- Offices/mechanics are small reference datasets fetched across every API page.
  Larger deployments should add server-side autocomplete rather than preload them.
- Vehicle detail already includes all maintenance. The UI reuses that response,
  rendering ten records at a time. This bounds rendered rows, **not downloaded bytes**.
  A truly lazy history requires a revised lightweight detail contract.
- Costs stay decimal strings in forms and requests, and dates are formatted as
  calendar days without local-time shifts. No currency symbol is invented.
- Errors preserve form input; related records block deletion; deactivation remains
  available for vehicles/mechanics. Mutation submission is disabled while pending.
- MUI's App Router cache provider supports streaming styles. One MUI theme owns
  fonts/colors, and system fonts keep builds independent of a font download service.
- Next.js was updated from the starter's 16.2.1 to 16.3.6 and transitive packages
  were refreshed to resolve the dependency audit findings. The lockfile records
  the versions used for verification; use `npm ci` for reproducible installation.

Authentication is intentionally outside the assessment implementation. The proposed
security extension is described in `../INTERVIEW_NOTES.md`, section 15.

## Demonstration

The recorded [end-to-end demo](../docs/fleet-demo.webm) shows URL search, a
never-serviced vehicle, recording maintenance, removal from the due list, an office
transfer, and the office/mechanic screens. It uses the real API with disposable data.
To regenerate it (Chromium and backend Python requirements must be installed):

```bash
npm run demo
# Or select the Python environment:
FLEET_TEST_PYTHON=/absolute/path/to/python npm run demo
```

The recording and desktop/mobile screenshots are written to `../docs/`. The pauses
in the demo script are intentional for readability; ordinary tests use condition-based
waits. The demo is silent and under two minutes.
