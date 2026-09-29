from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenBlacklistView,
    TokenObtainPairView,
    TokenRefreshView,
)

from fleet.views import (
    CurrentUserView,
    MaintenanceRecordViewSet,
    MechanicViewSet,
    OfficeViewSet,
    VehicleViewSet,
)

router = DefaultRouter()
router.register("offices", OfficeViewSet)
router.register("vehicles", VehicleViewSet)
router.register("mechanics", MechanicViewSet)
router.register("maintenance-records", MaintenanceRecordViewSet)

auth_urls = [
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("logout/", TokenBlacklistView.as_view(), name="logout"),
    path("me/", CurrentUserView.as_view(), name="current_user"),
]

urlpatterns = [
    path("api/auth/", include(auth_urls)),
    path("api/", include(router.urls)),
    path("api-auth/", include("rest_framework.urls")),
]
