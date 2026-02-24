from rest_framework import serializers
from .models import WorkSession


class WorkSessionListSerializer(serializers.ModelSerializer):

    class Meta:
        model = WorkSession
        fields = [
            "id",
            "name",
            "status",
            "starts_at",
            "ends_at",
        ]

class WorkSessionListResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField()
    count = serializers.IntegerField()
    data = WorkSessionListSerializer(many=True)

class ActivateWorkSessionRequestSerializer(serializers.Serializer):
    worksession_id = serializers.IntegerField()

class ActivateWorkSessionResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField()
    status = serializers.CharField(required=False)
    detail = serializers.CharField(required=False)

class WorkerStatusSerializer(serializers.Serializer): # many=True 로 반환: 근로자마다 묶이는 정보
    employee_id = serializers.IntegerField(source="user.id")
    name = serializers.CharField(source="user.name")
    equipment_check = serializers.BooleanField(source="equipment_check_status")

class WorkSessionCardSerializer(serializers.Serializer): # many=True 로 반환: 세션마다 묶이는 정보
    id = serializers.IntegerField()
    name = serializers.CharField()
    starts_at = serializers.DateTimeField()
    ends_at = serializers.DateTimeField(allow_null=True)
    status = serializers.CharField() # READY, IN_PROGRESS, DONE

    workers_detail = WorkerStatusSerializer(many=True, source="worker_members")

    risk_assessment = serializers.CharField(source="risk_assessment_status")
    report = serializers.BooleanField(source="report_status")

class WorkSessionSimpleSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()

    class Meta:
        ref_name = "WorkSessionSimple"

class RiskReportSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    scene_summary = serializers.JSONField()
    hazards = serializers.JSONField()
    overall = serializers.JSONField()
    generated_at = serializers.DateTimeField()

class WorkerSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()

    class Meta:
        ref_name = "WorkSessionWorker"

class EquipmentCategorySerializer(serializers.Serializer):
    HELMET = serializers.BooleanField(allow_null=True)
    VEST = serializers.BooleanField(allow_null=True)
    SHOES = serializers.BooleanField(allow_null=True)

class EquipmentCheckSerializer(serializers.Serializer):
    worker = WorkerSerializer()
    checks = EquipmentCategorySerializer()

class AutoLogSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    risk_type = serializers.CharField()
    video_path = serializers.CharField()
    created_at = serializers.DateTimeField()

class PhotoSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    type = serializers.CharField()
    image = serializers.CharField()

class WorkSessionSummarySerializer(serializers.Serializer):
    worksession = WorkSessionSimpleSerializer()
    risk_report = RiskReportSerializer(allow_null=True)
    equipment_checks = EquipmentCheckSerializer(many=True)
    auto_logs = AutoLogSummarySerializer(many=True)
    photos = PhotoSerializer(many=True)