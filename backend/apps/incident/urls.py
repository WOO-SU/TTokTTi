from django.urls import path
from .views import judge_fall

urlpatterns = [
    path("judge/fall/", judge_fall, name="incident_judge_fall"),
]