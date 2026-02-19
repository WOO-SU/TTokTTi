from django.db import models
from django.conf import settings

class Worksite(models.Model):
    name = models.CharField(max_length=200)
    address = models.CharField(max_length=255)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "worksite"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name
    
class WorkSession(models.Model):

    class StatusChoices(models.TextChoices):
        READY = "READY", "Ready"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        DONE = "DONE", "Done"

    worksite = models.ForeignKey(
        Worksite,
        on_delete=models.CASCADE,
        related_name="sessions"
    )
    name = models.CharField(max_length=200)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField(null=True, blank=True)

    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.READY
    )

    fullcam_video = models.CharField(max_length=255, null=True, blank=True)
    bodycam_video = models.CharField(max_length=255, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "worksession"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Session({self.id}) - {self.status}"

class WorkSessionMember(models.Model):

    class RoleChoices(models.TextChoices):
        HEAD = "HEAD", "Head Manager"
        RELATED = "RELATED", "Related Person"
        WORKER = "WORKER", "Worker"

    worksession = models.ForeignKey(
        WorkSession,
        on_delete=models.CASCADE,
        related_name="members"
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="work_sessions"
    )

    role = models.CharField(
        max_length=10,
        choices=RoleChoices.choices
    )

    class Meta:
        db_table = "worksession_member"
        unique_together = ("worksession", "user")

    def __str__(self):
        return f"{self.user_id} - {self.role}"
