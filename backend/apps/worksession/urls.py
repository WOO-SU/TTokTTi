# apps/worksession/urls.py
from django.urls import path
from .views import *

urlpatterns = [
    path("today/", get_today_worksession, name="worksession-get-today"),
    path("activate/", activate_worksession, name="worksession-activate"),
]
