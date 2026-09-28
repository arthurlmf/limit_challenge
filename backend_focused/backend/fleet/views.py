from django.db import transaction
from django.db.models import Prefetch
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import MaintenanceRecord, Mechanic, Office, Vehicle
from .queries import (
    mechanic_workload,
    office_summary,
    search_vehicles,
    vehicles_needing_maintenance,
)
from .serializers import (
    AssignVehicleSerializer,
    DuplicateCheckSerializer,
    MaintenanceHistorySerializer,
    MaintenanceRecordSerializer,
    MechanicSerializer,
    MechanicWorkloadSerializer,
    OfficeSerializer,
    OfficeSummarySerializer,
    VehicleDetailSerializer,
    VehicleDueSerializer,
    VehicleSearchSerializer,
    VehicleSerializer,
    vehicle_conflicts,
)


class CRUDViewSet(viewsets.ModelViewSet):
    @transaction.atomic
    def perform_create(self, serializer):
        serializer.save()

    @transaction.atomic
    def perform_update(self, serializer):
        serializer.save()

    def collection_response(self, queryset, serializer_class):
        page = self.paginate_queryset(queryset)
        if page is not None:
            return self.get_paginated_response(serializer_class(page, many=True).data)
        return Response(serializer_class(queryset, many=True).data)


class OfficeViewSet(CRUDViewSet):
    queryset = Office.objects.all()
    serializer_class = OfficeSerializer

    @action(detail=False, methods=["get"])
    def summary(self, request):
        return self.collection_response(office_summary(), OfficeSummarySerializer)


class MechanicViewSet(CRUDViewSet):
    queryset = Mechanic.objects.all()
    serializer_class = MechanicSerializer

    @action(detail=False, methods=["get"])
    def workload(self, request):
        return self.collection_response(mechanic_workload(), MechanicWorkloadSerializer)


class MaintenanceRecordViewSet(CRUDViewSet):
    queryset = MaintenanceRecord.objects.all()
    serializer_class = MaintenanceRecordSerializer


class VehicleViewSet(CRUDViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == "list":
            parameters = VehicleSearchSerializer(
                data=dict(self.request.query_params.items())
            )
            parameters.is_valid(raise_exception=True)
            return search_vehicles(queryset, parameters.validated_data)
        if self.action == "retrieve":
            return queryset.select_related("office").prefetch_related(
                Prefetch(
                    "maintenance_records",
                    queryset=MaintenanceRecord.objects.select_related("mechanic"),
                )
            )
        return queryset

    def get_serializer_class(self):
        if self.action == "retrieve":
            return VehicleDetailSerializer
        return super().get_serializer_class()

    @action(detail=True, methods=["get"], url_path="maintenance-history")
    def maintenance_history(self, request, pk=None):
        vehicle = self.get_object()
        history = vehicle.maintenance_records.select_related("mechanic")
        return self.collection_response(history, MaintenanceHistorySerializer)

    @action(detail=True, methods=["post"], url_path="assign-office")
    @transaction.atomic
    def assign_office(self, request, pk=None):
        vehicle = self.get_object()
        serializer = AssignVehicleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # A single-column UPDATE avoids overwriting unrelated concurrent vehicle edits.
        updated = Vehicle.objects.filter(pk=vehicle.pk).update(
            office=serializer.validated_data["office"]
        )
        if not updated:
            return Response(
                {"detail": "Vehicle no longer exists."},
                status=status.HTTP_404_NOT_FOUND,
            )
        vehicle.refresh_from_db()
        return Response(VehicleSerializer(vehicle).data)

    @action(detail=False, methods=["get"], url_path="needing-maintenance")
    def needing_maintenance(self, request):
        return self.collection_response(
            vehicles_needing_maintenance(), VehicleDueSerializer
        )

    @action(detail=False, methods=["get"], url_path="duplicate-check")
    def duplicate_check(self, request):
        serializer = DuplicateCheckSerializer(data=dict(request.query_params.items()))
        serializer.is_valid(raise_exception=True)
        return Response({"conflicts": vehicle_conflicts(**serializer.validated_data)})
