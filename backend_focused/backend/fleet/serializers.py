import re

from django.utils import timezone
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from .models import MaintenanceRecord, Mechanic, Office, Vehicle


class UppercaseField(serializers.CharField):
    def to_internal_value(self, data):
        return super().to_internal_value(data).upper()


class VINField(UppercaseField):
    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        if not re.fullmatch(r"[A-HJ-NPR-Z0-9]{17}", value):
            self.fail("invalid")
        return value

    default_error_messages = {
        "invalid": "Enter a 17-character VIN using letters and digits, excluding I, O and Q."
    }


class OfficeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Office
        fields = ["id", "name", "city"]


class MechanicSerializer(serializers.ModelSerializer):
    certification_number = UppercaseField(
        max_length=80,
        validators=[UniqueValidator(queryset=Mechanic.objects.all())],
    )

    class Meta:
        model = Mechanic
        fields = ["id", "name", "certification_number", "active"]


def vehicle_conflicts(
    vin: str,
    license_plate: str,
    *,
    active: bool = True,
    exclude_id: int | None = None,
) -> list[str]:
    vehicles = Vehicle.objects.all()
    if exclude_id is not None:
        vehicles = vehicles.exclude(pk=exclude_id)
    conflicts = []
    if vehicles.filter(vin=vin).exists():
        conflicts.append("vin")
    if active and vehicles.filter(license_plate=license_plate, active=True).exists():
        conflicts.append("license_plate")
    return conflicts


class VehicleSerializer(serializers.ModelSerializer):
    vin = VINField(max_length=17)
    license_plate = UppercaseField(max_length=20)

    class Meta:
        model = Vehicle
        fields = [
            "id",
            "vin",
            "license_plate",
            "make",
            "model",
            "year",
            "office",
            "active",
        ]
        # Explicit validation also covers PATCH/reactivation and reports both conflicts.
        validators = []

    def validate_year(self, value):
        if value > timezone.localdate().year + 1:
            raise serializers.ValidationError(
                "Year cannot be more than one year in the future."
            )
        return value

    def validate(self, attrs):
        current = self.instance
        conflicts = vehicle_conflicts(
            attrs.get("vin", current.vin if current else None),
            attrs.get("license_plate", current.license_plate if current else None),
            active=attrs.get("active", current.active if current else True),
            exclude_id=current.pk if current else None,
        )
        if conflicts:
            raise serializers.ValidationError(
                {
                    field: "Another vehicle already uses this value."
                    for field in conflicts
                }
            )
        return attrs


class MaintenanceRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceRecord
        fields = [
            "id",
            "vehicle",
            "mechanic",
            "maintenance_date",
            "maintenance_type",
            "cost",
            "notes",
        ]

    def validate_maintenance_date(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError(
                "Completed maintenance cannot be dated in the future."
            )
        return value


class MaintenanceHistorySerializer(MaintenanceRecordSerializer):
    mechanic = MechanicSerializer(read_only=True)


class VehicleDetailSerializer(VehicleSerializer):
    office = OfficeSerializer(read_only=True)
    maintenance_records = MaintenanceHistorySerializer(many=True, read_only=True)

    class Meta(VehicleSerializer.Meta):
        fields = VehicleSerializer.Meta.fields + ["maintenance_records"]


class VehicleSearchSerializer(serializers.Serializer):
    office = serializers.IntegerField(min_value=1, required=False)
    active = serializers.BooleanField(required=False)
    make = serializers.CharField(max_length=80, required=False)
    model = serializers.CharField(max_length=80, required=False)
    maintenance_date_from = serializers.DateField(required=False)
    maintenance_date_to = serializers.DateField(required=False)
    mechanic_certification_number = UppercaseField(max_length=80, required=False)

    def validate(self, attrs):
        start = attrs.get("maintenance_date_from")
        end = attrs.get("maintenance_date_to")
        if start and end and start > end:
            raise serializers.ValidationError(
                {"maintenance_date_to": "Must be on or after maintenance_date_from."}
            )
        return attrs


class AssignVehicleSerializer(serializers.Serializer):
    office = serializers.PrimaryKeyRelatedField(queryset=Office.objects.all())


class DuplicateCheckSerializer(serializers.Serializer):
    vin = VINField(max_length=17)
    license_plate = UppercaseField(max_length=20)
    active = serializers.BooleanField(default=True)
    exclude_id = serializers.IntegerField(min_value=1, required=False)


class OfficeSummarySerializer(OfficeSerializer):
    active_vehicle_count = serializers.IntegerField(read_only=True)
    maintenance_cost_last_year = serializers.DecimalField(
        max_digits=20, decimal_places=2, read_only=True
    )
    last_maintenance = serializers.DateField(read_only=True, allow_null=True)

    class Meta(OfficeSerializer.Meta):
        fields = OfficeSerializer.Meta.fields + [
            "active_vehicle_count",
            "maintenance_cost_last_year",
            "last_maintenance",
        ]


class MechanicWorkloadSerializer(MechanicSerializer):
    maintenance_count = serializers.IntegerField(read_only=True)
    total_maintenance_cost = serializers.DecimalField(
        max_digits=20, decimal_places=2, read_only=True
    )

    class Meta(MechanicSerializer.Meta):
        fields = ["id", "name", "maintenance_count", "total_maintenance_cost"]


class VehicleDueSerializer(VehicleSerializer):
    last_maintenance = serializers.DateField(read_only=True, allow_null=True)

    class Meta(VehicleSerializer.Meta):
        fields = VehicleSerializer.Meta.fields + ["last_maintenance"]
