from django.contrib import admin
from django.contrib.auth import get_user_model

User = get_user_model()

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("id", "user_name", "is_active", "is_staff")
    search_fields = ("user_name",)
    ordering = ("id",)