from dataclasses import dataclass
from pathlib import Path


@dataclass
class Config:
    # ===== runtime =====
    use_fake_detector: bool = False
    yolo_model_path: str = "yolov8n.pt"
    camera_index= "vision_fullcam/사다리추락.mp4"
    show_window: bool = True
    output_dir: str =  str(Path(__file__).resolve().parent / "data")

    # ===== task defaults =====
    work_mode: str = "ladder"
    expected_height_m: float = 2.0      # 테스트용
    outtrigger_required: bool = False

    # ===== monitor fps =====
    fps_monitor: int = 7

    # ===== durations (sec) =====
    ppe_missing_sec: float = 2.0
    worker_missing_sec: float = 5.0
    ladder_move_sec: float = 0.4
    ladder_unstable_sec: float = 1.0
    top_step_sec: float = 1.0
    body_tilt_sec: float = 1.2
    outtrigger_missing_sec: float = 2.5
    outtrigger_not_deployed_sec: float = 1.5
    cooldown_sec: float = 15.0

    # ===== thresholds =====
    ladder_move_px: float = 8.0
    ladder_tilt_warn_deg: float = 15.0
    ladder_tilt_danger_deg: float = 20.0
    # 해상도 1080p, 30fps, 사다리 bbox 높이 ≈ 200~400px 가정
    ladder_unstable_center_px = 8.0    # warn
    ladder_danger_center_px   = 20.0   # danger (즉시 발화)

    ladder_unstable_aspect    = 0.07   # warn
    ladder_danger_aspect      = 0.20   # danger

    ladder_unstable_area_r    = 0.10   # warn (면적 10% 변화)
    body_tilt_deg: float = 35.0
    ladder_height_threshold_m: float = 3.5

    # ===== clip =====
    clip_pre_sec: float = 2.0
    clip_post_sec: float = 3.0
