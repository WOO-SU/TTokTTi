from rest_framework import permissions
from django.conf import settings

class IsJetson(permissions.BasePermission):
    """
    Allow access if the request contains the correct JETSON_API_KEY in headers.
    """
    def has_permission(self, request, view):
        api_key = request.headers.get("X-JETSON-API-KEY")
        return api_key == settings.JETSON_API_KEY