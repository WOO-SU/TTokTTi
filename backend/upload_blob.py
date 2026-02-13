import os, sys
from azure.storage.blob import BlobServiceClient

container = "media"
blob_name = "test.jpg"
local_path = "./test.jpg"

if not os.path.exists(local_path):
    print("❌ test.jpg 없음. backend 폴더에 넣어줘.")
    sys.exit(1)

account_name = os.environ["AZURE_STORAGE_ACCOUNT_NAME"]
account_key = os.environ["AZURE_STORAGE_ACCOUNT_KEY"]

svc = BlobServiceClient(
    account_url=f"https://{account_name}.blob.core.windows.net",
    credential=account_key
)

cc = svc.get_container_client(container)

try:
    cc.create_container()
except Exception:
    pass  # 이미 있으면 그냥 넘어감

with open(local_path, "rb") as f:
    cc.upload_blob(name=blob_name, data=f, overwrite=True)

print("✅ uploaded:", container, blob_name)
