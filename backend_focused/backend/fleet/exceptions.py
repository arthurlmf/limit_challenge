from django.db import IntegrityError
from django.db.models.deletion import ProtectedError
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


def exception_handler(exc, context):
    if isinstance(exc, ProtectedError):
        return Response(
            {"detail": "Cannot delete this resource while related records exist."},
            status=409,
        )
    if isinstance(exc, IntegrityError):
        # Handle only known uniqueness races; unexpected database failures must remain visible.
        message = str(exc)
        constraints = {
            "fleet_vehicle.vin": "vin",
            "fleet_vehicle_vin_key": "vin",
            "fleet_vehicle.license_plate": "license_plate",
            "unique_active_vehicle_plate": "license_plate",
            "fleet_mechanic.certification_number": "certification_number",
            "fleet_mechanic_certification_number_key": "certification_number",
        }
        for constraint, field in constraints.items():
            if constraint in message and "unique" in message.lower():
                return Response(
                    {field: ["A concurrent write conflicts with an existing record."]},
                    status=409,
                )
    return drf_exception_handler(exc, context)
