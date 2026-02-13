from django.urls import path, include

urlpatterns = [
    # /api/user/... 로 user 앱의 JWT 라우트 연결
    path("user/", include("apps.user.urls")),
    path("risk/", include("apps.risk.urls")), 
    path("check/", include("apps.check.urls")),
    path("detect/", include("apps.detect.urls"))
]