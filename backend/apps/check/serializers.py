from rest_framework import serializers
from .models import Compliance

class ComplianceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Compliance
        fields = '__all__'

# 탐지 요청 시 프론트에서 보내는 데이터
class ComplianceRequestSerializer(serializers.Serializer):
    target = serializers.CharField(max_length=50)
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