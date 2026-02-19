# apps/risk/models.py
from django.db import models
from ..worksession.models import WorkSession
from ..user.models import User
from django.conf import settings

class RiskAssessment(models.Model):

    class StatusChoices(models.TextChoices):
        PENDING = "PENDING", "Pending"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"

    worksession = models.ForeignKey(
        WorkSession,
        on_delete=models.CASCADE,
        related_name="assessments"
    )

    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.PENDING
    )

    site_label = models.CharField(max_length=255) # = worksession.name

    # LLM 전체 결과 저장
    llm_result = models.JSONField()

    overall_grade = models.CharField(max_length=5)
    overall_max_R = models.IntegerField()
    work_permission = models.BooleanField()

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "risk_assessment"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Assessment({self.id}) - {self.status}"

class RiskAssessmentImage(models.Model):
    assessment = models.ForeignKey(RiskAssessment, on_delete=models.CASCADE, related_name="images")
    blob_name = models.CharField(max_length=255, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:        
        db_table = "risk_assessment_images"  # ✅ 추천
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["blob_name"])]
        
    def __str__(self):
        return f"RiskAssessmentImage(assessment_id={self.assessment_id}, blob_name={self.blob_name})"

class RiskReport(models.Model):
    """
    관리자용 위험성 평가 '보고서' 스냅샷
    - 관리자 UI/PDF 출력에 맞춘 구조(원본에서 파생)
    - UI가 바뀌어도 과거 보고서 재현 가능
    """
    assessment = models.OneToOneField(
        RiskAssessment,
        on_delete=models.CASCADE,
        related_name="admin_report",
    )

    report_version = models.CharField(max_length=16, default="v1")

    scene_summary = models.JSONField()  # {"work_environment":..., ...}
    hazards = models.JSONField()        # hazards 5개 전체(list[dict])
    overall = models.JSONField()        # {"overall_max_R":..., ...}

    generated_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "risk_reports"
        ordering = ["-generated_at"]

    def __str__(self) -> str:
        return f"RiskReport(assessment_id={self.assessment_id}, v={self.report_version})"


class WorkerRecommendation(models.Model):
    """
    근로자 앱용 권고/행동 유도 뷰
    - 즉시 행동(체크리스트) 중심
    - 원본에서 파생한 Top-N 위험 + 한 줄 요약 + 즉시조치 목록
    """
    assessment = models.OneToOneField(
        RiskAssessment,
        on_delete=models.CASCADE,
        related_name="worker_recommendation",
    )

    # 예: [{"id":"FALL","risk_R":12,"grade":"High","message":"...","evidence":"..."}]
    top_risks = models.JSONField()

    # 예: ["사다리 점검", "작업 공간 정리", "전선 점검"]
    immediate_actions = models.JSONField()

    # 예: "현재 작업 전 조치가 필요합니다: 사다리 점검, 전선 점검, 작업 공간 정리"
    short_message = models.CharField(max_length=255)

    generated_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "worker_recommendations"
        ordering = ["-generated_at"]

    def __str__(self) -> str:
        return f"WorkerRecommendation(assessment_id={self.assessment_id})"
