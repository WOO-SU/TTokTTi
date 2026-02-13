from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.exceptions import AuthenticationFailed

from drf_yasg.utils import swagger_auto_schema
from .serializers import LogoutSerializer, ChangePasswordSerializer, TeamCreateSerializer, TeamResponseSerializer, UserSearchSerializer, CoworkerSerializer, UserManageSerializer
from .models import User, Team

# user_name 필드를 로그인 아이디로 사용
class UserNameTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = "username"

class LoginView(TokenObtainPairView):
    serializer_class = UserNameTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        try:
            return super().post(request, *args, **kwargs)
        except AuthenticationFailed:
            return Response(
                {"detail": "아이디 혹은 비밀번호가 틀렸습니다."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

@swagger_auto_schema(
    method='post',
    request_body=LogoutSerializer,
    responses={200: 'OK'}
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    """
    클라이언트가 refresh 토큰을 보내면 blacklist 처리.
    => 사용자는 로그아웃 누르기 전까지 계속 로그인처럼 유지 가능(refresh 재발급 때문)
    """
    refresh = request.data.get("refresh")
    if not refresh:
        return Response({"detail": "refresh token required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        token = RefreshToken(refresh)
        token.blacklist()
    except Exception:
        return Response({"detail": "invalid token"}, status=status.HTTP_400_BAD_REQUEST)

    return Response({"ok": True})

# password 변경
@swagger_auto_schema(
    method='post',
    request_body=ChangePasswordSerializer,
    responses={200: 'OK'}
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    """
    current_password 확인 후 new_password로 변경(해시 저장).
    """
    current_password = request.data.get("current_password")
    new_password = request.data.get("new_password")

    if not current_password or not new_password:
        return Response(
            {"detail": "current_password and new_password required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = request.user

    if not user.check_password(current_password):
        return Response({"detail": "current_password incorrect"}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save(update_fields=["password"])

    return Response({"ok": True})

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def coworker(request):
    if request.method == "POST":
        serializer = TeamCreateSerializer(
            data=request.data,
            context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        team = serializer.save()

        response_serializer = TeamResponseSerializer(team)
        return Response(response_serializer.data, status=201)

    if request.method == "GET":
        if team.employee1 == request.user:
            coworker = team.employee2
        else:
            coworker = team.employee1

        data = {
            "id": coworker.id,
            "name": coworker.name,
            "phone_last4": coworker.phone[-4:] if coworker.phone else None,
        }

        serializer = CoworkerSerializer(data)
        return Response(serializer.data)
    
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def search_user_by_birth(request):
    birth_date = request.query_params.get("birth_date")

    if not birth_date:
        return Response(
            {"detail": "birth_date required"},
            status=400
        )

    users = User.objects.filter(birth_date=birth_date)

    serializer = UserSearchSerializer(users, many=True)

    return Response(serializer.data)



class UserManageViewSet(ModelViewSet):
    queryset = User.objects.all().order_by("-created_at")
    serializer_class = UserManageSerializer
    permission_classes = [IsAuthenticated]