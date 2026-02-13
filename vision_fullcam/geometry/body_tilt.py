import math

def mean_xy(a, b):
    return ((a[0] + b[0]) / 2.0, (a[1] + b[1]) / 2.0)

def body_tilt_deg(kps):
    # MoveNet index
    ls, rs = kps[5], kps[6]
    lh, rh = kps[11], kps[12]

    if min(ls[2], rs[2], lh[2], rh[2]) < 0.4:
        return None

    shoulder = mean_xy(ls, rs)
    hip = mean_xy(lh, rh)

    vx = shoulder[0] - hip[0]
    vy = hip[1] - shoulder[1]

    return abs(math.degrees(math.atan2(vx, vy)))
