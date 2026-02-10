from django.urls import path
from .views import IssueUploadSASView, IssueDownloadSASView

urlpatterns = [
    path("sas/upload/", IssueUploadSASView.as_view()),
    path("sas/download/", IssueDownloadSASView.as_view()),
]
