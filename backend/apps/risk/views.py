# apps/risk/views.py
import json
from django.db import transaction

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from apps.risk.risk_assessor import RiskAssessor, AssessInput
from apps.risk.services import (
    generate_admin_report,
    generate_worker_recommendation,
)
from apps.risk.models import (
    RiskAssessment,
    RiskReport,
    WorkerRecommendation,
)

from apps.user.storage.sas import make_read_sas


SITE_LABEL_FIXED = "사다리 설비함 작업"


# =========================
# 1) SAS URL 발급
# =========================
@api_view(["GET"])
def issue_read_sas(request):
    """
    GET /api/risk/media/sas?blob_name=<blob_name>
    프론트가 Blob 이미지에 접근할 수 있도록 SAS URL 발급
    """
    blob_name = request.query_params.get("blob_name")
    if not blob_name:
        return Response(
            {"error": "blob_name is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        url = make_read_sas(blob_name)
    except Exception as e:
        return Response(
            {"error": str(e), "type": e.__class__.__name__},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "ok": True,
            "blob_name": blob_name,
            "url": url,
        }
    )


# =========================
# 2) 위험성 평가 실행 (LLM)
# =========================
@api_view(["GET", "POST"])
def risk_assess(request):
    """
    POST /api/risk/assess
    body:
    {
        "blob_name": "<blob_name>"
    }

    처리:
    - LLM 평가
    - 관리자/근로자 파생 결과 생성
    - DB 저장
    """
    if request.method == "GET":
        return Response(
            {
                "ok": True,
                "usage": "POST JSON: {\"blob_name\": \"<blob_name>\"}",
                "example": {
                    "blob_name": "f66b81a873be4d75b7bf58120364519b"
                },
            }
        )

    blob_name = (
        request.data.get("blob_name")
        or request.data.get("image_blob_name")
        or request.data.get("blob_path")
    )

    if not blob_name:
        return Response(
            {"error": "blob_name is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # 1) LLM 평가
    try:
        assessor = RiskAssessor()
        llm_result = assessor.assess(
            AssessInput(
                image_blob_name=blob_name,
                site_label=SITE_LABEL_FIXED,
            )
        )
    except Exception as e:
        return Response(
            {"error": str(e), "type": e.__class__.__name__},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # 2) 파생 결과
    admin_view = generate_admin_report(llm_result)
    worker_view = generate_worker_recommendation(llm_result)

    # 3) DB 저장
    try:
        with transaction.atomic():
            assessment = RiskAssessment.objects.create(
                blob_path=blob_name,
                site_label=llm_result.get(
                    "site_label", SITE_LABEL_FIXED
                ),
                work_type_fixed=llm_result.get(
                    "work_type_fixed", SITE_LABEL_FIXED
                ),
                llm_result=llm_result,
                overall_grade=llm_result["overall"]["overall_grade"],
                overall_max_R=llm_result["overall"]["overall_max_R"],
                work_permission=llm_result["overall"]["work_permission"],
            )

            RiskReport.objects.create(
                assessment=assessment,
                scene_summary=admin_view["scene_summary"],
                hazards=admin_view["hazards"],
                overall=admin_view["overall"],
            )

            WorkerRecommendation.objects.create(
                assessment=assessment,
                top_risks=worker_view["top_risks"],
                immediate_actions=worker_view["immediate_actions"],
                short_message=worker_view["short_message"],
            )
    except Exception as e:
        return Response(
            {"error": f"DB save failed: {e}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "ok": True,
            "assessment_id": assessment.id,
        },
        status=status.HTTP_201_CREATED,
    )


# =========================
# 3) 관리자용 결과 조회
# =========================
@api_view(["GET"])
def admin_report_detail(request, assessment_id: int):
    """
    GET /api/risk/admin/<assessment_id>
    """
    try:
        rep = RiskReport.objects.select_related(
            "assessment"
        ).get(assessment_id=assessment_id)
    except RiskReport.DoesNotExist:
        return Response(
            {"error": "not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(
        {
            "assessment_id": assessment_id,
            "blob_path": rep.assessment.blob_path,
            "site_label": rep.assessment.site_label,
            "work_type_fixed": rep.assessment.work_type_fixed,
            "scene_summary": rep.scene_summary,
            "hazards": rep.hazards,
            "overall": rep.overall,
            "generated_at": rep.generated_at.isoformat(),
        }
    )


# =========================
# 4) 근로자용 결과 조회
# =========================
@api_view(["GET"])
def worker_recommendation_detail(request, assessment_id: int):
    """
    GET /api/risk/worker/<assessment_id>
    """
    try:
        rec = WorkerRecommendation.objects.select_related(
            "assessment"
        ).get(assessment_id=assessment_id)
    except WorkerRecommendation.DoesNotExist:
        return Response(
            {"error": "not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(
        {
            "assessment_id": assessment_id,
            "blob_path": rec.assessment.blob_path,
            "overall_grade": rec.assessment.overall_grade,
            "work_permission": rec.assessment.work_permission,
            "short_message": rec.short_message,
            "immediate_actions": rec.immediate_actions,
            "top_risks": rec.top_risks,
            "generated_at": rec.generated_at.isoformat(),
        }
    )
