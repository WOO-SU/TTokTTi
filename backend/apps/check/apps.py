from django.apps import AppConfig


class CheckConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField' # Add this line
    name = 'apps.check'
