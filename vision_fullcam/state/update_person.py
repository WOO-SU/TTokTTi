from vision_fullcam.geometry.body_tilt import body_tilt_deg
from vision_fullcam.state.person_state import PersonState

def update_person_state(person: PersonState, kps, now):
    """
    kps: dict[str, KeyPoint]  (movenet infer 결과)
    now: float seconds (timestamp)
    """
    tilt = body_tilt_deg(kps)
    if tilt is None:
        return

    # --- 낙상용 추가 피처 ---
    try:
        ls, rs = kps["left_shoulder"], kps["right_shoulder"]
        lh, rh = kps["left_hip"], kps["right_hip"]
    except KeyError:
        return

    hip_y = (lh.y + rh.y) / 2.0
    shoulder_y = (ls.y + rs.y) / 2.0
    kp_conf = float(min(ls.confidence, rs.confidence, lh.confidence, rh.confidence))

    aspect = None
    if person.bbox is not None:
        x1, y1, x2, y2 = person.bbox
        bbox_h = max(1.0, float(y2 - y1))
        bbox_w = max(1.0, float(x2 - x1))
        aspect = bbox_h / bbox_w  # 서있으면 큼, 누우면 작아짐

    person.pose_hist.append({
        "tilt_deg": float(tilt),
        "ts": float(now),
        "hip_y": float(hip_y),
        "shoulder_y": float(shoulder_y),
        "aspect": float(aspect) if aspect is not None else None,
        "kp_conf": kp_conf,
    })