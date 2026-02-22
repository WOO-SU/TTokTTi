from rest_framework import serializers
from .models import VideoLog

class VideoSerializer(serializers.ModelSerializer): # 모델 시리얼라이저
    class Meta:
        model = VideoLog
        fields = '__all__'

class SaveVideoResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField()
    data = VideoSerializer(allow_null=True)
    detail = serializers.CharField(required=False, allow_null=True)

class VideoSearchResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField()
    count = serializers.IntegerField()
    data = VideoSerializer(many=True)

class CheckLogsResponseSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    status = serializers.CharField()
    worksession_name = serializers.CharField() # from worksession
    source = serializers.CharField()
    created_at = serializers.DateTimeField()
    is_read = serializers.BooleanField() # from videologread

    compliance_id = serializers.IntegerField(allow_null=True) # MANUAL only
    compliance_category = serializers.CharField(allow_null=True) # MANUAL only: from compliance
    risk_type_name = serializers.CharField(allow_null=True) # AUTO only: from risktype
