from django.shortcuts import render
from django.utils.dateparse import parse_datetime
from django.db.models import OuterRef, Subquery, Value, BooleanField
from django.db.models.functions import Coalesce
from django.utils import timezone

from drf_yasg.utils import swagger_auto_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import *
from ..worksession.models import WorkSession, WorkSessionMember
from .serializers import *
@swagger_auto_schema(
    method='post',
    responses={200: SaveVideoResponseSerializer}
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def save_video(request):
    """
    "/api/detect/save": 영상 path 저장
    """
    worksession_id = request.data.get("worksession_id") # 프론트 단에서 확인할 수 있는지 검토 필요
    risk_type_id = request.data.get("risk_type_id")
    video_path = request.data.get("video_path")

    if not worksession_id:
        return Response(
            {"ok": False, "data": None, "detail": "worksession_id required"},
            status=400
        )

    if not risk_type_id:
        return Response(
            {"ok": False, "data": None, "detail": "risk_type_id required"},
            status=400
        )

    if not video_path:
        return Response(
            {"ok": False, "data": None, "detail": "video_path required"},
            status=400
        )

    try:
        worksession = WorkSession.objects.get(id=worksession_id)
    except WorkSession.DoesNotExist:
        return Response(
            {"ok": False, "data": None, "detail": "invalid worksession_id"},
            status=404
        )

    try:
        risk_type = RiskType.objects.get(id=risk_type_id)
    except RiskType.DoesNotExist:
        return Response(
            {"ok": False, "data": None, "detail": "invalid risk_type_id"},
            status=404
        )
    
    try:
        worksession = WorkSession.objects.get(id=worksession_id)
    except WorkSession.DoesNotExist:
        return Response(
            {"ok": False, "data": None, "detail": "invalid worksession_id"},
            status=404
        )

    try:
        risk_type = RiskType.objects.get(id=risk_type_id)
    except RiskType.DoesNotExist:
        return Response(
            {"ok": False, "data": None, "detail": "invalid risk_type_id"},
            status=404
        )

    video = VideoLog.objects.create(
        worksession=worksession,
        risk_type=risk_type,
        original_video=video_path
    )

    serializer = VideoSerializer(video)

    return Response(
        {"ok": True, "data": serializer.data},
        status=200
    )


@swagger_auto_schema(
    method="get",
    responses={200: VideoSearchResponseSerializer}
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def search_video(request):
    """
    "/api/detect/search": 위험 감지 영상 검색
    query params:
        - employee_id (optional)
        - worksession_id (optional)
        - start_date (optional, ISO format)
        - end_date (optional, ISO format)
        - risk_type_id (optional)
    """

    videos = VideoLog.objects.select_related(
        "worksession", "risk_type"
    ).all()

    employee_id = request.query_params.get("employee_id")
    worksession_id = request.query_params.get("worksession_id")
    start_date = request.query_params.get("start_date")
    end_date = request.query_params.get("end_date")
    risk_type_id = request.query_params.get("risk_type_id")

    if worksession_id:
        videos = videos.filter(worksession_id=worksession_id)

    if employee_id:
        videos = videos.filter(
            worksession__members__user_id=employee_id
        ).distinct()

    if start_date:
        start_dt = parse_datetime(start_date)
        if start_dt:
            videos = videos.filter(created_at__gte=start_dt)

    if end_date:
        end_dt = parse_datetime(end_date)
        if end_dt:
            videos = videos.filter(created_at__lte=end_dt)

    if risk_type_id:
        videos = videos.filter(risk_type_id=risk_type_id)

    serializer = VideoSerializer(videos, many=True)

    return Response({
        "ok": True,
        "count": videos.count(),
        "data": serializer.data
    })

@swagger_auto_schema(
    method="get",
    responses={200: CheckLogsResponseSerializer(many=True)}
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def check_logs(request):
    """
    GET "/api/detect/admin/logs/"
    관리자용 로그 확인
    """

    manager = request.user

    read_status_sq = VideoLogRead.objects.filter(
        videolog=OuterRef("pk"),
        manager=manager
    ).values("is_read")[:1]

    logs = (
        VideoLog.objects
        .select_related(
            "worksession",
            "compliance",
            "risk_type"
        )
        .annotate(
            is_read=Coalesce(
                Subquery(read_status_sq),
                Value(False),
                output_field=BooleanField()
            )
        )
        .order_by("-created_at")[:50]
    )

    result = []

    for log in logs:
        base = {
            "id": log.id,
            "status": log.status,
            "worksession_name": log.worksession.name,
            "source": log.source,
            "created_at": log.created_at,
            "is_read": log.is_read,
        }

        if log.source == VideoLog.SourceChoices.MANUAL:
            base.update({
                "compliance_id": log.compliance.id if log.compliance else None,
                "compliance_category": log.compliance.category if log.compliance else None,
            })

        elif log.source == VideoLog.SourceChoices.AUTO:
            base.update({
                "risk_type_name": log.risk_type.name if log.risk_type else None
            })

        result.append(base)

    return Response(result)

@swagger_auto_schema(
    method="get",
    responses={
        200: AutoCheckResponseSerializer,
        403: SaveVideoResponseSerializer,
        404: SaveVideoResponseSerializer,
    }
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def auto_check(request, videolog_id=None):
    """
    "/api/detect/admin/request/{videolog_id}": 관리자 위험 알림 조회
    """
    if not request.user.is_manager:
        return Response(
            {"ok": False, "detail": "Only managers can access auto check"},
            status=403
        )

    log = VideoLog.objects.select_related(
        "worksession",
        "risk_type",
    ).filter(
        id=videolog_id,
        source=VideoLog.SourceChoices.AUTO
    ).first()

    if not log or not log.risk_type:
        return Response(
            {"ok": False, "detail": "Auto check not found"},
            status=404
        )

    VideoLogRead.objects.update_or_create(
        videolog=log,
        manager=request.user,
        defaults={
            "is_read": True,
            "read_at": timezone.now(),
        }
    )

    worksession = log.worksession
    risk_type = log.risk_type

    workers = (
        WorkSessionMember.objects
        .select_related("user")
        .filter(
            worksession=worksession,
            role=WorkSessionMember.RoleChoices.WORKER
        )
        [:2]
    )

    worker_data = [
        {
            "id": member.user.id,
            "name": member.user.name,
        }
        for member in workers
    ]

    data = {
        "videolog_id": log.id,
        "status": log.status,

        "workers": worker_data,

        "worksession": {
            "id": worksession.id,
            "name": worksession.name,
        },

        "risk_type": {
            "name": risk_type.name,
        },

        "original_video": log.original_video,
        "created_at": log.created_at,
    }

    return Response({"ok": True, "data": data}, status=200)