import os, sys
from azure.storage.blob import BlobServiceClient

conn = os.environ["AZURITE_CONNECTION_STRING"]
container = "media"
blob_name = "test.jpg"
local_path = "/app/test.jpg"

if not os.path.exists(local_path):
    print("❌ /app/test.jpg 없음. backend 폴더에 test.jpg 넣어줘.")
    sys.exit(1)

svc = BlobServiceClient.from_connection_string(conn)
cc = svc.get_container_client(container)
try:
    cc.create_container()
except Exception:
    pass

with open(local_path, "rb") as f:
    cc.upload_blob(name=blob_name, data=f, overwrite=True)

print("✅ uploaded:", container, blob_name)
