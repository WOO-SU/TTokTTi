# apps/storage/sas.py
import os
import uuid
from datetime import datetime, timedelta, timezone

from azure.storage.blob import (
    generate_blob_sas,
    BlobSasPermissions,
)
from dotenv import load_dotenv
load_dotenv()

ACCOUNT = os.getenv("AZURE_STORAGE_ACCOUNT_NAME")
KEY = os.getenv("AZURE_STORAGE_ACCOUNT_KEY")
CONTAINER = os.getenv("AZURE_BLOB_CONTAINER", "uploads")
TTL_MIN = int(os.getenv("AZURE_SAS_TTL_MINUTES", "10"))

def _utcnow():
    return datetime.now(timezone.utc)

def make_upload_sas(filename: str | None = None, content_type: str | None = None):
    """
    프론트가 직접 업로드할 blob에 대한 write/create SAS URL 발급
    """
    if not filename:
        filename = f"{uuid.uuid4().hex}"

    expiry = _utcnow() + timedelta(minutes=TTL_MIN)

    sas = generate_blob_sas(
        account_name=ACCOUNT,
        container_name=CONTAINER,
        blob_name=filename,
        account_key=KEY,
        permission=BlobSasPermissions(write=True, create=True),
        expiry=expiry,
        # start=_utcnow() - timedelta(minutes=1)  # 시계 오차 대비 필요하면
    )

    url = f"https://{ACCOUNT}.blob.core.windows.net/{CONTAINER}/{filename}?{sas}"
    return {
        "blob_name": filename,
        "container": CONTAINER,
        "upload_url": url,
        "expires_at": expiry.isoformat(),
        "recommended_method": "PUT",
        "content_type": content_type or "application/octet-stream",
    }

def make_read_sas(blob_name: str):
    expiry = _utcnow() + timedelta(minutes=TTL_MIN)

    sas = generate_blob_sas(
        account_name=ACCOUNT,
        container_name=CONTAINER,
        blob_name=blob_name,
        account_key=KEY,
        permission=BlobSasPermissions(read=True),
        expiry=expiry,
    )
    url = f"https://{ACCOUNT}.blob.core.windows.net/{CONTAINER}/{blob_name}?{sas}"
    return {"download_url": url, "expires_at": expiry.isoformat()}
