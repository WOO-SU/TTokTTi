# -*- coding: utf-8 -*-

"""
vision_compliance worker
========================
Redis 큐에서 compliance 작업을 받아 처리하는 메인 루프.
큐 메시지 형식 (JSON):
{
    "compliance_id": 123,
    "original_image": "uploads/abc123.jpg",
    "target": "helmet"
}

실행:
    python worker.py
"""

import json
import logging
import redis

from config import Config
from blob_client import BlobClient
from detector import ComplianceDetector
from api_client import APIClient

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("compliance-worker")


def main():
    cfg = Config()

    # 초기화
    r = redis.Redis(
        host=cfg.REDIS_HOST,
        port=cfg.REDIS_PORT,
        password=cfg.REDIS_PASSWORD,
        ssl=cfg.REDIS_SSL,
        ssl_cert_reqs=None,
        decode_responses=True,
    )
    blob = BlobClient(cfg)
    detector = ComplianceDetector(cfg)
    api = APIClient(cfg)

    logger.info("Compliance worker started")
    logger.info("  Redis : %s:%s  queue=%s", cfg.REDIS_HOST, cfg.REDIS_PORT, cfg.REDIS_QUEUE)
    logger.info("  Model : %s", cfg.MODEL_PATH)
    logger.info("  Backend: %s", cfg.BACKEND_URL)

    while True:
        # 1. 큐에서 작업 대기 (BLPOP: blocking pop)
        _, raw = r.blpop(cfg.REDIS_QUEUE)
        task = json.loads(raw)

        compliance_id = task["compliance_id"]
        original_image = task["original_image"]
        # Backend sends "category", map it to "target"
        target = task["category"].lower()

        logger.info("[%d] 작업 수신 - target=%s, image=%s", compliance_id, target, original_image)

        try:
            # 2. Blob에서 원본 이미지 다운로드
            image_bytes = blob.download(original_image)
            logger.info("[%d] 이미지 다운로드 완료 (%d bytes)", compliance_id, len(image_bytes))

            # 3. YOLO 탐지 실행
            is_complied, detected_bytes = detector.detect(image_bytes, target)
            logger.info("[%d] 탐지 완료 - is_complied=%s", compliance_id, is_complied)

            # 4. 결과 이미지를 Blob에 업로드
            detected_blob_name = blob.upload(detected_bytes)
            logger.info("[%d] 결과 이미지 업로드 완료 - %s", compliance_id, detected_blob_name)

            # 5. 백엔드 API 호출 (DB 업데이트)
            api.upload_result(compliance_id, detected_blob_name, is_complied)
            logger.info("[%d] API 업데이트 완료", compliance_id)

        except Exception:
            logger.exception("[%d] 처리 실패", compliance_id)
            # 실패 시에도 백엔드에 실패 결과 전송 시도
            try:
                api.upload_result(compliance_id, "", False)
            except Exception:
                logger.exception("[%d] 실패 결과 전송도 실패", compliance_id)


if __name__ == "__main__":
    main()
