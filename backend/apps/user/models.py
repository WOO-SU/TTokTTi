from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin

class UserManager(BaseUserManager):
    def create_user(self, user_name: str, password: str | None = None, **extra_fields):
        if not user_name:
            raise ValueError("user_name is required")

        user = self.model(user_name=user_name, **extra_fields)
        if password is not None:
            user.set_password(password)  # password를 해시 저장
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, user_name: str, password: str | None = None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        return self.create_user(user_name=user_name, password=password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    user_name = models.CharField(max_length=150, unique=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = "user_name"
    REQUIRED_FIELDS: list[str] = []

    def __str__(self) -> str:
        return self.user_name