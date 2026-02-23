from django.urls import path
from .views import *

app_name = "check"

urlpatterns = [
    path("update/", check_update, name="check_update"),
    path("upload/", upload_result, name="upload_result"),
    path("start/", request_detection, name="request_detection"),
    path("target/", target_photo, name="target_photo"),
    path("request/", request_check, name="request_check"),
    path("approve/", approve_check, name="approve_check"),
    path("pass/<int:worksession_id>/", check_pass, name="check_pass"),
    path("admin/request/<int:videolog_id>/", manual_check, name="manual_check"),
]