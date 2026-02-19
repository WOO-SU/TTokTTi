import os
from pathlib import Path

from dotenv import load_dotenv

# .env 파일 자동 로드 (config.py와 같은 폴더의 .env)
load_dotenv(Path(__file__).resolve().parent / ".env")


class Config:
    # ── Backend API ──
    BACKEND_URL = os.getenv("BACKEND_URL", "http://100.120.43.34:8000")
    API_LOGIN = "/api/user/login/"
    API_CHECK_UPLOAD = "/api/check/upload/"

    # Jetson 서비스 계정
    SERVICE_USER = os.getenv("SERVICE_USER", "jetson")
    SERVICE_PASSWORD = os.getenv("SERVICE_PASSWORD", "jetson1234")

    # ── Redis ──
    REDIS_HOST = os.getenv("REDIS_HOST", "100.120.43.34")
    REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_QUEUE = os.getenv("REDIS_QUEUE", "compliance:queue")
    REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)
    # Azure Redis typically uses SSL (port 6380); Local uses non-SSL (port 6379)
    REDIS_SSL = os.getenv("REDIS_SSL", "False").lower() in ("true", "1", "t")

    # ── Azure Blob ──
    AZURE_ACCOUNT_NAME = os.getenv("AZURE_STORAGE_ACCOUNT_NAME", "striskpulse")
    AZURE_ACCOUNT_KEY = os.getenv("AZURE_STORAGE_ACCOUNT_KEY", "/nChBh8EArARHyRIRS800i5Nlp81QjqsQF64MpmiSLM2tL0gU1+3xS4DH+GrqcGW2NdGTmOo0DOP+AStbI5Klw==")
    AZURE_CONTAINER = os.getenv("AZURE_BLOB_CONTAINER", "images")

    # ── YOLO Model ──
    MODEL_PATH = os.getenv("MODEL_PATH", "best.onnx")
    CONFIDENCE = float(os.getenv("CONFIDENCE", "0.4"))

    # 클래스 매핑 (모델 학습 시 정의한 클래스 인덱스)
    CLASS_MAP = {
        0: "glove",
        1: "helmet",
        2: "ladder",
        3: "outrigger",
        4: "person",
        5: "vest",
    }
