# apps/worksession/urls.py
from django.urls import path
from .views import *

urlpatterns = [
    path("today/", get_today_worksession, name="worksession-get-today"),
    path("activate/", issue_sas, name="worksession-issue-sas"),
]
