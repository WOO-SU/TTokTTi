# apps/risk/urls.py
from django.urls import path
from apps.risk import views

urlpatterns = [
    path("media/sas", views.issue_read_sas, name="risk-issue-sas"),
    path("assess", views.risk_assess, name="risk-assess"),
    path(
        "admin/<int:assessment_id>",
        views.admin_report_detail,
        name="risk-admin-detail",
    ),
    path(
        "worker/<int:assessment_id>",
        views.worker_recommendation_detail,
        name="risk-worker-detail",
    ),
    path(
        "latest/<int:worksession_id>",
        views.get_assessment_by_session,
        name="risk-latest-assessment",
    ),
    path(
        "start/<int:worksession_id>",
        views.start_assessment_for_session,
        name="risk-start-assessment-session",
    )
]
