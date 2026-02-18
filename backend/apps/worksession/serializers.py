from rest_framework import serializers
from .models import WorkSession


class WorkSessionListSerializer(serializers.ModelSerializer):

    class Meta:
        model = WorkSession
        fields = [
            "id",
            "title",
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
    worksession_id = serializers.IntegerField()
    status = serializers.CharField()
    detail = serializers.CharField(required=False)