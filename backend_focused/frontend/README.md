# Fleet frontend

Next.js and Material UI interface for the fleet API. Includes vehicle search,
CRUD for all four resources, maintenance history, office transfers, maintenance due,
the office summary, mechanic workload and duplicate VIN/plate warnings in the vehicle form.
Every page except `/login` requires signing in (seeded account: `demo` / `demo-password`).

## Run

Start Django using the [project instructions](../README.md). Then, from this directory:

```bash
npm ci
npm run dev
```

Requires Node.js 20.9+. Open [localhost:3000](http://localhost:3000).
The API defaults to `http://localhost:8000/api`. To change it, copy `.env.example`
to `.env.local`, edit `NEXT_PUBLIC_API_BASE_URL` and restart the server.

## Checks and browser tests

```bash
npm run typecheck
npm run lint
npm run format
npm run build
npx playwright install chromium
npm run test:e2e
```

Playwright builds and starts Next.js on port 3100 and Django on port 8011, with
migrations and sample data in a temporary database. Both ports must be free. The build
overwrites `.next/` with one pointing at the test API; `npm run dev` is unaffected.

The runner uses `../backend/.venv/bin/python` if present, otherwise `python3`.
That environment needs the backend requirements installed. To select another Python:

```bash
FLEET_TEST_PYTHON=/absolute/path/to/python npm run test:e2e
```

Specs live in `tests/e2e/` and cover sign-in redirects, logout, silent token refresh, CRUD, URL filters that survive a reload, server
validation errors, duplicate warnings, protected deletion, the office summary, mechanic
workload, maintenance due, network recovery and mobile layout. Failure screenshots,
videos and traces go to `test-results/`. Open the report with `npx playwright show-report`.

## Code organization

`app/` contains route entry points, `components/` contains screens and forms, and
`lib/` contains API types, Axios calls and shared hooks. TanStack Query manages server
data; applied filters and page numbers live in the URL; unsaved values stay in forms.
Writes invalidate all fleet queries. Office and mechanic selectors fetch all pages,
which is suitable for the small reference datasets in this challenge.

Authentication lives in `lib/api-client.ts` and `lib/auth.tsx`. The Axios client
attaches the access token, and on a 401 performs a single shared refresh before retrying
the request. If the refresh fails, the session ends and `Shell` redirects to
`/login?next=<current page>`. Only same-origin `next` paths are followed. Logging out
revokes the refresh token and clears the query cache.

## Demo

[Watch the recording](../docs/fleet-demo.webm).
