from django.shortcuts import render
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_yasg.utils import swagger_auto_schema

from .models import WorkSession
from .serializers import *

@swagger_auto_schema(
    method="get",
    responses={200: WorkSessionListResponseSerializer()}
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_today_worksession(request):
    """
    GET /worksession/today
    오늘 날짜에 해당하는 나의 작업 세션 목록 반환
    """
    employee = request.user
    today = timezone.now().date()

    worksessions = WorkSession.objects.filter(
        worksession_members__user=employee,
        starts_at__date=today
    )

    serializer = WorkSessionListSerializer(worksessions, many=True)

    return Response({
        "ok": True,
        "count": worksessions.count(),
        "data": serializer.data
    })


@swagger_auto_schema(
    method="patch",
    request_body=ActivateWorkSessionRequestSerializer,
    responses={200: ActivateWorkSessionResponseSerializer}
)
@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def activate_worksession(request):
    """
    PATCH /worksession/activate - 작업 세션을 활성화하는 API입니다.
    - status: READY -> IN_PROGRESS
    - status: IN_PROGRESS -> IN_PROGRESS
    - status: DONE -> 그대로
    """
    serializer = ActivateWorkSessionRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    worksession_id = serializer.validated_data["worksession_id"]
    employee = request.user

    try:
        worksession = WorkSession.objects.get(
            id=worksession_id,
            worksession_members__user=employee
        )
    except WorkSession.DoesNotExist:
        return Response(
            {"ok": False, "detail": "WorkSession not found"},
            status=404
        )

    if worksession.status == WorkSession.StatusChoices.READY:
        worksession.status = WorkSession.StatusChoices.IN_PROGRESS
        worksession.save()

    elif worksession.status == WorkSession.StatusChoices.DONE:
        return Response(
            {
                "ok": False,
                "status": worksession.status,
                "detail": "이미 종료된 작업입니다."
            },
            status=400
        )

    return Response(
        {
            "ok": True,
            "status": worksession.status,
        }
    )
