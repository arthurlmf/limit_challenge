import random
import uuid
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from faker import Faker

from fleet.models import MaintenanceRecord, Mechanic, Office, Vehicle


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
        # A fresh namespace makes reruns additive without deleting existing user data.
        namespace = uuid.uuid4().hex[:10].upper()
        offices = [
            Office.objects.create(name=f"{city} Depot", city=city)
            for city in ("New York", "Austin", "Seattle")
        ]
        mechanics = [
            Mechanic.objects.create(
                name=fake.name(),
                certification_number=f"CERT-{namespace}-{i}",
                active=i != 4,
            )
            for i in range(5)
        ]
        today = timezone.localdate()
        records = []
        for i in range(count):
            make, model = rng.choice(
                [("Ford", "Transit"), ("Toyota", "Hilux"), ("Volvo", "FH")]
            )
            vehicle = Vehicle.objects.create(
                vin=f"{namespace}{i:07d}",
                license_plate=f"{namespace}-{i}",
                make=make,
                model=model,
                year=rng.randint(2010, today.year),
                office=offices[i % len(offices)],
                active=i % 5 != 4,
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
                        maintenance_type=rng.choice(
                            ["Inspection", "Oil change", "Brake service"]
                        ),
                        cost=Decimal(rng.randint(5000, 150000)) / 100,
                        notes=fake.sentence(),
                    )
                )
        MaintenanceRecord.objects.bulk_create(records)
        self.stdout.write(
            self.style.SUCCESS(
                f"Created 3 offices, 5 mechanics, {count} vehicles and {len(records)} maintenance records."
            )
        )
