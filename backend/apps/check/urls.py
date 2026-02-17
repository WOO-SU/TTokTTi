from django.urls import path
from .views import upload_result, check_update, request_detection, target_photo

app_name = "check"

urlpatterns = [
    path("update/", check_update, name="check_update"),
    path("upload/", upload_result, name="upload_result"),
    path("start/", request_detection, name="request_detection"),
    path("target/", target_photo, name="target_photo"),
]