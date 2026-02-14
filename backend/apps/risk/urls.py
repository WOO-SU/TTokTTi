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
]
