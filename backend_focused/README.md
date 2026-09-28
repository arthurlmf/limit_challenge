# Fleet Maintenance API Take-home Challenge

Build a REST API for managing a fleet of vehicles and their maintenance history.

Use Python, Django and Django REST Framework.

The API does not need authentication or a frontend.

## Domain

A company owns vehicles that are assigned to offices around the country.
Vehicles periodically receive maintenance services performed by mechanics.
A vehicle may have many maintenance records.
A mechanic may service many vehicles.
Each office has many vehicles.

Offices

An office has:
* name
* city

Vehicles

A vehicle has:
* VIN (Vehicle Identification Number)
* license plate
* make
* model
* year
* office
* active flag

A VIN must uniquely identify a vehicle.
A license plate cannot be shared by two active vehicles.

Provide CRUD endpoints.

A mechanic has:

name
certification number
active flag

Provide CRUD endpoints.

Maintenance Records

A maintenance record contains:

vehicle
mechanic
maintenance date
maintenance type
cost
notes

Provide CRUD endpoints.

## API endpoints

1. CRUD endpoints for offices, vehicles, mechanics and maintenance records.

2. Office summary

It should return every office together with:
* number of active vehicles
* total maintenance cost during the last 12 months
* date of the most recent maintenance performed on any vehicle in that office

Example:
[
    {
        "name": "New York",
        "city": "New York",
        "active_vehicle_count": 42,
        "maintenance_cost_last_year": 81250.50,
        "last_maintenance": "2025-02-18"
    }
]

3. Vehicle search

It should support optional filtering by any combination of:

* office
* active/inactive
* make
* model
* maintenance performed between two dates
* mechanic certification number

4. Vehicle details

Return vehicle details together with:
* office information
* complete maintenance history
* mechanic information for each maintenance record

The endpoint should perform well when a vehicle has hundreds of maintenance records.

5. Vehicle maintenance history

Provide an endpoint that returns the maintenance history for a single vehicle ordered from newest to oldest.

6. Assign vehicle

Provide an endpoint that moves a vehicle from one office to another.

The endpoint should record only the new office assignment.

7. Mechanic workload

It should return:
* mechanic name
* number of maintenance records completed during the current year
* total maintenance cost of work performed during the current year

Order mechanics from busiest to least busy.

8. Vehicles needing maintenance

It should return all active vehicles that satisfy either of the following:
* have never received maintenance
* last maintenance was more than 365 days ago

Order by oldest maintenance first.

9. Duplicate vehicle check

Given VIN and license plate, it should return whether another conflicting vehicle already exists and identifies the conflicting fields.

Example:

{
    "conflicts": [
        "vin",
        "license_plate"
    ]
}

## Front-end

If you know React, implement a front-end that uses the CRUD endpoints, the vehicle search one 
and another endpoint you choose.

The Next.js 16 + React 19 app in `frontend/` is pre-wired for this challenge. Material UI handles
layout, axios powers HTTP requests, and `@tanstack/react-query` is ready for data fetching. 

## Error Handling

Return appropriate HTTP status codes for invalid requests.
Validation errors should include meaningful messages.

## Project Structure

- `backend/`: Empty Django project.
- `frontend/`: Empty Next.js app.

## Getting Started

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

### Frontend

```bash
cd frontend
npm install
# NEXT_PUBLIC_API_BASE_URL defaults to http://localhost:8000/api
npm run dev
```

Visit `http://localhost:3000` in your web browser to run it.

## Deliverables

source code
database migrations
a Django management command that fills the database with dummy data to make manually testing your app easier (suggestion: use the faker Python library)
README describing:
  how to run the project
  how to run tests
  assumptions made
  chosen tradeoffs  
if front-end was implemented, record and share a brief video (max 2 minutes) demonstrating the frontend working end-to-end with the backend.

## Evaluation Criteria

- **Backend (50%)** – API design, database queries performance, appropriate use of Django and Django Rest Framework
- **Frontend (25%)** – UX clarity, filter UX tied to query params, state/data management, handling
  of loading/empty/error cases, and overall polish.
- **Code Quality (15%)** – Code structure, testing where it adds value, documentation/readability, naming
- **Product Thinking (10%)** – Workflow clarity, assumptions noted, and thoughtful UX details (if front-end is implemented)

## Optional Bonus

Authentication using JWT is not required but welcome if time allows.

---

## Implemented backend: running and reviewing the solution

The required backend is implemented in the existing `backend/fleet` app. The React frontend is implemented in `frontend/`; No additional runtime dependencies
were needed. SQLite remains the default database, as supplied by the starter project.

### Run locally

Use Python 3.10 or newer supported by Django 5.2; this implementation was verified
with Python 3.14.2 and the pinned requirements.

```bash
cd backend_focused/backend  # from the repository root
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_fleet --vehicles 40 --seed 42
python manage.py runserver 127.0.0.1:8000
```

Open <http://127.0.0.1:8000/api/> for the browsable API. API clients receive JSON by
default. No authentication is required. The seed command appends data and never
clears existing records. Repeating it generates new identifier namespaces while
`--seed` controls the sample names, vehicles, costs and maintenance distributions.
It includes inactive, never-maintained, overdue and recently maintained vehicles.
Each invocation creates three offices and five mechanics; `--vehicles` must be positive.
The entire batch rolls back if generation fails.

Development settings are configurable through `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`
(`true`/`false`) and comma-separated `DJANGO_ALLOWED_HOSTS`. Defaults are for local
development. CORS allows the starter frontend at localhost or 127.0.0.1 on port 3000.
Do not expose this deliberately unauthenticated challenge API publicly with real data.

### Tests and checks

```bash
cd backend_focused/backend  # from the repository root; activate the virtualenv above
python -W error manage.py test
python manage.py check
python manage.py makemigrations --check --dry-run
```

Tests use a separate temporary database. They cover resource CRUD, meaningful
validation errors, database constraints, uniqueness race handling, protected
deletions, search combinations, date boundaries, leap day, reporting totals,
reassignment, pagination and seed rollback. Query-count tests enforce two queries
for vehicle detail with 301 maintenance records, two for each paginated report,
and three for paginated per-vehicle history. There is no repository-provided
Python lint/type-check configuration.

The implementation was also checked with Ruff's formatter and lint rules
`E4,E7,E9,F,I` (including import ordering). Ruff was used as a development tool,
not added to the application's runtime requirements.

### API contract

All paths below are relative to `/api/` and have trailing slashes.

| Method | Path | Behavior |
| --- | --- | --- |
| GET, POST | `offices/`, `vehicles/`, `mechanics/`, `maintenance-records/` | List or create a resource |
| GET, PUT, PATCH, DELETE | `<resource>/<id>/` | Retrieve, replace, partially update or delete |
| GET | `offices/summary/` | Office identity, active vehicle count, last-12-month cost and latest maintenance date |
| GET | `vehicles/` | Vehicle search through any combination of query parameters below |
| GET | `vehicles/<id>/` | Vehicle with nested office and complete `maintenance_records`, each with nested mechanic |
| GET | `vehicles/<id>/maintenance-history/` | Paginated history, newest first, each with nested mechanic |
| POST | `vehicles/<id>/assign-office/` | Body: `{"office": 2}`; updates the office only and returns the vehicle |
| GET | `mechanics/workload/` | `id`, `name`, `maintenance_count`, `total_maintenance_cost`, busiest first |
| GET | `vehicles/needing-maintenance/` | Active never-maintained/overdue vehicles with `last_maintenance` |
| GET | `vehicles/duplicate-check/` | VIN/plate conflict preflight; returns `{"conflicts": [...]}` |

Collection responses use DRF pagination, including reports and nested history:
`{"count": 40, "next": "...", "previous": null, "results": [...]}`.
Use `?page=2` to advance; pages contain 10 rows. The vehicle detail endpoint deliberately
includes **all** maintenance records to meet the specification. Decimal costs are
JSON strings (for example `"125.50"`) to preserve decimal precision. Ordinary CRUD
write bodies use foreign-key IDs for `office`, `vehicle` and `mechanic`.

Vehicle search accepts:

| Parameter | Meaning |
| --- | --- |
| `office` | Positive office ID |
| `active` | `true` or `false`; omitted means both |
| `make`, `model` | Case-insensitive exact matches |
| `maintenance_date_from`, `maintenance_date_to` | Inclusive ISO dates (`YYYY-MM-DD`); either bound may be omitted |
| `mechanic_certification_number` | Case-normalized exact certification match |

Date and mechanic predicates must match the **same** maintenance record. Vehicles
appear once even when multiple records match. Malformed dates, invalid booleans
and reversed ranges return 400. A well-formed nonexistent office filter returns
an empty list. Unrecognized query parameters are ignored.

Duplicate checking requires `vin` and `license_plate`, with optional `active`
(default `true`) and `exclude_id` for editing an existing vehicle. VIN conflicts
include inactive vehicles. Plate conflicts exist only when both the proposed
vehicle and an existing vehicle are active. This endpoint is advisory: constraints
on the actual create/update enforce correctness under concurrent writes.

```bash
curl 'http://127.0.0.1:8000/api/offices/summary/'
curl 'http://127.0.0.1:8000/api/vehicles/?active=true&make=Ford'
curl 'http://127.0.0.1:8000/api/vehicles/?maintenance_date_from=2026-01-01&maintenance_date_to=2026-09-26'
curl 'http://127.0.0.1:8000/api/vehicles/1/'
curl 'http://127.0.0.1:8000/api/vehicles/1/maintenance-history/'
curl -X POST 'http://127.0.0.1:8000/api/vehicles/1/assign-office/' \
  -H 'Content-Type: application/json' -d '{"office": 2}'
curl 'http://127.0.0.1:8000/api/vehicles/needing-maintenance/'
curl 'http://127.0.0.1:8000/api/mechanics/workload/'
curl 'http://127.0.0.1:8000/api/vehicles/duplicate-check/?vin=1HGCM82633A004352&license_plate=ABC-123'
```

IDs in these examples assume a freshly seeded database. To create a vehicle:

```bash
curl -X POST 'http://127.0.0.1:8000/api/vehicles/' \
  -H 'Content-Type: application/json' \
  -d '{"vin":"1HGCM82633A004352","license_plate":"ABC-123","make":"Honda","model":"Accord","year":2020,"office":1,"active":true}'
```

### Assumptions and tradeoffs

- VINs use 17 ASCII letters/digits excluding I, O and Q; no regional checksum
  validation. VIN, plate and certification inputs are trimmed and uppercased by
  the API. Direct ORM/import callers must also supply canonical identifiers;
  database uniqueness applies to stored values, not case-insensitive expressions.
- Certification numbers are unique. Maintenance type is required free text;
  no unsupported list of allowed service types is invented. Notes may be blank.
- Maintenance records represent completed work: no future dates and no negative
  costs. Zero is allowed. All amounts use one company currency with two decimal
  places; multi-currency conversion is outside scope. SQLite is convenient for
  review but does not provide PostgreSQL's native exact decimal storage/aggregation.
- Vehicle year is between 1886 and the current year plus one. Active flags default
  to true. Inactive vehicles and mechanics may have historical records entered.
- Reporting uses UTC's current date. Last 12 months means the same calendar date
  in the previous year through today, inclusive; February 29 clamps to February 28.
  Current-year workload means January 1 through today. Due maintenance uses a
  strict **more than 365 days** comparison, regardless of calendar-year length.
- Never-maintained vehicles come first, followed by oldest last-maintenance date.
  Workload sorts by record count descending, not cost. IDs break ties consistently.
  Maintenance history uses date descending, then ID descending.
- Reports include every office/mechanic across pages, including empty and inactive
  entities. Office maintenance totals include inactive vehicles. Empty totals are
  `"0.00"`; a missing last-maintenance date is `null`.
- Assignment stores only the current office. Moving a vehicle moves attribution
  of all its maintenance into the new office's summary; there is no historical
  office snapshot or assignment audit table.
- Related records block deletion with 409: offices with vehicles, and vehicles or
  mechanics with maintenance records. Maintenance records themselves can be
  deleted. This preserves history against accidental parent deletion while
  retaining the requested CRUD operations; use inactive flags when appropriate.
- Expected validation failures return 400 with field messages; absent URL resources
  return 404; known database uniqueness races and protected deletes return 409.
  Creation returns 201, updates 200, successful deletion 204. Unexpected database
  errors are not disguised as validation errors.
- Database uniqueness is the concurrency guarantee. Ordinary edits are last-write-wins;
  there is no version/ETag conflict detection. Office assignment uses a single-column
  update inside a transaction. SQLite serializes writes and can report lock errors
  under contention; PostgreSQL and backend-specific concurrency tests would precede
  a multi-instance production deployment.
- DRF ModelViewSets handle CRUD; serializers validate and represent data; a small
  `queries.py` holds reusable search/report queries. No repository/service framework,
  Celery, cache or extra infrastructure is warranted for these synchronous operations.
- Vehicle detail avoids N+1 queries, but complete history still has linear response
  size and memory cost. The separate paginated history endpoint is the scalable
  client workflow. Office totals use a single relationship chain with a distinct
  vehicle count; summing distinct costs would incorrectly drop equal-priced services.


## Implemented frontend

See [frontend/README.md](frontend/README.md) for setup, architecture, browser tests
and tradeoffs. The UI includes vehicle search, CRUD for all four resources,
vehicle details, office moves and the maintenance-due workflow.

```bash
cd backend_focused/frontend  # from the repository root
npm ci
npm run dev
```

Open <http://localhost:3000> with Django running on port 8000.

Frontend checks: `npm run typecheck`, `npm run lint`, `npm run format`,
`npm run build`, and `npm run test:e2e` (install Chromium first with
`npx playwright install chromium`). Browser tests start an isolated Django database.

A short [frontend demonstration](docs/fleet-demo.webm) is included. It shows the
frontend working end-to-end with the real Django API on disposable sample data.
Regenerate it with `npm run demo` from `frontend/`.
