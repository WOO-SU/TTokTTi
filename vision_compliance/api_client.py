"""백엔드 API 클라이언트 (JWT 인증 포함)"""

import requests

from config import Config


class APIClient:
    def __init__(self, cfg: Config):
        self.base_url = cfg.BACKEND_URL
        self.api_key = cfg.JETSON_API_KEY

    def _headers(self) -> dict:
        return {"X-JETSON-API-KEY": self.api_key}

    def _request_with_retry(self, method: str, url: str, **kwargs) -> requests.Response:
        """API Key 방식에서는 재시도(로그인) 로직 없이 바로 요청"""
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
