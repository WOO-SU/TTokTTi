from django.shortcuts import render

# Create your views here.
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