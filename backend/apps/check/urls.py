from django.urls import path
from .views import LoginView

app_name = "check"

urlpatterns = [
    path("update/", LoginView.as_view(), name="login"),
]