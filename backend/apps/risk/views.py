# apps/risk/views.py
import json
from django.db import transaction

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status

from apps.risk.risk_assessor import RiskAssessor
from apps.risk.services import (
    generate_admin_report,
    generate_worker_recommendation,
)
from apps.risk.models import (
    RiskAssessment,
    RiskReport,
    WorkerRecommendation,
)
from ..worksession.models import WorkSession

import tempfile
import os
from rest_framework.permissions import IsAuthenticated

from apps.user.storage.sas import make_read_sas
from apps.risk.serializers import *

from drf_yasg.utils import swagger_auto_schema

SITE_LABEL_FIXED = "사다리 설비함 작업"


# =========================
# 1) SAS URL 발급
# =========================
from drf_yasg import openapi

@swagger_auto_schema(
    method='get',
    manual_parameters=[
        openapi.Parameter(
            'blob_name',          # 이름
            openapi.IN_QUERY,     # 위치 (Query String)
            description="설명",    # 설명
            type=openapi.TYPE_STRING # 타입
        )
    ],
    responses={200: SasIssueResponseSerializer} # 이렇게 해야 이미지처럼 박스가 뜸!
)
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

@swagger_auto_schema(
    method="post",
    responses={201: RiskAssessResponseSerializer, 
               400: ErrorResponseSerializer, 
               404: ErrorResponseSerializer,
               500: ErrorResponseSerializer
               },
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def risk_assess(request, assessment_id):
    """
    POST /api/risk/assess/{assessment_id}: 업로드된 이미지(blob_name) 기반으로 위험성 평가 실행
    """

    if not assessment_id:
        return Response(
            {"error": "assessment_id is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        assessment = (
            RiskAssessment.objects
            .select_related("worksession")
            .prefetch_related("images")
            .get(
                id=assessment_id,
                status=RiskAssessment.StatusChoices.PENDING
            )
        )
    except RiskAssessment.DoesNotExist:
        return Response(
            {"error": "PENDING assessment not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    images = list(
        assessment.images
        .order_by("created_at")
        .values_list("blob_name", flat=True)
    )

    if not images:
        return Response(
            {"error": "No images uploaded for this assessment"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        assessor = RiskAssessor()
        llm_result = assessor.assess_multi(
            image_blob_names=images,
            site_label=assessment.site_label,
        )
    except Exception as e:
        assessment.status = RiskAssessment.StatusChoices.FAILED
        assessment.save(update_fields=["status"])
        return Response(
            {"error": str(e), "type": e.__class__.__name__},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    admin_view = generate_admin_report(llm_result)
    worker_view = generate_worker_recommendation(llm_result)

    with transaction.atomic():
        # update RiskAssessment with results
        perm_str = llm_result["overall"].get("work_permission", "작업 가능")
        assessment.llm_result = llm_result
        assessment.overall_grade = llm_result["overall"]["overall_grade"]
        assessment.overall_max_R = llm_result["overall"]["overall_max_R"]
        assessment.work_permission = perm_str != "조치 전 작업 금지"
        assessment.status = RiskAssessment.StatusChoices.COMPLETED
        assessment.save()

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

    return Response(
        {
            "ok": True,
            "assessment_id": assessment.id,
            "result_urls": {
                "admin": f"/api/risk/admin/{assessment.id}",
                "worker": f"/api/risk/worker/{assessment.id}",
            },
        },
        status=status.HTTP_201_CREATED
    )

@swagger_auto_schema(
    method="get",
    responses={200: AdminReportResponseSerializer, 404: ErrorResponseSerializer},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_report_detail(request, assessment_id: int):
    try:
        report = (
            RiskReport.objects
            .select_related("assessment")
            .prefetch_related("assessment__images")
            .get(assessment_id=assessment_id)
        )
    except RiskReport.DoesNotExist:
        return Response({"error": "not found"}, status=404)

    assessment = report.assessment

    return Response(
        {
            "assessment_id": assessment.id,
            "site_label": assessment.site_label,
            "status": assessment.status,

            "images": list(
                assessment.images.values("id", "blob_name", "created_at")
            ),

            "report": {
                "scene_summary": report.scene_summary,
                "hazards": report.hazards,
                "overall": report.overall,
                "version": report.report_version,
            },

            "generated_at": report.generated_at,
        }
    )


@swagger_auto_schema(
    method='get',
    responses={
        200: WorkerResponseSerializer,
        404: ErrorResponseSerializer
    },
    operation_description="근로자용 상세 보고서 조회"
)
@api_view(["GET"])
def worker_recommendation_detail(request, assessment_id: int):
    try:
        rec = (
            WorkerRecommendation.objects
            .select_related("assessment")
            .prefetch_related("assessment__images")
            .get(assessment_id=assessment_id)
        )
    except WorkerRecommendation.DoesNotExist:
        return Response({"error": "not found"}, status=404)

    assessment = rec.assessment

    return Response(
        {
            "assessment_id": assessment.id,
            "status": assessment.status,

            "images": list(
                assessment.images.values("id", "blob_name", "created_at")
            ),

            "short_message": rec.short_message,
            "top_risks": rec.top_risks,
            "immediate_actions": rec.immediate_actions,

            "generated_at": rec.generated_at,
        }
    )

@swagger_auto_schema(
    method="get",
    responses={200: AssessmentExistenceResponseSerializer}
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_assessment_by_session(request, worksession_id):
    """
    "/api/risk/latest/{worksession_id}/"

    특정 WorkSession에 대해 COMPLETED 상태의 최신 RiskAssessment가 존재하는지 확인.
    """

    assessment = (
        RiskAssessment.objects
        .filter(
            worksession_id=worksession_id,
            status=RiskAssessment.StatusChoices.COMPLETED
        )
        .order_by("-created_at")
        .first()
    )

    if not assessment:
        return Response(
            {
                "exists": False
            },
            status=status.HTTP_200_OK
        )

    return Response(
        {
            "exists": True,
            "assessment_id": assessment.id,
            "created_at": assessment.created_at,
        },
        status=status.HTTP_200_OK
    )

@swagger_auto_schema(
    method="post",
    responses={200: AssessmentCreationResponseSerializer,
               404: ErrorAssessmentCreationResponseSerializer}
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_assessment_for_session(request, worksession_id):
    """
    "/api/risk/start/{worksession_id}/"

    특정 WorkSession에 대한 RiskAssessment 레코드 생성
    (첫번째 사진 업로드 시점에 호출)
    """

    try:
        session = WorkSession.objects.get(id=worksession_id)
    except WorkSession.DoesNotExist:
        return Response(
            {"detail": "WorkSession not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # 이미 진행중(PENDING) 평가가 있는지 확인
    existing = RiskAssessment.objects.filter(
        worksession=session,
        status=RiskAssessment.StatusChoices.PENDING
    ).first()

    if existing:
        return Response(
            {
                "assessment_id": existing.id,
                "created_at": existing.created_at,
                "message": "Existing pending assessment returned."
            },
            status=status.HTTP_200_OK
        )

    # 새로 생성
    assessment = RiskAssessment.objects.create(
        worksession=session,
        employee=request.user,
        status=RiskAssessment.StatusChoices.PENDING,
        site_label=session.name,
    )

    return Response(
        {
            "assessment_id": assessment.id,
            "created_at": assessment.created_at,
            "message": "New assessment created."
        },
        status=status.HTTP_200_OK
    )

@swagger_auto_schema(
    method="post",
    request_body=UploadImageRequestSerializer,
    responses={200: UploadImageResponseSerializer, # 수정
               400: ErrorResponseSerializer,
               404: ErrorResponseSerializer,}
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload_image(request, assessment_id):
    """
    "/api/risk/upload/{assessment_id}/"

    생성된 RiskAssessment 레코드에 대응되는 AssessmentImage 레코드 생성
    """

    blob_name = request.data.get("blob_name")

    if not blob_name:
        return Response(
            {"error": "blob_name is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        assessment = RiskAssessment.objects.get(
            id=assessment_id,
            status=RiskAssessment.StatusChoices.PENDING
        )
    except RiskAssessment.DoesNotExist:
        return Response(
            {"error": "PENDING assessment not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    image = RiskAssessmentImage.objects.create(
        assessment=assessment,
        blob_name=blob_name,
    )

    return Response(
        {
            "assessment_id": assessment.id,
            "image_id": image.id,
            "blob_name": image.blob_name,
        },
        status=status.HTTP_201_CREATED
    )