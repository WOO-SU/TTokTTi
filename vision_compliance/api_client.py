"""백엔드 API 클라이언트 (JWT 인증 포함)"""

import requests

from config import Config


class APIClient:
    def __init__(self, cfg: Config):
        self.base_url = cfg.BACKEND_URL
        self.user = cfg.SERVICE_USER
        self.password = cfg.SERVICE_PASSWORD
        self.access_token: str | None = None
        self.refresh_token: str | None = None

    def _login(self):
        """서비스 계정으로 로그인하여 JWT 토큰 획득"""
        res = requests.post(
            f"{self.base_url}{Config.API_LOGIN}",
            json={"user_name": self.user, "password": self.password},
        )
        res.raise_for_status()
        data = res.json()
        self.access_token = data["access"]
        self.refresh_token = data["refresh"]

    def _headers(self) -> dict:
        if not self.access_token:
            self._login()
        return {"Authorization": f"Bearer {self.access_token}"}

    def _request_with_retry(self, method: str, url: str, **kwargs) -> requests.Response:
        """403/401 시 토큰 재발급 후 재시도"""
        res = requests.request(method, url, headers=self._headers(), **kwargs)
        if res.status_code in (401, 403):
            self._login()
            res = requests.request(method, url, headers=self._headers(), **kwargs)
        res.raise_for_status()
        return res

    def upload_result(self, compliance_id: int, detected_image: str, is_complied: bool):
        """
        POST /api/check/upload/
        탐지 결과를 백엔드에 업로드 → DB 반영 → 프론트 폴링이 결과를 받게 됨
        """
        self._request_with_retry(
            "POST",
            f"{self.base_url}{Config.API_CHECK_UPLOAD}",
            json={
                "compliance_id": compliance_id,
                "detected_image": detected_image,
                "is_complied": is_complied,
            },
        )
