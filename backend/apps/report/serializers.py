from rest_framework import serializers


class ReportGenerateRequestSerializer(serializers.Serializer):
    worksession_id = serializers.IntegerField()
    assessment_id = serializers.IntegerField(required=False, allow_null=True)

    # 옵션: 나중에 확장 가능
    include_worklog = serializers.BooleanField(required=False, default=True)
    include_risk_report = serializers.BooleanField(required=False, default=True)


class ReportGenerateResponseSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["GENERATED", "FAILED"])

    # ✅ 생성 성공 시: 저장 정보
    worksession_id = serializers.IntegerField(required=False)
    report_id = serializers.IntegerField(required=False)
    report_version = serializers.IntegerField(required=False)

    # ✅ 생성 성공 시: payload (너희 현재 응답 형태)
    input_package = serializers.JSONField(required=False)
    report = serializers.JSONField(required=False)

    # (레거시 호환) 혹시 이전 코드가 report_json을 쓰면 같이 허용
    report_json = serializers.JSONField(required=False)

    # 실패 시
    error = serializers.CharField(required=False, allow_blank=True)


# ----------------------------
# 조회용 (스타일 맞춰서 최소 필드)
# ----------------------------

class ReportLatestResponseSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["OK", "NOT_FOUND"])
    worksession_id = serializers.IntegerField()

    report_id = serializers.IntegerField(required=False)
    report_version = serializers.IntegerField(required=False)
    input_package = serializers.JSONField(required=False)
    report = serializers.JSONField(required=False)
    created_at = serializers.DateTimeField(required=False)


class ReportVersionItemSerializer(serializers.Serializer):
    report_id = serializers.IntegerField()
    report_version = serializers.IntegerField()
    created_at = serializers.DateTimeField()


class ReportVersionsResponseSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["OK"])
    worksession_id = serializers.IntegerField()
    versions = ReportVersionItemSerializer(many=True)