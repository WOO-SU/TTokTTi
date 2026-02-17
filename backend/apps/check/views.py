from django.shortcuts import render

from drf_yasg.utils import swagger_auto_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Compliance, Photo
from .serializers import (
    ComplianceSerializer, 
    ComplianceRequestSerializer,
    ComplianceResultSerializer, 
    CheckUpdateResponseSerializer, 
    UploadResultResponseSerializer, 
    RequestDetectionResponseSerializer,
    TargetPhotoRequestSerializer
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
@permission_classes([IsAuthenticated])
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
        compliance.is_updated = True
        compliance.save(update_fields=["detected_image", "is_complied", "is_updated"])
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
    request body: { "target": "helmet", "original_image": "blob 이미지 경로" }   
    """
    serializer = ComplianceRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = request.user
    worksession_id = request.data.get("worksession_id")
    target = serializer.validated_data["target"]
    original_image = serializer.validated_data["original_image"]

    # Compliance 레코드 생성
    compliance = Compliance.objects.create(
        worksession_id=worksession_id,
        employee=user,
        target=target,
        original_image=original_image
    )

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