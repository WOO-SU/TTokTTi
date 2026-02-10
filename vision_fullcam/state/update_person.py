from vision_fullcam.geometry.body_tilt import body_tilt_deg
from vision_fullcam.state.person_state import PersonState

def update_person_state(person: PersonState, kps, now):
    tilt = body_tilt_deg(kps)
    if tilt is None:
        return

    person.pose_hist.append({
        "tilt_deg": tilt,
        "ts": now
    })
