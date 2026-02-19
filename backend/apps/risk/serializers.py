from rest_framework import serializers
from .models import (
    RiskAssessment,
    RiskAssessmentImage,
    RiskReport,
    WorkerRecommendation,
)

# =========================
# Common / Media
# =========================

class SasIssueResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField()
    blob_name = serializers.CharField()
    url = serializers.JSONField()


# =========================
# Assessment 실행 응답
# =========================

class RiskAssessResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField()
    assessment_id = serializers.IntegerField()
    result_urls = serializers.DictField(
        child=serializers.CharField(),
        required=False,
    )


# =========================
# RiskAssessmentImage
# =========================

class RiskAssessmentImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = RiskAssessmentImage
        fields = [
            "id",
            "blob_name",
            "created_at",
        ]


# =========================
# Admin Report (조회용)
# =========================

class AdminReportInnerSerializer(serializers.Serializer):
    scene_summary = serializers.JSONField()
    hazards = serializers.JSONField()
    overall = serializers.JSONField()
    version = serializers.CharField()


class AdminReportResponseSerializer(serializers.Serializer):
    assessment_id = serializers.IntegerField()
    site_label = serializers.CharField()
    status = serializers.CharField()

    images = RiskAssessmentImageSerializer(many=True)

    report = AdminReportInnerSerializer()

    generated_at = serializers.DateTimeField()


# =========================
# Worker Recommendation (조회용)
# =========================

class WorkerResponseSerializer(serializers.Serializer):
    assessment_id = serializers.IntegerField()
    status = serializers.CharField()

    images = RiskAssessmentImageSerializer(many=True)

    short_message = serializers.CharField()
    top_risks = serializers.JSONField()
    immediate_actions = serializers.JSONField()

    generated_at = serializers.DateTimeField()


# =========================
# Assessment 존재 여부
# =========================

class AssessmentExistenceResponseSerializer(serializers.Serializer):
    exists = serializers.BooleanField()
    assessment_id = serializers.IntegerField(required=False)
    created_at = serializers.DateTimeField(required=False)


# =========================
# Assessment 생성
# =========================

class AssessmentCreationResponseSerializer(serializers.Serializer):
    assessment_id = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    message = serializers.CharField()


class ErrorAssessmentCreationResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()


# =========================
# Error
# =========================

class ErrorResponseSerializer(serializers.Serializer):
    error = serializers.CharField()
    type = serializers.CharField(required=False)
