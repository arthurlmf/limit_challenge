# API reference

[Setup and tests](../README.md)


All paths below are relative to `/api/` and have trailing slashes.

## Authentication

Every endpoint except `auth/token/`, `auth/token/refresh/` and `auth/logout/` requires
`Authorization: Bearer <access token>`. Requests without a valid token return 401.

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| POST | `auth/token/` | `{"username", "password"}` | `{"access", "refresh"}`; wrong credentials return 401 |
| POST | `auth/token/refresh/` | `{"refresh"}` | New `{"access", "refresh"}`; the old refresh token is revoked |
| POST | `auth/logout/` | `{"refresh"}` | 200; the refresh token is revoked |
| GET | `auth/me/` | none | `{"id", "username"}` of the signed-in user |

Access tokens expire after 15 minutes and refresh tokens after one day. Each refresh
token works once. The seeded account is `demo` / `demo-password`.

```bash
TOKEN=$(curl -s -X POST 'http://127.0.0.1:8000/api/auth/token/' \
  -H 'Content-Type: application/json' \
  -d '{"username":"demo","password":"demo-password"}' | python3 -c 'import json,sys; print(json.load(sys.stdin)["access"])')
AUTH="Authorization: Bearer $TOKEN"
```

The examples below send `-H "$AUTH"`.

## Endpoints

| Method | Path | Behavior |
| --- | --- | --- |
| GET, POST | `offices/`, `vehicles/`, `mechanics/`, `maintenance-records/` | List or create a resource |
| GET, PUT, PATCH, DELETE | `<resource>/<id>/` | Retrieve, replace, partially update or delete |
| GET | `offices/summary/` | Office identity, active vehicle count, last-12-month cost and latest maintenance date |
| GET | `vehicles/` | Vehicle search through any combination of query parameters below |
| GET | `vehicles/<id>/` | Vehicle with nested office and complete `maintenance_records`, each with nested mechanic |
| GET | `vehicles/<id>/maintenance-history/` | Paginated history, newest first, each with nested mechanic |
| POST | `vehicles/<id>/assign-office/` | Body: `{"office": 2}`; updates the office only and returns the vehicle. Assigning the current office returns 400 |
| GET | `mechanics/workload/` | `id`, `name`, `maintenance_count`, `total_maintenance_cost`, busiest first |
| GET | `vehicles/needing-maintenance/` | Active never-maintained/overdue vehicles with `last_maintenance` |
| GET | `vehicles/duplicate-check/` | VIN/plate conflict preflight; returns `{"conflicts": [...]}` |

Resource lists, vehicle search, maintenance history and maintenance due use DRF pagination:
`{"count": 40, "next": "...", "previous": null, "results": [...]}`.
Use `?page=2` to advance; pages contain 10 rows. The office summary and mechanic workload
return plain arrays with one row per office or mechanic. The vehicle detail endpoint deliberately
includes **all** maintenance records to meet the specification. Decimal costs are
JSON strings (for example `"125.50"`) to preserve decimal precision. Ordinary CRUD
write bodies use foreign-key IDs for `office`, `vehicle` and `mechanic`.

Vehicle search accepts:

| Parameter | Meaning |
| --- | --- |
| `office` | Positive office ID |
| `active` | `true` or `false`; omitted means both |
| `make`, `model` | Case-insensitive partial matches (`ford` matches `Ford`, `sprint` matches `Sprinter`) |
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
curl -H "$AUTH" 'http://127.0.0.1:8000/api/offices/summary/'
curl -H "$AUTH" 'http://127.0.0.1:8000/api/vehicles/?active=true&make=Ford'
curl -H "$AUTH" 'http://127.0.0.1:8000/api/vehicles/?maintenance_date_from=2026-01-01&maintenance_date_to=2026-09-26'
curl -H "$AUTH" 'http://127.0.0.1:8000/api/vehicles/1/'
curl -H "$AUTH" 'http://127.0.0.1:8000/api/vehicles/1/maintenance-history/'
curl -H "$AUTH" -X POST 'http://127.0.0.1:8000/api/vehicles/1/assign-office/' \
  -H 'Content-Type: application/json' -d '{"office": 2}'
curl -H "$AUTH" 'http://127.0.0.1:8000/api/vehicles/needing-maintenance/'
curl -H "$AUTH" 'http://127.0.0.1:8000/api/mechanics/workload/'
curl -H "$AUTH" 'http://127.0.0.1:8000/api/vehicles/duplicate-check/?vin=1HGCM82633A004352&license_plate=ABC-123'
```

IDs in these examples assume a freshly seeded database. To create a vehicle:

```bash
curl -H "$AUTH" -X POST 'http://127.0.0.1:8000/api/vehicles/' \
  -H 'Content-Type: application/json' \
  -d '{"vin":"1HGCM82633A004352","license_plate":"ABC-123","make":"Honda","model":"Accord","year":2020,"office":1,"active":true}'
```

## Validation

VINs must contain 17 ASCII letters or digits, excluding I, O and Q. The API trims
and uppercases VINs, plates and certification numbers. Certification numbers are
unique. Direct ORM imports must supply normalized identifiers themselves.

Vehicle years range from 1886 to next year. Active flags default to true.
Maintenance type is free text; notes may be blank. Maintenance dates cannot be in
the future, and costs must be nonnegative with at most two decimal places.
Inactive vehicles and mechanics may still have historical maintenance entered.
All costs use one company currency; the API does not specify its code.

## Reporting conventions

- Dates use UTC. Office spending covers the same calendar date last year through
  today, inclusive; February 29 clamps to February 28 in the previous year.
- Mechanic workload covers January 1 through today and sorts by record count,
  descending. It includes inactive mechanics and those with no work.
- Maintenance due uses a strict cutoff of more than 365 days. Never-serviced
  vehicles appear first, followed by the oldest last-maintenance date.
- Office summaries include empty offices and spending on inactive vehicles.
  Empty totals are `"0.00"`; missing maintenance dates are `null`.
- Maintenance history sorts by date descending, then ID descending. Other report
  ties use ID ascending.
- Reassignment stores only the current office. A vehicle's entire maintenance
  history contributes to its current office's summary.

## Responses and deletion

| Status | Meaning |
| --- | --- |
| 200 | Successful read or update |
| 201 | Resource created |
| 204 | Resource deleted |
| 400 | Invalid input, including a duplicate found during validation |
| 401 | Missing, invalid or expired token, or wrong credentials |
| 404 | Resource or requested page not found |
| 409 | Protected deletion or a recognized uniqueness conflict during a write |

Deleting an office with vehicles, or a vehicle/mechanic with maintenance records,
returns 409. Maintenance records themselves can be deleted. Vehicles and mechanics
can be marked inactive to preserve their history.

Validation errors identify the affected fields. For example:

```json
{"vin": ["Another vehicle already uses this value."]}
```
