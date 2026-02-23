from django.urls import path
from .views import *
app_name = "detect"

urlpatterns = [
    path("save/", save_video, name="save_video"), 
    path("search/", search_video, name="search_video"),
    path("bodycam/", bodycam_risk, name="bodycam_risk")
    path("admin/logs/", check_logs, name="check_logs"),
    path("admin/request/<int:videolog_id>/", auto_check, name="auto_manual_check"),
]