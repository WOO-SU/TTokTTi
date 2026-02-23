from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.conf import settings

from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager


class UserManager(BaseUserManager):

    def create_user(self, username: str, password: str | None = None, **extra_fields):
        if not username:
            raise ValueError("username is required")

        user = self.model(username=username, **extra_fields)
        if password:
            user.set_password(password)  # 해시 저장
        else:
            user.set_unusable_password()

        user.save(using=self._db)
        return user

    def create_superuser(self, username: str, password: str | None = None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_manager", True)

        return self.create_user(username=username, password=password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):

    class SexChoices(models.TextChoices):
        MALE = "M", "Male"
        FEMALE = "F", "Female"

    username = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=50)

    phone = models.CharField(max_length=20, null=True, blank=True)
    address = models.CharField(max_length=255, null=True, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    photo = models.CharField(max_length=255, null=True, blank=True)

    sex = models.CharField(
        max_length=1,
        choices=SexChoices.choices
    )

    is_manager = models.BooleanField(default=False)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["name", "sex"]

    def __str__(self):
        return self.username