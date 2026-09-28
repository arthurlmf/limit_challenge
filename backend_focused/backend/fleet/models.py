from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q


class Office(models.Model):
    name = models.CharField(max_length=120)
    city = models.CharField(max_length=120)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.name


class Vehicle(models.Model):
    vin = models.CharField(max_length=17, unique=True)
    license_plate = models.CharField(max_length=20)
    make = models.CharField(max_length=80)
    model = models.CharField(max_length=80)
    year = models.PositiveSmallIntegerField(validators=[MinValueValidator(1886)])
    office = models.ForeignKey(
        Office, on_delete=models.PROTECT, related_name="vehicles"
    )
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(
                fields=["license_plate"],
                condition=Q(active=True),
                name="unique_active_vehicle_plate",
            ),
            models.CheckConstraint(
                condition=Q(year__gte=1886), name="valid_vehicle_year"
            ),
        ]

    def __str__(self):
        return self.vin


class Mechanic(models.Model):
    name = models.CharField(max_length=120)
    certification_number = models.CharField(max_length=80, unique=True)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.name


class MaintenanceRecord(models.Model):
    vehicle = models.ForeignKey(
        Vehicle, on_delete=models.PROTECT, related_name="maintenance_records"
    )
    mechanic = models.ForeignKey(
        Mechanic, on_delete=models.PROTECT, related_name="maintenance_records"
    )
    maintenance_date = models.DateField()
    maintenance_type = models.CharField(max_length=120)
    cost = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.00"))]
    )
    notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-maintenance_date", "-id"]
        indexes = [
            models.Index(
                fields=["vehicle", "-maintenance_date"], name="vehicle_maintenance_date"
            ),
            models.Index(
                fields=["mechanic", "maintenance_date"],
                name="mechanic_maintenance_date",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(cost__gte=0), name="nonnegative_maintenance_cost"
            )
        ]
