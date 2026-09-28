"""Run the real API against disposable sample data, never the developer database."""
import os
from pathlib import Path
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "server.settings")
from django.conf import settings

with tempfile.TemporaryDirectory(prefix="fleet-browser-tests-") as directory:
    settings.DATABASES["default"]["NAME"] = str(Path(directory) / "test.sqlite3")
    settings.ALLOWED_HOSTS = ["127.0.0.1", "localhost"]
    settings.CORS_ALLOWED_ORIGINS = ["http://127.0.0.1:3100"]
    # Expected 4xx responses would otherwise flood the Playwright output.
    settings.LOGGING = {
        "version": 1,
        "disable_existing_loggers": False,
        "loggers": {
            name: {"level": "ERROR"} for name in ("django.request", "django.server")
        },
    }
    import django
    django.setup()
    from django.core.management import call_command
    call_command("migrate", verbosity=0)
    call_command("seed_fleet", vehicles=12, seed=42)
    call_command("runserver", "127.0.0.1:8011", use_reloader=False)
