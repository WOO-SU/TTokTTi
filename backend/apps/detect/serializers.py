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
