# apps/worksession/urls.py
from django.urls import path
from .views import *

urlpatterns = [
    path("today/", get_today_worksession, name="worksession-get-today"),
    path("activate/", activate_worksession, name="worksession-activate"),
    path("admin/today/", get_admin_today_worksession, name="worksession-get-admin-today"),
    path("summary/<int:worksession_id>/", get_worksession_summary, name="worksession-get-summary"),
]
