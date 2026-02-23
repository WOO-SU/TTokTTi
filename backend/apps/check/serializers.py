from rest_framework import serializers
from .models import Compliance
from ..detect.models import VideoLog

class ComplianceSerializer(serializers.ModelSerializer):
    is_updated = serializers.SerializerMethodField()

    class Meta:
        model = Compliance
        fields = '__all__'

    def get_is_updated(self, obj):
        return obj.is_complied is not None

# 탐지 요청 시 프론트에서 보내는 데이터
class ComplianceRequestSerializer(serializers.Serializer):
    category = serializers.CharField(max_length=50)
    original_image = serializers.CharField(max_length=200)

# 탐지 결과 업로드
class ComplianceResultSerializer(serializers.Serializer):
    compliance_id = serializers.IntegerField()
    detected_image = serializers.CharField(max_length=200)
    is_complied = serializers.BooleanField()

# "/api/check/update" 응답 시리얼라이저
class CheckUpdateResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField()
    data = ComplianceSerializer(allow_null=True)

# "/api/check/upload" 응답 시리얼라이저
class UploadResultResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField()
    detail = serializers.CharField(required=False, allow_null=True)

# "/api/check/start" 응답 시리얼라이저
class RequestDetectionResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField()
    compliance_id = serializers.IntegerField()

# "/api/check/target" 요청 시리얼라이저
class TargetPhotoRequestSerializer(serializers.Serializer):
    worksession_id = serializers.IntegerField()
    status = serializers.CharField(max_length=10)  # BEFORE or AFTER
    image_path = serializers.CharField(max_length=200)

# "/api/check/request" 요청 시리얼라이저
class RequestCheckSerializer(serializers.Serializer):
    worksession_id = serializers.IntegerField()
    compliance_id = serializers.IntegerField()

# "/api/check/approve" 요청 시리얼라이저
class ApproveCheckSerializer(serializers.Serializer):
    video_log_id = serializers.IntegerField()
    is_approved = serializers.BooleanField()

class ApproveCheckResultSerializer(serializers.Serializer):
    video_log_id = serializers.IntegerField()
    status = serializers.ChoiceField(
        choices=VideoLog.StatusChoices.choices
    )

# "/api/check/approve" 응답 시리얼라이저
class ApproveCheckResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField()
    data = ApproveCheckResultSerializer(required=False)
    detail = serializers.CharField(required=False)

# "/api/check/pass" 요청 시리얼라이저
class CheckPassRequestSerializer(serializers.Serializer):
    category = serializers.CharField(max_length=50, required=False)

# "/api/check/pass" 응답 시리얼라이저
class CheckPassResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField()
    passed = serializers.BooleanField(required=False)
    detail = serializers.CharField(required=False)

class EmployeeSimpleSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()


class WorkSessionSimpleSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()

# "/api/check/admin/request" 응답 시리얼라이저
class ManualCheckResponseSerializer(serializers.Serializer):
    videolog_id = serializers.IntegerField()
    status = serializers.CharField(allow_null=True)

    employee = EmployeeSimpleSerializer()
    worksession = WorkSessionSimpleSerializer()

    category = serializers.CharField()

    original_image = serializers.CharField(allow_null=True)
    created_at = serializers.DateTimeField()