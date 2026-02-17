from django.db import models
from django.conf import settings

class RiskType(models.Model):

    class CameraType(models.TextChoices):
        BODY = "BODY", "Body Cam"
        FULL = "FULL", "Full Cam"

    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=255, null=True, blank=True)

    camera_type = models.CharField(
        max_length=10,
        choices=CameraType.choices
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "risk_type"
        ordering = ["id"]

    def __str__(self):
        return self.name
    
class VideoLog(models.Model):

    worksession = models.ForeignKey(
        "worksession.WorkSession",
        on_delete=models.CASCADE,
        related_name="video_logs"
    )

    risk_type = models.ForeignKey(
        RiskType,
        on_delete=models.CASCADE,
        related_name="video_logs"
    )

    original_video = models.CharField(max_length=255, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "videolog"
        ordering = ["-created_at"]

    def __str__(self):
        return f"VideoLog({self.id})"

class VideoLogRead(models.Model):

    videolog = models.ForeignKey(
        VideoLog,
        on_delete=models.CASCADE,
        related_name="read_status"
    )

    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="video_reads"
    )

    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "videolog_read"
        unique_together = ("videolog", "manager")

    def __str__(self):
        return f"Read({self.manager_id}, {self.videolog_id})"