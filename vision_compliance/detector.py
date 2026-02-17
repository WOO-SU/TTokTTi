from __future__ import annotations
"""YOLO 기반 장비 탐지 + 결과 이미지 생성"""

import cv2
import numpy as np
from ultralytics import YOLO

from config import Config


class ComplianceDetector:
    def __init__(self, cfg: Config):
        self.model = YOLO(cfg.MODEL_PATH)
        self.conf = cfg.CONFIDENCE
        self.cls_map = cfg.CLASS_MAP

    def detect(self, image_bytes: bytes, target: str) -> tuple[bool, bytes]:
        """
        이미지에서 target 장비를 탐지한다.

        Args:
            image_bytes: 원본 이미지 바이트
            target: 탐지 대상 (helmet, safety_vest, safety_shoes, glove)

        Returns:
            (is_complied, detected_image_bytes)
            - is_complied: target이 감지되면 True
            - detected_image_bytes: 바운딩박스가 그려진 결과 이미지
        """
        # 바이트 → numpy 배열
        arr = np.frombuffer(image_bytes, dtype=np.uint8)
        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)

        # YOLO 추론
        results = self.model(frame, conf=self.conf, verbose=False)[0]

        is_complied = False

        for xyxy, cls_id, conf in zip(
            results.boxes.xyxy, results.boxes.cls, results.boxes.conf
        ):
            c = int(cls_id)
            label = self.cls_map.get(c)
            if label is None:
                continue

            x1, y1, x2, y2 = map(int, xyxy.tolist())
            score = float(conf)

            # 바운딩박스 그리기
            color = (0, 255, 0) if label == target else (200, 200, 200)
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(
                frame,
                f"{label} {score:.2f}",
                (x1, y1 - 8),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                color,
                2,
            )

            # target과 일치하면 적합 판정
            if label == target:
                is_complied = True

        # numpy → JPEG 바이트
        _, buf = cv2.imencode(".jpg", frame)
        detected_bytes = buf.tobytes()

        return is_complied, detected_bytes
