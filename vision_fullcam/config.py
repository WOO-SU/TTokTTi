# vision/config.py
from dataclasses import dataclass

@dataclass
class Config:
    # monitor fps (추론 루프)
    fps_monitor: int = 7

    # 지속시간 버퍼(초)
    ppe_missing_sec: float = 2.0
    worker_missing_sec: float = 5.0
    ladder_move_sec: float = 0.4
    ladder_tilt_sec: float = 1.0
    top_step_sec: float = 1.0
    body_tilt_sec: float = 1.2
    outtrigger_missing_sec: float = 2.5

    # 임계치
    ladder_move_px: float = 8.0
    ladder_tilt_warn_deg: float = 15.0
    ladder_tilt_danger_deg: float = 20.0
    body_tilt_deg: float = 35.0

    # 이벤트 저장
    clip_pre_sec: float = 2.0
    clip_post_sec: float = 3.0
    cooldown_sec: float = 15.0

    # height 규정 (MVP: 입력값 기반)
    ladder_height_threshold_m: float = 3.5  # 예시