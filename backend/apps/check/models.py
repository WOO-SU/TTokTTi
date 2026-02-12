from django.db import models
from django.conf import settings

class Compliance(models.Model):
    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='compliance'
    )

    is_complied = models.BooleanField(null=False, default=False)
    target = models.CharField(max_length=50, null=False)
    # helmet, glove, safety_shoes, safety_vest
    original_image = models.CharField(max_length=200, null=True, blank=True)
    detected_image = models.CharField(max_length=200, null=True, blank=True)
    is_updated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)  
    updated_at = models.DateTimeField(auto_now=True)      

    def __str__(self):
        return f"Compliance({self.employee_id}, target={self.target}, complied={self.is_complied})"

    class Meta:
        db_table = 'compliance'
        ordering = ['-created_at']
