# backend/apps/incident/views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .serializers import (
    FallJudgeRequestSerializer,
    FallJudgeResponseSerializer,
)
from .llm.judge import judge_fall_with_images


# 🔹 Swagger request example
request_example = {
    "images": [
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...1",
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...2",
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...3",
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...4",
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...5",
    ]
}

# 🔹 Swagger response example
response_example = {
    "is_fall_or_imminent_fall": True,
    "confidence": 0.84,
    "reasoning": (
        "Across the image sequence, the person progressively loses balance "
        "with forward body movement and no visible recovery posture, "
        "indicating an imminent fall."
    ),
}


@swagger_auto_schema(
    method="post",
    operation_summary="Fall / Imminent Fall Judgment (Image-only)",
    operation_description="""
Determines whether a sequence of **exactly 5 images**
represents a real fall or an imminent fall situation.

- Images must be provided in chronological order (oldest → newest)
- Only image data is used (no metadata)
""",
    request_body=FallJudgeRequestSerializer,
    responses={
        200: openapi.Response(
            description="Judgment result",
            schema=FallJudgeResponseSerializer,
            examples={"application/json": response_example},
        ),
        400: "Bad Request",
        500: "Internal Server Error",
    },
    examples={"application/json": request_example},
    tags=["Incident"],
)
@api_view(["POST"])
def judge_fall(request):
    serializer = FallJudgeRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        result = judge_fall_with_images(serializer.validated_data)
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(result, status=status.HTTP_200_OK)