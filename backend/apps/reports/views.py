from django.utils import timezone
from django.db.models import Max

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from drf_yasg.utils import swagger_auto_schema

from .serializers import (
    ReportGenerateRequestSerializer,
    ReportGenerateResponseSerializer,
    ReportLatestResponseSerializer,
    ReportVersionsResponseSerializer,
)
from .services import build_input_package
from .llm import generate_report_json
from .models import PostWorkReport   # ✅ 추가


@swagger_auto_schema(
    method="post",
    request_body=ReportGenerateRequestSerializer,
    responses={200: ReportGenerateResponseSerializer},
    tags=["Reports"],
)
@api_view(["POST"])
def generate_postwork_report(request):
    ser = ReportGenerateRequestSerializer(data=request.data)
    ser.is_valid(raise_exception=True)

    worksession_id = ser.validated_data["worksession_id"]
    assessment_id = ser.validated_data.get("assessment_id")

    # 1) DB → 입력 패키지
    input_pkg = build_input_package(
        worksession_id=worksession_id,
        assessment_id=assessment_id,
    )

    # 2) LLM → 보고서(서술/구성)
    report_json = generate_report_json(input_pkg)

    # 3) ✅ 서버가 팩트는 강제로 주입/덮어쓰기
    report_json["generated_at"] = timezone.now().isoformat()

    report_json["before_after_summary"] = {
        "before_photos": [p["image_path"] for p in input_pkg.get("photos", {}).get("before", [])],
        "after_photos": [p["image_path"] for p in input_pkg.get("photos", {}).get("after", [])],
    }

    report_json["risk_statistics"] = input_pkg.get("risk_logs", {}).get("stats", {})
    report_json["compliance_summary"] = input_pkg.get("compliance", {}).get("stats", {})
    report_json["risk_highlights"] = input_pkg.get("risk_logs", {}).get("highlights", [])

    # ✅ 4) 여기서 저장! (세션당 버전 쌓기)
    next_ver = (
        PostWorkReport.objects
        .filter(worksession_id=worksession_id)
        .aggregate(v=Max("report_version"))
        .get("v") or 0
    ) + 1

    saved = PostWorkReport.objects.create(
        worksession_id=worksession_id,
        assessment_id=assessment_id,
        report_version=next_ver,
        input_snapshot=input_pkg,
        report_snapshot=report_json,
    )

    return Response(
        {
            "status": "GENERATED",
            "worksession_id": worksession_id,
            "report_id": saved.id,              # ✅ 추가
            "report_version": saved.report_version,  # ✅ 추가
            "input_package": input_pkg,
            "report": report_json,
        },
        status=status.HTTP_200_OK,
    )

@swagger_auto_schema(
    method="get",
    responses={200: ReportLatestResponseSerializer, 404: ReportLatestResponseSerializer},
    tags=["Reports"],
)
@api_view(["GET"])
def get_latest_postwork_report(request, worksession_id: int):
    obj = (
        PostWorkReport.objects
        .filter(worksession_id=worksession_id)
        .order_by("-report_version")
        .first()
    )
    if not obj:
        return Response(
            {"status": "NOT_FOUND", "worksession_id": worksession_id},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(
        {
            "status": "OK",
            "worksession_id": worksession_id,
            "report_id": obj.id,
            "report_version": obj.report_version,
            "input_package": obj.input_snapshot,
            "report": obj.report_snapshot,
            "created_at": obj.created_at,
        },
        status=status.HTTP_200_OK,
    )


@swagger_auto_schema(
    method="get",
    responses={200: ReportVersionsResponseSerializer},
    tags=["Reports"],
)
@api_view(["GET"])
def list_postwork_report_versions(request, worksession_id: int):
    qs = (
        PostWorkReport.objects
        .filter(worksession_id=worksession_id)
        .order_by("-report_version")
        .values("id", "report_version", "created_at")
    )

    versions = [
        {"report_id": row["id"], "report_version": row["report_version"], "created_at": row["created_at"]}
        for row in qs
    ]

    return Response(
        {
            "status": "OK",
            "worksession_id": worksession_id,
            "versions": versions,
        },
        status=status.HTTP_200_OK,
    )
