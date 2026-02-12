from django.shortcuts import render
from django.utils.dateparse import parse_datetime

from drf_yasg.utils import swagger_auto_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Video
from .serializers import VideoSerializer, SaveVideoResponseSerializer

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
    user = request.user
    is_risky = request.data.get("is_risky", False)
    video_path = request.data.get("video_path", "")

    if not video_path:
        return Response({"ok": False, "data": None, "detail": "video_path required"}, status=400)

    try:
        video = Video.objects.create(
            employee=user,
            is_risky=is_risky,
            video_path=video_path
        )
        serializer = VideoSerializer(video)
        return Response({"ok": True, "data": serializer.data})
    except Video.DoesNotExist:
        return Response({"ok": False, "data": None, "detail": "video not found"}, status=404)


@swagger_auto_schema(
    method='get',
    responses={200: VideoSerializer(many=True)}
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def search_video(request):
    """
    "/api/detect/search": 특정 영상을 검색한다. (작업자 또는 날짜로 검색 가능)
    query params:
        - employee_id (optional): 작업자 ID
        - start_date (optional): 조회 시작 날짜 (ISO 형식)
        - end_date (optional): 조회 종료 날짜 (ISO 형식)
    """
    videos = Video.objects.all()
    
    employee_id = request.query_params.get("employee_id")
    start_date = request.query_params.get("start_date")
    end_date = request.query_params.get("end_date")

    if employee_id:
        videos = videos.filter(employee_id=employee_id)
    
    if start_date:
        start_dt = parse_datetime(start_date)
        if start_dt:
            videos = videos.filter(created_at__gte=start_dt)
    
    if end_date:
        end_dt = parse_datetime(end_date)
        if end_dt:
            videos = videos.filter(created_at__lte=end_dt)
    
    serializer = VideoSerializer(videos, many=True)
    return Response({"ok": True, "data": serializer.data})