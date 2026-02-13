from typing import Dict, Tuple
import cv2
import numpy as np
import tensorflow as tf
import os
from ..rules.base import Pose, KeyPoint

# MoveNet keypoint index
KEYPOINT_NAMES = [
    "nose",
    "left_eye", "right_eye",
    "left_ear", "right_ear",
    "left_shoulder", "right_shoulder",
    "left_elbow", "right_elbow",
    "left_wrist", "right_wrist",
    "left_hip", "right_hip",
    "left_knee", "right_knee",
    "left_ankle", "right_ankle",
]

class PoseEstimator:
    def __init__(self, model_path: str | None = None):
        # 기본 경로: 프로젝트 내부 models 폴더
        if model_path is None:
            base_dir = os.path.dirname(__file__)
            model_path = os.path.join(
                base_dir,
                "models",
                "3.tflite",
            )

        self.interpreter = tf.lite.Interpreter(model_path=model_path)
        self.interpreter.allocate_tensors()
        self.input_details = self.interpreter.get_input_details()
        self.output_details = self.interpreter.get_output_details()

    def infer(self, frame: np.ndarray, person_bbox) -> Pose | None:
        """
        person_bbox: (x1, y1, x2, y2) -> by YOLO
        """
        h, w, _ = frame.shape
        x1, y1, x2, y2 = map(int, person_bbox)

        # --- ROI crop ---
        crop = frame[y1:y2, x1:x2]
        if crop.size == 0:
            return None

        # --- preprocess ---
        crop = cv2.resize(crop, (192, 192))
        inp = np.expand_dims(crop.astype(np.float32), axis=0)
        inp = inp / 255.0

        self.interpreter.set_tensor(self.input_details[0]["index"], inp)
        self.interpreter.invoke()

        keypoints = self.interpreter.get_tensor(
            self.output_details[0]["index"]
        )[0][0]  # (17, 3)

        kp_dict = {}

        for i, name in enumerate(KEYPOINT_NAMES):
            y, x, score = keypoints[i]

            kp_dict[name] = KeyPoint(
                x=x1 + x * (x2 - x1),
                y=y1 + y * (y2 - y1),
                confidence=float(score),
            )

        body_tilt = self._compute_body_tilt(kp_dict)

        return Pose(
            keypoints=kp_dict,
            body_tilt_deg=body_tilt,
            torso_vector=self._torso_vector(kp_dict),
        )
    # ------------------------
    # Geometry utils
    # ------------------------

    def _torso_vector(self, kp: Dict[str, KeyPoint]) -> Tuple[float, float]:
        ls, rs = kp["left_shoulder"], kp["right_shoulder"]
        lh, rh = kp["left_hip"], kp["right_hip"]

        sx = (ls.x + rs.x) / 2
        sy = (ls.y + rs.y) / 2
        hx = (lh.x + rh.x) / 2
        hy = (lh.y + rh.y) / 2

        return (hx - sx, hy - sy)

    def _compute_body_tilt(self, kp: Dict) -> float:
        vx, vy = self._torso_vector(kp)
        if vy == 0:
            return 0.0
        rad = np.arctan2(abs(vx), abs(vy))
        return float(np.degrees(rad))