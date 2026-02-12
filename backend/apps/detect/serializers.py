from rest_framework import serializers
from .models import Video

class VideoSerializer(serializers.ModelSerializer): # 모델 시리얼라이저
    class Meta:
        model = Video
        fields = '__all__'

class SaveVideoResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField()
    data = VideoSerializer(allow_null=True)
    detail = serializers.CharField(required=False, allow_null=True)
