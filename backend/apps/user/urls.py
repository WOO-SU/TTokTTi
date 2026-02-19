from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LoginView,
    logout,
    change_password,
    UserManageViewSet,
)

app_name = "user"

router = DefaultRouter()
router.register(r"user", UserManageViewSet, basename="users")

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(), name="refresh"),
    path("logout/", logout, name="logout"),
    path("password/change/", change_password, name="password_change"),
    path("storage/", include("apps.user.storage.urls")),
    path("", include(router.urls)),
]