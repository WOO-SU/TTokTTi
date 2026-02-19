from django.urls import path
from . import views

urlpatterns = [
    path("generate", views.generate_postwork_report, name="reports-generate"),
    path("<int:worksession_id>/latest", views.get_latest_postwork_report, name="reports-latest"),
    path("<int:worksession_id>/versions", views.list_postwork_report_versions, name="reports-versions"),
]