import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from faker import Faker

from fleet.models import MaintenanceRecord, Mechanic, Office, Vehicle

CITIES = ("New York", "Austin", "Seattle")
MODELS = [
    ("Ford", "Transit"),
    ("Ford", "F-150"),
    ("Toyota", "Hilux"),
    ("Toyota", "Corolla"),
    ("Volvo", "FH"),
    ("Mercedes-Benz", "Sprinter"),
]
MAINTENANCE_TYPES = [
    "Inspection",
    "Oil change",
    "Brake service",
    "Tire rotation",
    "Battery replacement",
]


def unique_value(generate, taken):
    """Draw until the value is unused, so reruns with the same seed stay additive."""
    while True:
        value = generate().upper()
        if value not in taken:
            taken.add(value)
            return value


class Command(BaseCommand):
    help = "Append sample fleet data, including inactive, overdue and never-serviced vehicles."

    def add_arguments(self, parser):
        parser.add_argument("--vehicles", type=int, default=40)
        parser.add_argument("--seed", type=int, default=42)

    @transaction.atomic
    def handle(self, *args, **options):
        count = options["vehicles"]
        if count < 1:
            raise CommandError("--vehicles must be a positive integer.")
        rng = random.Random(options["seed"])
        fake = Faker()
        fake.seed_instance(options["seed"])
        vins = set(Vehicle.objects.values_list("vin", flat=True))
        plates = set(
            Vehicle.objects.filter(active=True).values_list("license_plate", flat=True)
        )
        certifications = set(
            Mechanic.objects.values_list("certification_number", flat=True)
        )

        offices = [
            Office.objects.get_or_create(name=f"{city} Depot", defaults={"city": city})[0]
            for city in CITIES
        ]
        mechanics = [
            Mechanic.objects.create(
                name=fake.name(),
                certification_number=unique_value(
                    lambda: fake.bothify("ASE-########"), certifications
                ),
                active=i != 4,
            )
            for i in range(5)
        ]
        today = timezone.localdate()
        records = []
        for i in range(count):
            make, model = rng.choice(MODELS)
            active = i % 5 != 4
            vehicle = Vehicle.objects.create(
                vin=unique_value(fake.vin, vins),
                license_plate=unique_value(fake.license_plate, plates)
                if active
                else fake.license_plate().upper(),
                make=make,
                model=model,
                year=rng.randint(2010, today.year),
                office=offices[i % len(offices)],
                active=active,
            )
            if i % 4 == 0:
                continue
            for j in range(rng.randint(1, 8)):
                # Deliberately include recently serviced and overdue vehicles.
                age = (400 if i % 4 == 1 else 10) + j * 70
                records.append(
                    MaintenanceRecord(
                        vehicle=vehicle,
                        mechanic=rng.choice(mechanics),
                        maintenance_date=today - timedelta(days=age),
                        maintenance_type=rng.choice(MAINTENANCE_TYPES),
                        cost=Decimal(rng.randint(5000, 150000)) / 100,
                        notes=fake.sentence(),
                    )
                )
        MaintenanceRecord.objects.bulk_create(records)
        self.stdout.write(
            self.style.SUCCESS(
                f"Using {len(offices)} offices; created 5 mechanics, {count} vehicles "
                f"and {len(records)} maintenance records."
            )
        )
