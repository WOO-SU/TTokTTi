from django.db import models
from django.conf import settings

class Compliance(models.Model):

    class CategoryChoices(models.TextChoices):
        HELMET = "HELMET", "Helmet"
        VEST = "VEST", "Vest"
        SHOES = "SHOES", "Shoes"

    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="compliances"
    )

    worksession = models.ForeignKey(
        "worksession.WorkSession",
        on_delete=models.CASCADE,
        related_name="compliances"
    )

    category = models.CharField(
        max_length=10,
        choices=CategoryChoices.choices
    )

    is_complied = models.BooleanField(
        null=True,
        default=None
    )

    original_image = models.CharField(
        max_length=255,
        null=True,
        blank=True
    )

    detected_image = models.CharField(
        max_length=255,
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "compliance"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Compliance({self.employee_id}, {self.category})"

class Photo(models.Model):

    class StatusChoices(models.TextChoices):
        BEFORE = "BEFORE", "Before"
        AFTER = "AFTER", "After"

    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="photos"
    )

    worksession = models.ForeignKey(
        "worksession.WorkSession",
        on_delete=models.CASCADE,
        related_name="photos"
    )

    status = models.CharField(
        max_length=10,
        choices=StatusChoices.choices
    )

    image_path = models.CharField(
        max_length=255
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "photo"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Photo({self.employee_id}, {self.status})"
