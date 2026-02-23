from django.db import models

class PostWorkReport(models.Model):
    worksession_id = models.IntegerField(db_index=True)

    report_version = models.PositiveIntegerField()  # 1,2,3...
    input_snapshot = models.JSONField()
    report_snapshot = models.JSONField()

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "postwork_reports"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["worksession_id", "-report_version"]),
        ]
        unique_together = ("worksession_id", "report_version")

    def __str__(self):
        return f"PostWorkReport(ws={self.worksession_id}, v={self.report_version})"