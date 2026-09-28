"""Composable ORM queries for searches and reports; no HTTP concerns."""

import calendar
from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Count, Exists, F, Max, OuterRef, Q, QuerySet, Sum
from django.utils import timezone

from .models import MaintenanceRecord, Mechanic, Office, Vehicle


def search_vehicles(queryset, filters):
    for field in ("office", "active"):
        if field in filters:
            queryset = queryset.filter(**{field: filters[field]})
    for field in ("make", "model"):
        if field in filters:
            queryset = queryset.filter(**{f"{field}__icontains": filters[field]})

    history_filters = {}
    for parameter, lookup in (
        ("maintenance_date_from", "maintenance_date__gte"),
        ("maintenance_date_to", "maintenance_date__lte"),
        ("mechanic_certification_number", "mechanic__certification_number"),
    ):
        if parameter in filters:
            history_filters[lookup] = filters[parameter]
    if history_filters:
        # One EXISTS keeps all predicates on the same record and avoids duplicate vehicles.
        matching_history = MaintenanceRecord.objects.filter(
            vehicle_id=OuterRef("pk"), **history_filters
        )
        queryset = queryset.filter(Exists(matching_history))
    return queryset


def office_summary() -> QuerySet[Office]:
    today = timezone.localdate()
    previous_year = today.year - 1
    start = today.replace(
        year=previous_year,
        day=min(today.day, calendar.monthrange(previous_year, today.month)[1]),
    )
    return Office.objects.annotate(
        active_vehicle_count=Count(
            "vehicles", filter=Q(vehicles__active=True), distinct=True
        ),
        maintenance_cost_last_year=Sum(
            "vehicles__maintenance_records__cost",
            filter=Q(
                vehicles__maintenance_records__maintenance_date__range=(start, today)
            ),
            default=Decimal("0.00"),
        ),
        last_maintenance=Max("vehicles__maintenance_records__maintenance_date"),
    ).order_by("id")


def mechanic_workload() -> QuerySet[Mechanic]:
    today = timezone.localdate()
    current_year = Q(
        maintenance_records__maintenance_date__range=(date(today.year, 1, 1), today)
    )
    return Mechanic.objects.annotate(
        maintenance_count=Count("maintenance_records", filter=current_year),
        total_maintenance_cost=Sum(
            "maintenance_records__cost", filter=current_year, default=Decimal("0.00")
        ),
    ).order_by("-maintenance_count", "id")


def vehicles_needing_maintenance() -> QuerySet[Vehicle]:
    cutoff = timezone.localdate() - timedelta(days=365)
    return (
        Vehicle.objects.filter(active=True)
        .annotate(last_maintenance=Max("maintenance_records__maintenance_date"))
        .filter(Q(last_maintenance__isnull=True) | Q(last_maintenance__lt=cutoff))
        .order_by(F("last_maintenance").asc(nulls_first=True), "id")
    )
