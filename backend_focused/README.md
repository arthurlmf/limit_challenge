# Fleet maintenance

A fleet maintenance application built with Django REST Framework and Next.js.
It supports vehicle, office, mechanic and maintenance management, including vehicle
search with duplicate detection, office transfers, an office summary, mechanic workload
and a maintenance-due view.

[Watch the demo](docs/fleet-demo.webm) · [API reference](docs/API.md) ·
[Original challenge](CHALLENGE.md)

## Run locally

Requires Python 3.10+ supported by Django 5.2 and Node.js 20.9+.
The backend uses SQLite. Authentication is not implemented.

From the repository root, start the backend:

```bash
cd backend_focused/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_fleet --vehicles 40 --seed 42
python manage.py runserver 127.0.0.1:8000
```

The seed command ensures three offices exist and adds five mechanics and the requested
number of vehicles with Faker-generated VINs, plates and names, including inactive,
overdue and never-serviced examples. Rerunning it adds data; it does not clear
existing records.

In a second terminal, from the repository root:

```bash
cd backend_focused/frontend
npm ci
npm run dev
```

Open [the frontend](http://localhost:3000) or
[DRF's browsable API](http://127.0.0.1:8000/api/).
For a different backend URL, copy `frontend/.env.example` to `frontend/.env.local`
and change `NEXT_PUBLIC_API_BASE_URL` before starting Next.js.

## Tests

From `backend_focused/backend`, with the virtual environment activated:

```bash
python -W error manage.py test
python manage.py check
python manage.py makemigrations --check --dry-run
```

Backend tests cover validation, reporting boundaries, database constraints and
query counts, including vehicle detail with 301 maintenance records.

From `backend_focused/frontend`:

```bash
npm run typecheck
npm run lint
npm run format
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests exercise the real API using a temporary database. They cover CRUD,
URL-driven search, duplicate warnings, reports, maintenance-due updates and failure
handling. Ports 3100 and 8011 must be free. See the [frontend guide](frontend/README.md)
for Python selection and test reports.

## Main decisions and limitations

- **Uniqueness:** database constraints enforce unique VINs and plates among active
  vehicles. The duplicate-check endpoint is advisory: the vehicle form uses it to warn
  before saving, while the constraints remain the source of truth. Ordinary edits are
  last-write-wins.
- **Reports:** the office summary and mechanic workload return plain JSON arrays, as in
  the brief's example, because they have one row per office or mechanic. Collections
  that grow with fleet size (vehicles, history, maintenance due) are paginated.
- **Search:** make and model use case-insensitive partial matching, which suits a
  free-text search box; the other filters are exact.
- **Historical spending:** only the current office assignment is stored. Moving a
  vehicle also moves attribution of its past maintenance costs to the new office.
- **Deletion:** related records prevent parent deletion. Vehicles and mechanics
  can be marked inactive instead.
- **Dates:** office totals use the last 12 calendar months; maintenance due means
  more than 365 days since the last service. These are different cutoffs.
- **History performance:** vehicle detail loads office and maintenance/mechanic
  data in two queries. It still downloads the complete history; frontend pagination
  limits displayed rows, not payload size.
- **SQLite:** retained for easy setup. It limits write concurrency and does not
  provide PostgreSQL's native decimal storage for monetary reporting.

Detailed request formats and remaining validation rules are in the
[API reference](docs/API.md).
