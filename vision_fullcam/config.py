from dataclasses import dataclass
from pathlib import Path


@dataclass
class Config:
    # ===== runtime =====
    use_fake_detector: bool = True
    yolo_model_path: str = "yolov8n.pt"
    camera_index: int = 0
    show_window: bool = True
    output_dir: str =  str(Path(__file__).resolve().parent / "data")

    # ===== task defaults =====
    work_mode: str = "ladder"
    expected_height_m: float = 2.0      # 테스트용
    outtrigger_required: bool = False

    # ===== monitor fps =====
    fps_monitor: int = 7
    
        # ===== fall detection =====
    fall_sec: float = 0.3                 # debounce window
    fall_window_sec: float = 0.8          # fall candidate window
    fall_immobile_sec: float = 1.2        # post-fall immobility check
    fall_immobile_px: float = 3.0         # hip_y movement threshold
    fall_drop_px: float = 35.0            # hip_y drop threshold (pixels)
    fall_drop_speed_px_per_s: float = 80.0
    fall_tilt_deg: float = 55.0
    fall_aspect_max: float = 1.1
    fall_min_kp_conf: float = 0.20

    # ===== durations (sec) =====
    ppe_missing_sec: float = 2.0
    worker_missing_sec: float = 5.0
    ladder_move_sec: float = 0.4
    ladder_tilt_sec: float = 1.0
    top_step_sec: float = 1.0
    body_tilt_sec: float = 1.2
    outtrigger_missing_sec: float = 2.5
    cooldown_sec: float = 15.0

    # ===== thresholds =====
    ladder_move_px: float = 8.0
    ladder_tilt_warn_deg: float = 15.0
    ladder_tilt_danger_deg: float = 20.0
    body_tilt_deg: float = 35.0
    ladder_height_threshold_m: float = 3.5

    # ===== clip =====
    clip_pre_sec: float = 2.0
    clip_post_sec: float = 3.0
