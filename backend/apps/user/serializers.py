from rest_framework import serializers
from .models import User

class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField()
    new_password = serializers.CharField()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = '__all__'

from rest_framework import serializers
from .models import Team, User


class TeamCreateSerializer(serializers.Serializer):
    coworker_id = serializers.IntegerField()

    def validate_coworker_id(self, value):
        request = self.context["request"]

        if request.user.id == value:
            raise serializers.ValidationError("자기 자신과는 팀을 만들 수 없습니다.")

        if not User.objects.filter(id=value).exists():
            raise serializers.ValidationError("해당 사용자가 존재하지 않습니다.")

        return value

    def create(self, validated_data):
        request = self.context["request"]
        coworker = User.objects.get(id=validated_data["coworker_id"])

        team = Team.objects.create(
            employee1=request.user,
            employee2=coworker
        )
        return team

class TeamResponseSerializer(serializers.ModelSerializer):
    employee1 = serializers.CharField(source="employee1.name")
    employee2 = serializers.CharField(source="employee2.name")

    class Meta:
        model = Team
        fields = ["id", "employee1", "employee2", "created_at"]

class CoworkerSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    phone_last4 = serializers.CharField(allow_null=True)

class UserSearchSerializer(serializers.ModelSerializer):
    phone_last4 = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "name", "phone_last4"]

    def get_phone_last4(self, obj):
        if obj.phone:
            return obj.phone[-4:]
        return None