from django.db import models
from django.conf import settings

# Create your models here.
class Video(models.Model):
    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='video'
    )

    is_risky = models.BooleanField(null=False, default=False)
    original_video = models.CharField(max_length=200, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)  
    updated_at = models.DateTimeField(auto_now=True) 

    def __str__(self):
        return f"Videolog({self.employee_id}, is_risky={self.is_risky})"

    class Meta:
        db_table = 'video'
        ordering = ['-created_at']
