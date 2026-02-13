from rest_framework import serializers


# -------------------------
# Common / Media
# -------------------------
class SasIssueRequestSerializer(serializers.Serializer):
    blob_name = serializers.CharField(help_text="Azure Blob에 저장된 파일명")


class SasIssueResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField()
    blob_name = serializers.CharField()
    url = serializers.JSONField(help_text="{'download_url':..., 'expires_at':...}")


# -------------------------
# Assess (blob_name)
# -------------------------
class RiskAssessRequestSerializer(serializers.Serializer):
    blob_name = serializers.CharField(help_text="예: test.png")


class RiskAssessResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField()
    assessment_id = serializers.IntegerField()
    result_urls = serializers.DictField(
        child=serializers.CharField(),
        required=False,
        help_text="선택: {'admin':'/api/risk/admin/{id}','worker':'/api/risk/worker/{id}'}",
    )


# -------------------------
# Assess by URL
# -------------------------
class RiskAssessUrlRequestSerializer(serializers.Serializer):
    image_url = serializers.URLField()
    site_label = serializers.CharField(required=False)


# -------------------------
# Admin Report (nested)
# -------------------------
class ReportHeaderSerializer(serializers.Serializer):
    overall_grade = serializers.CharField()
    overall_risk_score = serializers.IntegerField()
    work_permission = serializers.CharField()


class KeyRiskSerializer(serializers.Serializer):
    type = serializers.CharField()
    risk_grade = serializers.CharField()
    risk_score = serializers.IntegerField()


class ExecutiveSummarySerializer(serializers.Serializer):
    summary_text = serializers.CharField()
    key_risks = KeyRiskSerializer(many=True)


class WorkEnvironmentSerializer(serializers.Serializer):
    environment = serializers.CharField(allow_blank=True, required=False)
    height_or_location = serializers.CharField(allow_blank=True, required=False)
    existing_safety_measures = serializers.ListField(child=serializers.CharField(), required=False)
    items_requiring_verification = serializers.ListField(child=serializers.CharField(), required=False)


class RiskDetailSerializer(serializers.Serializer):
    risk_type = serializers.CharField()
    risk_id = serializers.CharField()
    evidence = serializers.CharField(allow_blank=True, required=False)
    expected_accident = serializers.CharField(allow_blank=True, required=False)
    risk_level = serializers.CharField()
    risk_score = serializers.IntegerField()
    required_actions_before_work = serializers.ListField(child=serializers.CharField(), required=False)
    residual_risk_level = serializers.CharField(required=False, allow_blank=True)
    residual_risk_score = serializers.IntegerField(required=False)


class AdminReportSerializer(serializers.Serializer):
    header = ReportHeaderSerializer()
    executive_summary = ExecutiveSummarySerializer()
    work_environment = WorkEnvironmentSerializer()
    risk_details = RiskDetailSerializer(many=True)
    mandatory_actions_before_work = serializers.ListField(child=serializers.CharField(), required=False)


class AdminReportResponseSerializer(serializers.Serializer):
    assessment_id = serializers.IntegerField()
    blob_path = serializers.CharField()
    site_label = serializers.CharField()
    work_type_fixed = serializers.CharField()

    report = AdminReportSerializer()

    # 아래는 선택(디버깅/감사용으로 같이 내려줄 때)
    scene_summary = serializers.JSONField(required=False)
    hazards = serializers.JSONField(required=False)
    overall = serializers.JSONField(required=False)

    generated_at = serializers.CharField()


# -------------------------
# Worker Message (nested)
# -------------------------
class WorkerStatusSerializer(serializers.Serializer):
    overall_grade = serializers.CharField()
    work_permission = serializers.CharField()


class WorkerMainRiskSerializer(serializers.Serializer):
    type = serializers.CharField()
    what_can_happen = serializers.CharField()


class WorkerMessageSerializer(serializers.Serializer):
    status = WorkerStatusSerializer()
    alert_message = serializers.CharField()
    main_risks = WorkerMainRiskSerializer(many=True)
    action_checklist = serializers.ListField(child=serializers.CharField(), required=False)
    guide_message = serializers.CharField(required=False, allow_blank=True)


class WorkerResponseSerializer(serializers.Serializer):
    assessment_id = serializers.IntegerField()
    blob_path = serializers.CharField()

    message = WorkerMessageSerializer()

    # 선택: 기존 필드 유지 시
    overall_grade = serializers.CharField(required=False)
    work_permission = serializers.CharField(required=False)
    short_message = serializers.CharField(required=False)
    immediate_actions = serializers.JSONField(required=False)
    top_risks = serializers.JSONField(required=False)

    generated_at = serializers.CharField()


# -------------------------
# Error
# -------------------------
class ErrorResponseSerializer(serializers.Serializer):
    error = serializers.CharField()
    type = serializers.CharField(required=False)
