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
    status = serializers.CharField()
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