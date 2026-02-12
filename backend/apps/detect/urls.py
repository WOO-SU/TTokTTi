from django.urls import path
from .views import save_video, search_video, log_risky_video
app_name = "detect"

urlpatterns = [
    path("save/", check_update, name="check_update"), 
    path("search/", upload_result, name="upload_result"),
]