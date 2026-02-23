from django.shortcuts import render

from drf_yasg.utils import swagger_auto_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import json

from .models import Compliance, Photo
from ..detect.models import VideoLog
from .serializers import (
    ComplianceSerializer, 
    ComplianceRequestSerializer,
    ComplianceResultSerializer, 
    CheckUpdateResponseSerializer, 
    UploadResultResponseSerializer, 
    RequestDetectionResponseSerializer,
    TargetPhotoRequestSerializer,
    RequestCheckSerializer,
    ApproveCheckSerializer,
    ApproveCheckResponseSerializer,
    CheckPassRequestSerializer,
    CheckPassResponseSerializer
)
from .permissions import IsJetson

from ..worksession.models import WorkSession
# temporary measure. if two redis queues are needed,, pull the client code .
import os
import redis
redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    password=os.getenv("REDIS_PASSWORD", None),
    ssl=os.getenv("REDIS_SSL", "False").lower() in ("true", "1", "t"),
    decode_responses=True
)


@swagger_auto_schema(
    method='get',
    responses={200: CheckUpdateResponseSerializer}
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def check_update(request):
    """
    "/api/check/update": 특정 탐지(compliance_id) 결과 확인
    query params: ?compliance_id=<id>
    """
    user = request.user
    compliance_id = request.query_params.get("compliance_id")

    if not compliance_id:
        return Response({"ok": False, "data": None, "detail": "compliance_id required"}, status=400)

    try:
        compliance = Compliance.objects.get(id=compliance_id, employee=user)
        serializer = ComplianceSerializer(compliance)
        return Response({"ok": True, "data": serializer.data})
    except Compliance.DoesNotExist:
        return Response({"ok": False, "data": None, "detail": "compliance not found"}, status=404)


@swagger_auto_schema(
    method='post',
    request_body=ComplianceResultSerializer,
    responses={200: UploadResultResponseSerializer}
)
@api_view(["POST"])
@permission_classes([IsJetson])
def upload_result(request):
    """
    "/api/check/upload": 탐지 결과를 DB에 업로드 한다. (모델 -> 백 -> DB)
    request body: { "compliance_id": int, "detected_image": str, "is_complied": bool }
    """
    serializer = ComplianceResultSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    data = serializer.validated_data
    try:
        compliance = Compliance.objects.get(id=data["compliance_id"])
        compliance.detected_image = data["detected_image"]
        compliance.is_complied = data["is_complied"]
        compliance.save(update_fields=["detected_image", "is_complied"])
        return Response({"ok": True})
    except Compliance.DoesNotExist:
        return Response({"ok": False, "detail": "compliance not found"}, status=status.HTTP_404_NOT_FOUND)


@swagger_auto_schema(
    method='post',
    request_body=ComplianceRequestSerializer,
    responses={200: RequestDetectionResponseSerializer}
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def request_detection(request):
    """
    "/api/check/start": 탐지 요청 레코드를 DB에 업로드 한다. (프론트 -> 백 -> DB)
    request body: { "category": "HELMET", "original_image": "blob 이미지 경로" }   
    """
    serializer = ComplianceRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = request.user
    worksession_id = request.data.get("worksession_id")
    category = serializer.validated_data["category"]
    original_image = serializer.validated_data["original_image"]

    # Compliance 레코드 생성
    compliance = Compliance.objects.create(
        worksession_id=worksession_id,
        employee=user,
        category=category,
        original_image=original_image
    )

    message = {
        "compliance_id": compliance.id,
        "original_image": original_image,
        "category": category
    }

    try:
        # Queue 이름은 Worker의 REDIS_QUEUE와 동일해야 함 (기본: "compliance:queue")
        queue_name = os.getenv("REDIS_QUEUE", "compliance:queue")

        # RPUSH: 리스트의 오른쪽에 추가 (Worker는 BLPOP으로 왼쪽에서 가져감 -> FIFO 구조)
        redis_client.rpush(queue_name, json.dumps(message))

    except redis.RedisError as e:
        # Redis 연결 실패 시 로깅하고 에러 응답 (또는 DB 롤백)
        print(f"Redis Error: {e}")
        return Response({"ok": False, "error": "Failed to queue task"}, status=500)

    return Response({"ok": True, "compliance_id": compliance.id})


@swagger_auto_schema(
    method='post',
    request_body=TargetPhotoRequestSerializer,
    responses={200: UploadResultResponseSerializer}
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def target_photo(request):
    """
    "/api/check/target": 타겟 사진을 DB에 업로드 한다. (프론트 -> 백 -> DB)
    request body: { "worksession_id": int, "status": str, "image_path": str }
    """
    user = request.user
    worksession_id = request.data.get("worksession_id")
    status = request.data.get("status")
    image_path = request.data.get("image_path")

    if not worksession_id:
        return Response({"ok": False, "detail": "worksession_id is required"}, status=400)
    if not status:
        return Response({"ok": False, "detail": "status (BEFORE or AFTER) is required"}, status=400)
    if not image_path:
        return Response({"ok": False, "detail": "image_path is required"}, status=400)

    photo = Photo.objects.create(
        employee=user,
        worksession_id=request.data.get("worksession_id"),
        status=request.data.get("status"),
        image_path=request.data.get("image_path")
    )

    return Response({"ok": True})


@swagger_auto_schema(
    method="post",
    request_body = RequestCheckSerializer,
    responses = {
        200: UploadResultResponseSerializer,
        400: UploadResultResponseSerializer,
    }
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def request_check(request):
    """
    "/api/check/request": 근로자 -> 관리자 수동 점검 요청
    request body: { "worksession_id": int, "compliance_id": int }
    """
    worksession_id = request.data.get("worksession_id")
    compliance_id = request.data.get("compliance_id")

    if not worksession_id:
        return Response(
            {"ok": False, "detail": "worksession_id required"},
            status=400
        )
    if not compliance_id:
        return Response(
            {"ok": False, "detail": "compliance_id required"},
            status=400
        )

    log = VideoLog.objects.create(
        worksession_id=worksession_id,
        compliance_id=compliance_id,
        source=VideoLog.SourceChoices.MANUAL,
        status=VideoLog.StatusChoices.PENDING,
    )

    return Response({"ok": True}, status=200)


@swagger_auto_schema(
    method="patch",
    request_body=ApproveCheckSerializer,
    responses={
        200: ApproveCheckResponseSerializer,
        400: ApproveCheckResponseSerializer,
        404: ApproveCheckResponseSerializer,
        403: ApproveCheckResponseSerializer,
    }
)
@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def approve_check(request):
    """
    "/api/check/approve": 관리자 -> 근로자 수동 점검 승인
    request body: { "video_log_id": int, "approval": bool }
    """

    video_log_id = request.data.get("video_log_id")
    approval = request.data.get("approval")

    if request.user.is_manager == False:
        return Response(
            {"ok": False, "detail": "Only managers can approve checks"},
            status=403
        )

    if video_log_id is None or approval is None:
        return Response(
            {"ok": False, "detail": "video_log_id and approval required"},
            status=400
        )

    try:
        log = VideoLog.objects.get(id=video_log_id)
    except VideoLog.DoesNotExist:
        return Response(
            {"ok": False, "detail": "VideoLog not found"},
            status=404
        )

    # 상태 변경
    log.status = (
        VideoLog.StatusChoices.APPROVED
        if approval
        else VideoLog.StatusChoices.REJECTED
    )
    log.save()

    return Response({
        "ok": True,
        "data": {
            "video_log_id": log.id,
            "status": log.status
        }
    }, status=200)


@swagger_auto_schema(
    method="get",
    query_serializer=CheckPassRequestSerializer,
    responses={
        200: CheckPassResponseSerializer,
        400: CheckPassResponseSerializer,
        404: CheckPassResponseSerializer,
    }
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def check_pass(request, worksession_id):
    """
    GET /api/check/pass/{worksession_id}?category=helmet
    query parameter(category)가 없으면 전체 cateogry에 대한 준수 여부 조회
    """

    employee = request.user
    category = request.query_params.get("category")

    if not WorkSession.objects.filter(id=worksession_id).exists():
        return Response(
            {"ok": False, "detail": "WorkSession not found"},
            status=404
        )

    compliances = Compliance.objects.filter(
        worksession_id=worksession_id,
        employee=employee
    )

    if category:
        category = category.upper()

        if category not in Compliance.CategoryChoices.values:
            return Response(
                {"ok": False, "detail": "Invalid category"},
                status=400
            )

        compliances = compliances.filter(target=category)

        if not compliances.exists():
            return Response(
                {
                    "ok": True,
                    "passed": False,
                    "detail": "No compliance records found"
                },
                status=200
            )

        passed = not compliances.filter(is_complied=False).exists()

        return Response({
            "ok": True,
            "passed": passed
        })

    required_categories = Compliance.CategoryChoices.values 

    passed = True
    for cat in required_categories:
        cat_compliances = compliances.filter(target=cat)

        if not cat_compliances.exists():
            passed = False
            break

        if cat_compliances.filter(is_complied=False).exists():
            passed = False
            break

    return Response({
        "ok": True,
        "passed": passed
    })