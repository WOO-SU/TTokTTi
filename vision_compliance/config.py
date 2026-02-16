import os


class Config:
    # ── Backend API ──
    BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
    API_LOGIN = "/api/user/login/"
    API_CHECK_UPLOAD = "/api/check/upload/"

    # Jetson 서비스 계정
    SERVICE_USER = os.getenv("SERVICE_USER", "jetson")
    SERVICE_PASSWORD = os.getenv("SERVICE_PASSWORD", "jetson1234")

    # ── Redis ──
    REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_QUEUE = os.getenv("REDIS_QUEUE", "compliance:queue")
    REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)
    # Azure Redis typically uses SSL (port 6380); Local uses non-SSL (port 6379)
    REDIS_SSL = os.getenv("REDIS_SSL", "False").lower() in ("true", "1", "t")

    # ── Azure Blob ──
    AZURE_ACCOUNT_NAME = os.getenv("AZURE_STORAGE_ACCOUNT_NAME", "")
    AZURE_ACCOUNT_KEY = os.getenv("AZURE_STORAGE_ACCOUNT_KEY", "")
    AZURE_CONTAINER = os.getenv("AZURE_BLOB_CONTAINER", "images")

    # ── YOLO Model ──
    MODEL_PATH = os.getenv("MODEL_PATH", "best.pt")
    CONFIDENCE = float(os.getenv("CONFIDENCE", "0.4"))

    # 클래스 매핑 (모델 학습 시 정의한 클래스 인덱스)
    CLASS_MAP = {
        0: "helmet",
        1: "safety_vest",
        2: "safety_shoes",
        3: "glove",
    }
