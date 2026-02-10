import numpy as np

def estimate_person_height_px(keypoints: dict) -> float | None:
    """
    keypoints: MoveNet output
    """
    try:
        ankle_y = np.mean([
            keypoints["left_ankle"][1],
            keypoints["right_ankle"][1],
        ])
        head_y = keypoints["nose"][1]
        return abs(ankle_y - head_y)
    except KeyError:
        return None

def estimate_ladder_height_m(
    ladder_bbox,
    person_height_px: float,
    assumed_person_height_m: float = 1.7,
) -> float | None:
    if person_height_px is None or person_height_px < 30:
        return None

    x1, y1, x2, y2 = ladder_bbox
    ladder_px = abs(y2 - y1)

    scale = assumed_person_height_m / person_height_px
    return ladder_px * scale
