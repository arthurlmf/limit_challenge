# Fleet frontend

Next.js and Material UI interface for the fleet API. Includes vehicle search,
CRUD for all four resources, maintenance history, office transfers and maintenance due.

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

Playwright starts Next.js on port 3100 and Django on port 8011, with migrations and
sample data in a temporary database. Both ports must be free.

The runner uses `../backend/.venv/bin/python` if present, otherwise `python3`.
That environment needs the backend requirements installed. To select another Python:

```bash
FLEET_TEST_PYTHON=/absolute/path/to/python npm run test:e2e
```

Tests cover CRUD, URL filters, cache refresh, validation, protected deletion,
network recovery, reference-data pagination and mobile layout. Failure screenshots,
videos and traces go to `test-results/`. Open the report with `npx playwright show-report`.

## Code organization

`app/` contains route entry points, `components/` contains screens and forms, and
`lib/` contains API types, Axios calls and shared hooks. TanStack Query manages server
data; applied filters and page numbers live in the URL; unsaved values stay in forms.
Writes invalidate all fleet queries. Office and mechanic selectors fetch all pages,
which is suitable for the small reference datasets in this challenge.

## Demo

[Watch the recording](../docs/fleet-demo.webm). To regenerate the video and screenshots:

```bash
npm run demo
```

This uses the same isolated backend setup and Python selection as the tests.
Output is written to `../docs/`. The recording is silent and under two minutes.
