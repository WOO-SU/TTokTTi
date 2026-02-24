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

def make_upload_sas(filename: str | None = None, content_type: str | None = None, container: str | None = None):
    """
    프론트가 직접 업로드할 blob에 대한 write/create SAS URL 발급
    container: 업로드할 컨테이너 (compliance, target, assessment 등)
    """
    if not filename:
        filename = f"{uuid.uuid4().hex}"

    target_container = container or CONTAINER
    expiry = _utcnow() + timedelta(minutes=TTL_MIN)

    sas = generate_blob_sas(
        account_name=ACCOUNT,
        container_name=target_container,
        blob_name=filename,
        account_key=KEY,
        permission=BlobSasPermissions(write=True, create=True),
        expiry=expiry,
    )

    url = f"https://{ACCOUNT}.blob.core.windows.net/{target_container}/{filename}?{sas}"
    # DB에 저장할 blob_name은 container/filename 형태 (읽기 시 컨테이너 파싱용)
    blob_name_with_container = f"{target_container}/{filename}"
    return {
        "blob_name": blob_name_with_container,
        "container": target_container,
        "upload_url": url,
        "expires_at": expiry.isoformat(),
        "recommended_method": "PUT",
        "content_type": content_type or "application/octet-stream",
    }

def make_read_sas(blob_name: str):
    """
    blob_name이 'container/filename' 형태면 해당 컨테이너에서 읽고,
    아니면 기본 CONTAINER에서 읽음
    """
    if "/" in blob_name:
        target_container, actual_blob = blob_name.split("/", 1)
    else:
        target_container = CONTAINER
        actual_blob = blob_name

    expiry = _utcnow() + timedelta(minutes=TTL_MIN)

    sas = generate_blob_sas(
        account_name=ACCOUNT,
        container_name=target_container,
        blob_name=actual_blob,
        account_key=KEY,
        permission=BlobSasPermissions(read=True),
        expiry=expiry,
    )
    url = f"https://{ACCOUNT}.blob.core.windows.net/{target_container}/{actual_blob}?{sas}"
    return {"download_url": url, "expires_at": expiry.isoformat()}
