from django.shortcuts import render
from django.utils import timezone
from django.db import models
from django.db.models import Prefetch, OuterRef, Exists, Value, Case, When, Subquery, IntegerField, Count
from django.db.models.functions import Coalesce

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_yasg.utils import swagger_auto_schema

from .models import WorkSession, WorkSessionMember
from ..check.models import Compliance
from ..report.models import PostWorkReport
from ..risk.models import RiskAssessment
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
        members__user=employee,
        starts_at__date=today
    ).order_by('starts_at')

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
            members__user=employee
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

@swagger_auto_schema(
    method="get",
    responses={200: WorkSessionCardSerializer(many=True)}
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_admin_today_worksession(request):
    """
    GET /api/worksession/admin/today/
    관리자 메인 페이지 - 오늘 작업 세션 카드 목록
    """
    today = timezone.now().date()

    latest_risk_assessment_status = RiskAssessment.objects.filter(
        worksession_id=OuterRef("pk")
    ).order_by("-created_at").values("status")[:1]

    report_exists = PostWorkReport.objects.filter(
        worksession_id=OuterRef("pk")
    )

    passed_count_subquery = (
        Compliance.objects
        .filter(
            worksession_id=OuterRef("worksession_id"),
            employee_id=OuterRef("user_id"),
            is_complied=True,
        )
        .values("worksession_id", "employee_id")
        .annotate(cnt=Count("id"))
        .values("cnt")[:1]
    )

    worker_qs = (
        WorkSessionMember.objects
        .filter(role=WorkSessionMember.RoleChoices.WORKER)
        .select_related("user")
        .annotate(
            passed_equipment_count=Coalesce(
                Subquery(passed_count_subquery),
                Value(0),
                output_field=IntegerField()
            )
        )
        .annotate(
            equipment_check_status=Case(
                When(passed_equipment_count=3, then=Value(True)),
                default=Value(False),
                output_field=models.BooleanField()
            )
        )
    )

    worksessions = (
        WorkSession.objects
        .filter(
            starts_at__date=today,
            members__user=request.user
        )
        .distinct()
        .annotate(
            # risk_asessment field (char: status)
            risk_assessment_status=Coalesce(
                Subquery(latest_risk_assessment_status),
                Value(RiskAssessment.StatusChoices.PENDING)
            ),

            # report field (boolean: exists)
            report_status=Case(
                When(Exists(report_exists), then=Value(True)),
                default=Value(False),
                output_field=models.BooleanField()
            ),
        )
        .prefetch_related( # for worker_detail
            Prefetch(
                "members",
                queryset=worker_qs,
                to_attr="worker_members"
            )
        )
    )
    
    serializer = WorkSessionCardSerializer(worksessions, many=True)
    return Response(serializer.data)