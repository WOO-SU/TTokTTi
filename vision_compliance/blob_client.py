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
        self._container = self._svc.get_container_client(cfg.AZURE_CONTAINER)

    def download(self, blob_name: str) -> bytes:
        """Blob에서 이미지 바이트 다운로드"""
        blob = self._container.get_blob_client(blob_name)
        return blob.download_blob().readall()

    def upload(self, image_bytes: bytes, prefix: str = "detected") -> str:
        """탐지 결과 이미지를 Blob에 업로드하고 blob_name 반환"""
        blob_name = f"{prefix}/{uuid.uuid4().hex}.jpg"
        blob = self._container.get_blob_client(blob_name)
        blob.upload_blob(
            io.BytesIO(image_bytes),
            overwrite=True,
            content_settings=ContentSettings(content_type="image/jpeg"),
        )
        return blob_name
