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
    RiskAssessmentImage,
)
import tempfile
import os
from rest_framework.decorators import parser_classes
from rest_framework.parsers import MultiPartParser, FormParser

from apps.user.storage.sas import make_read_sas
from drf_spectacular.utils import  OpenApiParameter, OpenApiTypes
from apps.risk.serializers import (
    SasIssueResponseSerializer,
    RiskAssessRequestSerializer, RiskAssessResponseSerializer,
    RiskAssessUrlRequestSerializer,
    RiskAssessMultiRequestSerializer,   # ✅ 추가
    AdminReportResponseSerializer,
    WorkerResponseSerializer,
    ErrorResponseSerializer,
)
from drf_spectacular.utils import (
    extend_schema, OpenApiParameter, OpenApiTypes, OpenApiRequest
)
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

@api_view(["POST"])
def risk_assess_by_url(request):
    """
    POST /api/risk/assess-url
    {
      "image_url": "https://....jpg",
      "site_label": "로컬테스트현장A"
    }
    """
    image_url = request.data.get("image_url")
    site_label = request.data.get("site_label", SITE_LABEL_FIXED)

    if not image_url:
        return Response({"error": "image_url is required"}, status=400)

    try:
        assessor = RiskAssessor()
        llm_result = assessor.assess_from_url(
            image_url=image_url,
            site_label=site_label,
        )
    except Exception as e:
        return Response(
            {"error": str(e), "type": e.__class__.__name__},
            status=500,
        )

    # 👉 DB 저장은 기존 assess-local / assess 와 동일하게 처리
    with transaction.atomic():
        assessment = RiskAssessment.objects.create(
            blob_path=image_url,
            blob_paths=[image_url],   # ✅ 추가
            site_label=llm_result.get("site_label", site_label),
            work_type_fixed=llm_result.get("work_type_fixed", SITE_LABEL_FIXED),
            llm_result=llm_result,
            overall_grade=llm_result["overall"]["overall_grade"],
            overall_max_R=llm_result["overall"]["overall_max_R"],
            work_permission=llm_result["overall"]["work_permission"],
        )

        RiskReport.objects.create(
            assessment=assessment,
            scene_summary=llm_result["scene_summary"],
            hazards=llm_result["hazards"],
            overall=llm_result["overall"],
        )

        worker_view = generate_worker_recommendation(llm_result)

        WorkerRecommendation.objects.create(
            assessment=assessment,
            top_risks=worker_view["top_risks"],
            immediate_actions=worker_view["immediate_actions"],
            short_message=worker_view["short_message"],
        )

        RiskAssessmentImage.objects.create(
            assessment=assessment,
            blob_name=image_url,  # URL이 들어가도 일단 동작은 함
            order=0,
        )

    return Response(
        {"ok": True, "assessment_id": assessment.id},
        status=201,
    )

@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def risk_assess_local(request):
    """
    POST /api/risk/assess-local (multipart)
    form-data:
      - image: (file) test.jpg
      - site_label: (optional)
    """
    upload = request.FILES.get("image")
    if not upload:
        return Response({"error": "image file is required"}, status=status.HTTP_400_BAD_REQUEST)

    site_label = request.data.get("site_label") or SITE_LABEL_FIXED

    # 임시 파일로 저장 후 assess(image_path=...) 호출
    suffix = os.path.splitext(upload.name)[-1] or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        for chunk in upload.chunks():
            tmp.write(chunk)
        tmp_path = tmp.name

    try:
        assessor = RiskAssessor()
        llm_result = assessor.assess(
            AssessInput(
                image_path=tmp_path,
                site_label=site_label,
            )
        )
    except Exception as e:
        return Response({"error": str(e), "type": e.__class__.__name__},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass
    
    admin_view = generate_admin_report(llm_result)
    worker_view = generate_worker_recommendation(llm_result)

    try:
        with transaction.atomic():
            assessment = RiskAssessment.objects.create(
            blob_path="LOCAL_UPLOAD",
            blob_paths=["LOCAL_UPLOAD"],   # ✅ 추가 (일관성)
            site_label=llm_result.get("site_label", site_label),
            work_type_fixed=llm_result.get("work_type_fixed") or SITE_LABEL_FIXED,
            llm_result=llm_result,
            overall_grade=llm_result["overall"]["overall_grade"],
            overall_max_R=llm_result["overall"]["overall_max_R"],
            work_permission=llm_result["overall"]["work_permission"],
        )

        RiskAssessmentImage.objects.create(
            assessment=assessment,
            blob_name="LOCAL_UPLOAD",  # ✅ 통일(또는 tmp_path 기록하고 싶으면 그걸 넣어도 됨)
            order=0,
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
        return Response({"error": f"DB save failed: {e}"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({"ok": True, "assessment_id": assessment.id},
                    status=status.HTTP_201_CREATED)

# =========================
# 2) 위험성 평가 실행 (LLM)
# =========================
@swagger_auto_schema(
    method='post',
    request_body=RiskAssessMultiRequestSerializer,  # ✅ 멀티로 교체 or oneOf로 확장
    responses={201: RiskAssessResponseSerializer, 400: ErrorResponseSerializer},
)
@api_view(["POST"])
def risk_assess(request):
    blob_names = request.data.get("blob_names")
    site_label = request.data.get("site_label") or SITE_LABEL_FIXED

    # ✅ 하위호환: blob_name 하나만 온 경우도 처리
    if not blob_names:
        one = request.data.get("blob_name") or request.data.get("image_blob_name") or request.data.get("blob_path")
        if one:
            blob_names = [one]

    if not blob_names or not isinstance(blob_names, list):
        return Response({"error": "blob_names(list) is required"}, status=status.HTTP_400_BAD_REQUEST)
    # ✅ 입력 정리: strip + 빈값 제거 + 중복 제거(순서 유지) + 개수 제한
    cleaned = []
    seen = set()
    for x in blob_names:
        if not isinstance(x, str):
            continue
        x = x.strip()
        if not x or x in seen:
            continue
        seen.add(x)
        cleaned.append(x)

    MAX_IMAGES = 10
    if len(cleaned) == 0:
        return Response({"error": "blob_names has no valid items"}, status=status.HTTP_400_BAD_REQUEST)
    if len(cleaned) > MAX_IMAGES:
        return Response({"error": f"too many images (max {MAX_IMAGES})"}, status=status.HTTP_400_BAD_REQUEST)

    blob_names = cleaned

    try:
        assessor = RiskAssessor()
        llm_result = assessor.assess_multi(
            image_blob_names=blob_names,
            site_label=site_label,
        )
    except Exception as e:
        return Response({"error": str(e), "type": e.__class__.__name__}, status=500)

    admin_view = generate_admin_report(llm_result)
    worker_view = generate_worker_recommendation(llm_result)

    try:
        with transaction.atomic():
            assessment = RiskAssessment.objects.create(
                blob_path=blob_names[0],     # 대표 1장
                blob_paths=blob_names,       # ✅ 전체 저장
                site_label=llm_result.get("site_label", site_label),
                work_type_fixed=llm_result.get("work_type_fixed", SITE_LABEL_FIXED),
                llm_result=llm_result,
                overall_grade=llm_result["overall"]["overall_grade"],
                overall_max_R=llm_result["overall"]["overall_max_R"],
                work_permission=llm_result["overall"]["work_permission"],
            )
            RiskAssessmentImage.objects.bulk_create([
                RiskAssessmentImage(assessment=assessment, blob_name=bn, order=i)
                for i, bn in enumerate(blob_names)
            ])

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
        return Response({"error": f"DB save failed: {e}"}, status=500)

    return Response(
        {
            "ok": True,
            "assessment_id": assessment.id,
            "result_urls": {
                "admin": f"/api/risk/admin/{assessment.id}",
                "worker": f"/api/risk/worker/{assessment.id}",
            },
        },
        status=201
    )



# =========================
# 3) 관리자용 결과 조회
# =========================
@swagger_auto_schema(
    method='get',
    responses={
        200: AdminReportResponseSerializer,
        404: ErrorResponseSerializer
    },
    operation_description="관리자용 상세 보고서 조회"
)
@api_view(["GET"])
def admin_report_detail(request, assessment_id: int):
    """
    GET /api/risk/admin/<assessment_id>
    """
    try:
        rep = (
            RiskReport.objects
            .select_related("assessment")
            .prefetch_related("assessment__images")
            .get(assessment_id=assessment_id)
        )
    except RiskReport.DoesNotExist:
        return Response({"error": "not found"}, status=status.HTTP_404_NOT_FOUND)


    # ✅ llm_result로부터 '보고서용' 포맷 생성
    formatted = generate_admin_report(rep.assessment.llm_result)
    report = formatted.get("report")  # services.py에서 만든 새 포맷

    return Response(
        {
            "assessment_id": assessment_id,
            "blob_path": rep.assessment.blob_path,
            "site_label": rep.assessment.site_label,
            "work_type_fixed": rep.assessment.work_type_fixed,
            "blob_paths": rep.assessment.blob_paths,
            "images": list(rep.assessment.images.order_by("order", "id").values("order", "blob_name")),

            # ⭐ 프론트는 이거만 쓰면 됨
            "report": report,

            # (선택) 기존 스냅샷도 유지(디버깅/감사용)
            "scene_summary": rep.scene_summary,
            "hazards": rep.hazards,
            "overall": rep.overall,

            "generated_at": rep.generated_at.isoformat(),
        }
    )


# =========================
# 4) 근로자용 결과 조회
# =========================
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
    """
    GET /api/risk/worker/<assessment_id>
    """
    try:
        rec = (
            WorkerRecommendation.objects
            .select_related("assessment")
            .prefetch_related("assessment__images")
            .get(assessment_id=assessment_id)
        )
    except WorkerRecommendation.DoesNotExist:
        return Response({"error": "not found"}, status=status.HTTP_404_NOT_FOUND)


    # ✅ llm_result로부터 '근로자 메시지용' 포맷 생성
    formatted = generate_worker_recommendation(rec.assessment.llm_result)
    message = formatted.get("message")  # services.py에서 만든 새 포맷

    return Response(
        {
            "assessment_id": assessment_id,
            "blob_path": rec.assessment.blob_path,

            # ⭐ 프론트는 이거만 쓰면 됨
            "message": message,
            "blob_paths": rec.assessment.blob_paths,
            "images": list(rec.assessment.images.order_by("order", "id").values("order", "blob_name")),



            # (선택) 기존 필드 유지(하위호환/디버깅용)
            "overall_grade": rec.assessment.overall_grade,
            "work_permission": rec.assessment.work_permission,
            "short_message": rec.short_message,
            "immediate_actions": rec.immediate_actions,
            "top_risks": rec.top_risks,

            "generated_at": rec.generated_at.isoformat(),
        }
    )
