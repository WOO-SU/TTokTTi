"""Azure Blob Storage 다운로드 / 업로드 클라이언트"""

import io
import uuid
from azure.storage.blob import BlobServiceClient, ContentSettings

from config import Config


class BlobClient:
    def __init__(self, cfg: Config):
        self._svc = BlobServiceClient(
            account_url=f"https://{cfg.AZURE_ACCOUNT_NAME}.blob.core.windows.net",
            credential=cfg.AZURE_ACCOUNT_KEY,
        )
        self._default_container = cfg.AZURE_CONTAINER

    def _resolve(self, blob_name: str):
        """blob_name이 'container/filename' 형태면 컨테이너를 분리, 아니면 기본 컨테이너 사용"""
        if "/" in blob_name:
            container, actual_blob = blob_name.split("/", 1)
            return self._svc.get_container_client(container), actual_blob
        return self._svc.get_container_client(self._default_container), blob_name

    def download(self, blob_name: str) -> bytes:
        """Blob에서 이미지 바이트 다운로드"""
        container, actual_blob = self._resolve(blob_name)
        blob = container.get_blob_client(actual_blob)
        return blob.download_blob().readall()

    def upload(self, image_bytes: bytes, prefix: str = "detected") -> str:
        """탐지 결과 이미지를 Blob에 업로드하고 blob_name 반환"""
        filename = f"{prefix}_{uuid.uuid4().hex}.jpg"
        container = self._svc.get_container_client("compliance")
        blob = container.get_blob_client(filename)
        blob.upload_blob(
            io.BytesIO(image_bytes),
            overwrite=True,
            content_settings=ContentSettings(content_type="image/jpeg"),
        )
        return f"compliance/{filename}"
