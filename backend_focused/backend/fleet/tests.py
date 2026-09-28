from datetime import date, timedelta
from decimal import Decimal
from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import IntegrityError, transaction
from rest_framework.test import APITestCase

from .exceptions import exception_handler
from .models import MaintenanceRecord, Mechanic, Office, Vehicle

TODAY = date(2026, 9, 26)


class FleetAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.office = Office.objects.create(name="Central", city="Austin")
        cls.other_office = Office.objects.create(name="North", city="Seattle")
        cls.mechanic = Mechanic.objects.create(
            name="Ana", certification_number="CERT-1"
        )
        cls.vehicle = Vehicle.objects.create(
            vin="1HGCM82633A004352",
            license_plate="ABC-123",
            make="Honda",
            model="Accord",
            year=2020,
            office=cls.office,
        )

    def setUp(self):
        clock = patch("django.utils.timezone.localdate", return_value=TODAY)
        clock.start()
        self.addCleanup(clock.stop)

    def record(self, *, vehicle=None, mechanic=None, age=0, cost="100.00"):
        return MaintenanceRecord.objects.create(
            vehicle=vehicle or self.vehicle,
            mechanic=mechanic or self.mechanic,
            maintenance_date=TODAY - timedelta(days=age),
            maintenance_type="Inspection",
            cost=Decimal(cost),
        )

    def new_vehicle(self, **overrides):
        values = {
            "vin": "2HGCM82633A004352",
            "license_plate": "DEF-456",
            "make": "Ford",
            "model": "Transit",
            "year": 2022,
            "office": self.other_office,
        }
        values.update(overrides)
        return Vehicle.objects.create(**values)

    def vehicle_payload(self, **overrides):
        values = {
            "vin": "3HGCM82633A004352",
            "license_plate": "NEW-123",
            "make": "Toyota",
            "model": "Hilux",
            "year": 2024,
            "office": self.office.pk,
            "active": True,
        }
        values.update(overrides)
        return values

    def results(self, url, params=None):
        response = self.client.get(url, params or {})
        self.assertEqual(response.status_code, 200, response.data)
        return response.data["results"]

    def report(self, url):
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIsInstance(response.data, list)
        return response.data

    def test_crud_for_all_resources(self):
        cases = [
            ("offices", {"name": "East", "city": "Boston"}, {"city": "Miami"}),
            (
                "mechanics",
                {"name": "Jo", "certification_number": "CERT-2"},
                {"active": False},
            ),
            ("vehicles", self.vehicle_payload(), {"active": False}),
            (
                "maintenance-records",
                {
                    "vehicle": self.vehicle.pk,
                    "mechanic": self.mechanic.pk,
                    "maintenance_date": TODAY.isoformat(),
                    "maintenance_type": "Repair",
                    "cost": "12.34",
                    "notes": "Replaced filter",
                },
                {"notes": "Checked"},
            ),
        ]
        for resource, payload, change in cases:
            with self.subTest(resource=resource):
                url = f"/api/{resource}/"
                created = self.client.post(url, payload, format="json")
                self.assertEqual(created.status_code, 201, created.data)
                detail_url = f"{url}{created.data['id']}/"
                self.assertEqual(self.client.get(detail_url).status_code, 200)
                self.assertTrue(self.results(url))
                updated = self.client.patch(detail_url, change, format="json")
                self.assertEqual(updated.status_code, 200, updated.data)
                for field, value in change.items():
                    self.assertEqual(updated.data[field], value)
                replaced = self.client.put(detail_url, payload, format="json")
                self.assertEqual(replaced.status_code, 200, replaced.data)
                self.assertEqual(self.client.delete(detail_url).status_code, 204)
                self.assertEqual(self.client.get(detail_url).status_code, 404)

    def test_invalid_and_missing_resources(self):
        for resource in ("offices", "vehicles", "mechanics", "maintenance-records"):
            with self.subTest(resource=resource):
                self.assertEqual(
                    self.client.post(
                        f"/api/{resource}/", {}, format="json"
                    ).status_code,
                    400,
                )
                self.assertEqual(
                    self.client.patch(
                        f"/api/{resource}/9999/", {}, format="json"
                    ).status_code,
                    404,
                )
                self.assertEqual(
                    self.client.delete(f"/api/{resource}/9999/").status_code, 404
                )

    def test_vehicle_identifiers_are_normalized(self):
        response = self.client.post(
            "/api/vehicles/",
            self.vehicle_payload(vin=" 3hgcm82633a004352 ", license_plate=" new-123 "),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["vin"], "3HGCM82633A004352")
        self.assertEqual(response.data["license_plate"], "NEW-123")

    def test_vehicle_validation(self):
        invalid = [
            {"vin": "short"},
            {"vin": "IHGCM82633A004352"},
            {"year": 1885},
            {"year": TODAY.year + 2},
            {"office": 9999},
            {"license_plate": " "},
        ]
        for values in invalid:
            with self.subTest(values=values):
                response = self.client.post(
                    "/api/vehicles/", self.vehicle_payload(**values), format="json"
                )
                self.assertEqual(response.status_code, 400, response.data)
                self.assertIn(next(iter(values)), response.data)

    def test_duplicate_vin_and_active_plate_report_both_fields(self):
        response = self.client.post(
            "/api/vehicles/",
            self.vehicle_payload(
                vin=self.vehicle.vin.lower(),
                license_plate=self.vehicle.license_plate.lower(),
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.data), {"vin", "license_plate"})

    def test_inactive_plate_reuse_and_reactivation(self):
        response = self.client.post(
            "/api/vehicles/",
            self.vehicle_payload(
                license_plate=self.vehicle.license_plate, active=False
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        url = f"/api/vehicles/{response.data['id']}/"
        conflict = self.client.patch(url, {"active": True}, format="json")
        self.assertEqual(conflict.status_code, 400)
        self.assertIn("license_plate", conflict.data)
        self.client.patch(
            f"/api/vehicles/{self.vehicle.pk}/", {"active": False}, format="json"
        )
        self.assertEqual(
            self.client.patch(url, {"active": True}, format="json").status_code, 200
        )

    def test_vehicle_can_update_itself_without_uniqueness_errors(self):
        response = self.client.patch(
            f"/api/vehicles/{self.vehicle.pk}/",
            {
                "vin": self.vehicle.vin,
                "license_plate": self.vehicle.license_plate,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)

    def test_certification_unique_and_normalized(self):
        response = self.client.post(
            "/api/mechanics/",
            {
                "name": "Sam",
                "certification_number": "cert-1",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("certification_number", response.data)

    def test_maintenance_validation(self):
        payload = {
            "vehicle": self.vehicle.pk,
            "mechanic": self.mechanic.pk,
            "maintenance_date": TODAY.isoformat(),
            "maintenance_type": "Repair",
            "cost": "0.00",
        }
        for values in (
            {"cost": "-0.01"},
            {"cost": "1.001"},
            {"cost": "10000000000.00"},
            {"maintenance_date": (TODAY + timedelta(days=1)).isoformat()},
            {"maintenance_date": "not-a-date"},
            {"vehicle": 9999},
            {"mechanic": 9999},
        ):
            with self.subTest(values=values):
                response = self.client.post(
                    "/api/maintenance-records/", payload | values, format="json"
                )
                self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(
            self.client.post(
                "/api/maintenance-records/", payload, format="json"
            ).status_code,
            201,
        )

    def test_protected_deletions_preserve_history(self):
        record = self.record()
        for url in (
            f"/api/offices/{self.office.pk}/",
            f"/api/vehicles/{self.vehicle.pk}/",
            f"/api/mechanics/{self.mechanic.pk}/",
        ):
            response = self.client.delete(url)
            self.assertEqual(response.status_code, 409, response.data)
        self.assertTrue(MaintenanceRecord.objects.filter(pk=record.pk).exists())

    def test_database_constraints_without_serializer(self):
        for changes in (
            {"vin": self.vehicle.vin},
            {"license_plate": self.vehicle.license_plate},
            {"year": 1800},
        ):
            with (
                self.subTest(changes=changes),
                self.assertRaises(IntegrityError),
                transaction.atomic(),
            ):
                self.new_vehicle(**changes)
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.record(cost="-1.00")
        inactive = self.new_vehicle(
            active=False, license_plate=self.vehicle.license_plate
        )
        with self.assertRaises(IntegrityError), transaction.atomic():
            Vehicle.objects.filter(pk=inactive.pk).update(active=True)

    def test_unique_race_returns_safe_conflict_response(self):
        # Force a real database violation after successful preflight validation.
        with patch("fleet.serializers.vehicle_conflicts", return_value=[]):
            response = self.client.post(
                "/api/vehicles/",
                self.vehicle_payload(license_plate=self.vehicle.license_plate),
                format="json",
            )
        self.assertEqual(response.status_code, 409, response.data)
        self.assertIn("license_plate", response.data)
        self.assertEqual(Vehicle.objects.count(), 1)

    def test_unrelated_integrity_errors_are_not_hidden(self):
        self.assertIsNone(
            exception_handler(IntegrityError("unexpected database failure"), {})
        )

    def test_search_without_filters_includes_inactive(self):
        inactive = self.new_vehicle(active=False)
        self.assertEqual(
            {row["id"] for row in self.results("/api/vehicles/")},
            {self.vehicle.pk, inactive.pk},
        )

    def test_combined_vehicle_search(self):
        self.new_vehicle()
        self.record(age=10)
        self.record(age=11)
        params = {
            "office": self.office.pk,
            "active": "true",
            "make": "HONDA",
            "model": "accord",
            "maintenance_date_from": (TODAY - timedelta(days=11)).isoformat(),
            "maintenance_date_to": (TODAY - timedelta(days=10)).isoformat(),
            "mechanic_certification_number": "cert-1",
        }
        rows = self.results("/api/vehicles/", params)
        self.assertEqual([row["id"] for row in rows], [self.vehicle.pk])
        params["active"] = "false"
        self.assertEqual(self.results("/api/vehicles/", params), [])

    def test_make_and_model_search_is_partial(self):
        self.new_vehicle()
        rows = self.results("/api/vehicles/", {"make": "hon", "model": "CORD"})
        self.assertEqual([row["id"] for row in rows], [self.vehicle.pk])

    def test_search_predicates_must_match_same_maintenance_record(self):
        other = Mechanic.objects.create(name="Lee", certification_number="CERT-2")
        self.record(age=100, mechanic=self.mechanic)
        self.record(age=1, mechanic=other)
        rows = self.results(
            "/api/vehicles/",
            {
                "maintenance_date_from": (TODAY - timedelta(days=10)).isoformat(),
                "mechanic_certification_number": self.mechanic.certification_number,
            },
        )
        self.assertEqual(rows, [])

    def test_search_open_ended_date_filters_and_exact_boundaries(self):
        self.record(age=1)
        yesterday = (TODAY - timedelta(days=1)).isoformat()
        for params in (
            {"maintenance_date_from": yesterday},
            {"maintenance_date_to": yesterday},
            {"maintenance_date_from": yesterday, "maintenance_date_to": yesterday},
        ):
            self.assertEqual(len(self.results("/api/vehicles/", params)), 1)
        self.assertEqual(
            self.results(
                "/api/vehicles/", {"maintenance_date_from": TODAY.isoformat()}
            ),
            [],
        )

    def test_search_invalid_parameters(self):
        for params in (
            {"active": "maybe"},
            {"office": "abc"},
            {"office": "0"},
            {"maintenance_date_from": "invalid"},
            {
                "maintenance_date_from": "2026-02-02",
                "maintenance_date_to": "2026-02-01",
            },
        ):
            with self.subTest(params=params):
                self.assertEqual(
                    self.client.get("/api/vehicles/", params).status_code, 400
                )

    def test_summary_has_correct_counts_costs_and_empty_offices(self):
        inactive = self.new_vehicle(office=self.office, active=False)
        for cost in ("10.10", "10.10", "20.20"):
            self.record(cost=cost)
        self.record(vehicle=inactive, age=2, cost="5.00")
        self.record(age=365, cost="7.00")
        self.record(age=366, cost="999.00")
        with self.assertNumQueries(1):
            rows = self.report("/api/offices/summary/")
        central, empty = rows
        self.assertEqual(central["active_vehicle_count"], 1)
        self.assertEqual(
            Decimal(central["maintenance_cost_last_year"]), Decimal("52.40")
        )
        self.assertEqual(central["last_maintenance"], TODAY.isoformat())
        self.assertEqual(empty["active_vehicle_count"], 0)
        self.assertEqual(Decimal(empty["maintenance_cost_last_year"]), 0)
        self.assertIsNone(empty["last_maintenance"])

    def test_summary_clamps_leap_day_to_previous_february_end(self):
        record = self.record(cost="5.00")
        record.maintenance_date = date(2023, 2, 28)
        record.save()
        with patch("django.utils.timezone.localdate", return_value=date(2024, 2, 29)):
            rows = self.report("/api/offices/summary/")
        self.assertEqual(
            Decimal(rows[0]["maintenance_cost_last_year"]), Decimal("5.00")
        )

    def test_summary_latest_date_includes_history_older_than_a_year(self):
        old = self.record(age=500)
        row = self.report("/api/offices/summary/")[0]
        self.assertEqual(row["last_maintenance"], old.maintenance_date.isoformat())
        self.assertEqual(Decimal(row["maintenance_cost_last_year"]), 0)

    def test_vehicle_detail_uses_two_queries_for_hundreds_of_records(self):
        url = f"/api/vehicles/{self.vehicle.pk}/"
        self.record()
        with self.assertNumQueries(2):
            response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        MaintenanceRecord.objects.bulk_create(
            [
                MaintenanceRecord(
                    vehicle=self.vehicle,
                    mechanic=self.mechanic,
                    maintenance_date=TODAY,
                    maintenance_type="Inspection",
                    cost="1.00",
                )
                for _ in range(300)
            ]
        )
        with self.assertNumQueries(2):
            response = self.client.get(url)
        self.assertEqual(len(response.data["maintenance_records"]), 301)
        self.assertEqual(response.data["office"]["city"], "Austin")
        self.assertEqual(
            response.data["maintenance_records"][0]["mechanic"]["name"], "Ana"
        )

    def test_history_is_newest_first_and_scoped_to_vehicle(self):
        old = self.record(age=20)
        recent = self.record(age=1)
        same_day = self.record(age=1)
        other = self.new_vehicle()
        self.record(vehicle=other)
        with self.assertNumQueries(3):
            rows = self.results(f"/api/vehicles/{self.vehicle.pk}/maintenance-history/")
        self.assertEqual([row["id"] for row in rows], [same_day.pk, recent.pk, old.pk])
        self.assertEqual(
            self.client.get("/api/vehicles/9999/maintenance-history/").status_code, 404
        )

    def test_assign_office_changes_only_assignment_and_moves_summary(self):
        record = self.record()
        before = Vehicle.objects.values().get(pk=self.vehicle.pk)
        url = f"/api/vehicles/{self.vehicle.pk}/assign-office/"
        response = self.client.post(url, {"office": self.other_office.pk}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["office"], self.other_office.pk)
        after = Vehicle.objects.values().get(pk=self.vehicle.pk)
        self.assertEqual(after, before | {"office_id": self.other_office.pk})
        self.assertEqual(
            MaintenanceRecord.objects.get(pk=record.pk).vehicle_id, self.vehicle.pk
        )
        rows = self.report("/api/offices/summary/")
        self.assertEqual(Decimal(rows[0]["maintenance_cost_last_year"]), 0)
        self.assertEqual(
            Decimal(rows[1]["maintenance_cost_last_year"]), Decimal("100.00")
        )

    def test_assign_office_errors(self):
        url = f"/api/vehicles/{self.vehicle.pk}/assign-office/"
        for payload in ({}, {"office": 9999}, {"office": "bad"}):
            self.assertEqual(
                self.client.post(url, payload, format="json").status_code, 400
            )
        same_office = self.client.post(url, {"office": self.office.pk}, format="json")
        self.assertEqual(same_office.status_code, 400)
        self.assertIn("office", same_office.data)
        self.assertEqual(
            self.client.post(
                "/api/vehicles/9999/assign-office/",
                {
                    "office": self.office.pk,
                },
                format="json",
            ).status_code,
            404,
        )

    def test_mechanic_workload_current_year_and_zero_work(self):
        busy = Mechanic.objects.create(
            name="Busy", certification_number="CERT-2", active=False
        )
        idle = Mechanic.objects.create(name="Idle", certification_number="CERT-3")
        self.record(mechanic=busy, cost="10.00")
        self.record(mechanic=busy, cost="20.00")
        self.record(age=(TODAY - date(TODAY.year, 1, 1)).days, cost="5.00")
        self.record(age=(TODAY - date(TODAY.year - 1, 12, 31)).days, cost="999.00")
        with self.assertNumQueries(1):
            rows = self.report("/api/mechanics/workload/")
        self.assertEqual(
            [row["id"] for row in rows], [busy.pk, self.mechanic.pk, idle.pk]
        )
        self.assertEqual([row["maintenance_count"] for row in rows], [2, 1, 0])
        self.assertEqual(
            [Decimal(row["total_maintenance_cost"]) for row in rows], [30, 5, 0]
        )

    def test_due_vehicles_boundary_never_serviced_and_inactive(self):
        never = self.vehicle
        overdue = self.new_vehicle()
        boundary = self.new_vehicle(vin="3HGCM82633A004352", license_plate="BOUNDARY")
        recent = self.new_vehicle(vin="4HGCM82633A004352", license_plate="RECENT")
        self.new_vehicle(
            vin="5HGCM82633A004352", license_plate="INACTIVE", active=False
        )
        self.record(vehicle=overdue, age=366)
        self.record(vehicle=boundary, age=365)
        self.record(vehicle=recent, age=600)
        self.record(vehicle=recent, age=1)
        with self.assertNumQueries(2):
            rows = self.results("/api/vehicles/needing-maintenance/")
        self.assertEqual([row["id"] for row in rows], [never.pk, overdue.pk])
        self.assertIsNone(rows[0]["last_maintenance"])

    def test_duplicate_check_conflicts_normalization_and_exclusion(self):
        url = "/api/vehicles/duplicate-check/"
        params = {
            "vin": self.vehicle.vin.lower(),
            "license_plate": self.vehicle.license_plate.lower(),
        }
        self.assertEqual(
            self.client.get(url, params).data, {"conflicts": ["vin", "license_plate"]}
        )
        self.assertEqual(
            self.client.get(url, params | {"active": "false"}).data,
            {"conflicts": ["vin"]},
        )
        self.assertEqual(
            self.client.get(url, params | {"exclude_id": self.vehicle.pk}).data,
            {"conflicts": []},
        )
        self.assertEqual(
            self.client.get(url, params | {"vin": "9HGCM82633A004352"}).data,
            {"conflicts": ["license_plate"]},
        )
        self.assertEqual(
            self.client.get(url, params | {"license_plate": "FREE"}).data,
            {"conflicts": ["vin"]},
        )
        self.assertEqual(self.client.get(url).status_code, 400)
        self.assertEqual(
            self.client.get(url, params | {"active": "bad"}).status_code, 400
        )

    def test_collections_are_paginated(self):
        for i in range(12):
            self.record(age=i)
        for url in (
            "/api/maintenance-records/",
            f"/api/vehicles/{self.vehicle.pk}/maintenance-history/",
        ):
            response = self.client.get(url)
            self.assertEqual(response.data["count"], 12)
            self.assertEqual(len(response.data["results"]), 10)
            self.assertIsNotNone(response.data["next"])
            self.assertEqual(len(self.client.get(url, {"page": 2}).data["results"]), 2)

    def test_seed_is_additive_and_covers_useful_scenarios(self):
        initial = Vehicle.objects.count()
        for expected in (initial + 8, initial + 16):
            call_command("seed_fleet", vehicles=8, seed=1, stdout=StringIO())
            self.assertEqual(Vehicle.objects.count(), expected)
        self.assertEqual(Office.objects.count(), 2 + 3)
        self.assertEqual(Vehicle.objects.values("vin").distinct().count(), initial + 16)
        self.assertTrue(Vehicle.objects.filter(active=False).exists())
        self.assertTrue(
            Vehicle.objects.filter(maintenance_records__isnull=True).exists()
        )
        self.assertTrue(
            MaintenanceRecord.objects.filter(
                maintenance_date__lt=TODAY - timedelta(days=365)
            ).exists()
        )
        self.assertTrue(
            MaintenanceRecord.objects.filter(maintenance_date__year=TODAY.year).exists()
        )

    def test_seed_invalid_count_does_not_write(self):
        with self.assertRaises(CommandError):
            call_command("seed_fleet", vehicles=0, stdout=StringIO())
        self.assertEqual(Office.objects.count(), 2)

    def test_seed_failure_rolls_back_whole_batch(self):
        with patch(
            "fleet.management.commands.seed_fleet.Vehicle.objects.create",
            side_effect=RuntimeError("test failure"),
        ):
            with self.assertRaises(RuntimeError):
                call_command("seed_fleet", vehicles=4, stdout=StringIO())
        self.assertEqual(Office.objects.count(), 2)
        self.assertEqual(Mechanic.objects.count(), 1)

    def test_default_response_is_json(self):
        response = self.client.get("/api/vehicles/")
        self.assertEqual(response["Content-Type"], "application/json")
