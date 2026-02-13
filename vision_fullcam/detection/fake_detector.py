# vision_fullcam/detection/fake_detector.py
from dataclasses import dataclass
from typing import List, Tuple
import time

BBox = Tuple[int, int, int, int]  # x1,y1,x2,y2


@dataclass
class Detection:
    label: str
    bbox: BBox
    score: float = 0.99


class FakeDetector:
    """
    YOLO 없이도 파이프라인 검증용 Fake Detector.

    modes:
      - normal
      - no_helmet
      - no_vest
      - one_person
      - ladder_move
      - tilted_ladder
      - outtrigger_missing  (의도적으로 outtrigger det를 뿌리지 않음)
      - outtrigger_deployed (outtrigger det를 뿌림)
    """

    def __init__(self, fps: float = 10.0):
        self.fps = fps
        self.t0 = time.time()
        self.mode = "normal"

    def set_mode(self, mode: str):
        self.mode = mode

    def detect(self, frame) -> List[Detection]:
        h, w = frame.shape[:2]
        t = time.time() - self.t0

        # =========================
        # 1) 사람 bbox (기본 2명)
        # =========================
        # person1을 ladder와 겹치게 해서 on_ladder=True가 나오기 쉬운 위치로 둠
        person1 = (int(0.42 * w), int(0.20 * h), int(0.57 * w), int(0.92 * h))
        person2 = (int(0.10 * w), int(0.20 * h), int(0.25 * w), int(0.92 * h))

        # =========================
        # 2) 사다리 bbox
        # =========================
        ladder_x_shift = 0
        if self.mode == "ladder_move":
            # 0.2초마다 12px 이동 느낌 (cfg.ladder_move_px=8이면 잘 걸림)
            ladder_x_shift = int((t * 5) % 2) * 12

        # 기본 사다리: 세로로 길게 (tilt 작게)
        ladder = (
            int(0.46 * w) + ladder_x_shift,
            int(0.12 * h),
            int(0.54 * w) + ladder_x_shift,
            int(0.92 * h),
        )

        if self.mode == "tilted_ladder":
            # tilt 룰은 bbox의 dx/dy로 근사하니까
            # x폭(dx)을 일부러 크게 만들어 angle이 커지게 함.
            # (warn=15deg 넘기기 쉽게)
            ladder = (
                int(0.40 * w),
                int(0.25 * h),
                int(0.72 * w),   # x폭 크게!
                int(0.85 * h),
            )

        # =========================
        # 3) PPE bbox (person1 기준)
        # =========================
        ph = person1[3] - person1[1]
        helmet1 = (person1[0] + 20, person1[1] + 10, person1[0] + 70, person1[1] + 60)
        vest1 = (
            person1[0] + 15,
            int(person1[1] + 0.25 * ph),
            person1[0] + 95,
            int(person1[1] + 0.65 * ph),
        )

        # =========================
        # 4) outtrigger bbox
        # =========================
        # outtrigger는 장비/형태가 다양하지만 테스트 목적상 "있다/없다"만 확인하면 됨.
        outtrigger = (int(0.60 * w), int(0.80 * h), int(0.75 * w), int(0.92 * h))

        dets: List[Detection] = []

        # 사람 수 테스트
        if self.mode == "one_person":
            dets.append(Detection("person", person1))
        else:
            dets.append(Detection("person", person1))
            dets.append(Detection("person", person2))

        # 사다리(대부분 모드에서 존재)
        dets.append(Detection("ladder", ladder))

        # PPE 미착용 모드별 누락
        if self.mode != "no_helmet":
            dets.append(Detection("helmet", helmet1))
        if self.mode != "no_vest":
            dets.append(Detection("safety_vest", vest1))

        # outtrigger 모드
        # - outtrigger_missing: 일부러 아무 것도 안 넣음 (required=True일 때 미전개 이벤트가 떠야 정상)
        # - outtrigger_deployed: outtrigger det 넣어서 정상 상태 확인
        if self.mode == "outtrigger_deployed":
            dets.append(Detection("outtrigger", outtrigger))

        return dets
