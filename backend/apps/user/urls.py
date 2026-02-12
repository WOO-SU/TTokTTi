from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from .views import LoginView, logout, change_password, coworker, search_user_by_birth

app_name = "user"

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(), name="refresh"),
    path("logout/", logout, name="logout"),
    path("password/change/", change_password, name="password_change"),
    path("storage/", include("apps.user.storage.urls")),
    path("coworker/", coworker, name="coworker"),
    path("search/", search_user_by_birth, name="search_user_by_birth"),
]