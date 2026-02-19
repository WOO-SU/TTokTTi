# apps/risk/models.py
from django.db import models


class RiskAssessment(models.Model):
    """
    Single Source of Truth (SSOT)
    - 한 번의 평가(이미지 1장 + 작업 고정값)에 대한 '원본' 저장
    - llm_result는 원본 그대로 보관(감사/재현/책임)
    - overall_*는 리스트/필터/정렬을 빠르게 하기 위한 핵심 요약 필드
    """
    blob_path = models.CharField(max_length=255, db_index=True)
    blob_paths = models.JSONField(default=list)  # ✅ 추가: 여러 장 원본 저장
    site_label = models.CharField(max_length=255) # 평가 컨텍스트 고정값
    work_type_fixed = models.CharField(max_length=255) # 작업 내용 

    llm_result = models.JSONField()  # LLM 결과 원본 전체(JSON)

    overall_grade = models.CharField(max_length=16, db_index=True)      # Low/Medium/High/Critical
    overall_max_R = models.IntegerField(db_index=True)                  # 1~25
    work_permission = models.CharField(max_length=32, db_index=True)    # 작업 가능/개선조치 후 작업/조치 전 작업 금지

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "risk_assessments"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["blob_path", "created_at"]),
            models.Index(fields=["overall_grade", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"RiskAssessment(id={self.id}, grade={self.overall_grade}, R={self.overall_max_R})"

class RiskAssessmentImage(models.Model):
    assessment = models.ForeignKey(RiskAssessment, on_delete=models.CASCADE, related_name="images")
    blob_name = models.CharField(max_length=255, db_index=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:        
        db_table = "risk_assessment_images"  # ✅ 추천
        ordering = ["order", "id"]
        indexes = [models.Index(fields=["blob_name"])]
        
    def __str__(self):
        return f"RiskAssessmentImage(assessment_id={self.assessment_id}, order={self.order})"

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
