from django.urls import path
from .views import upload_result, check_update, request_detection

app_name = "detect"

urlpatterns = [
    path("save/", check_update, name="check_update"),
    path("search/", upload_result, name="upload_result"),
]