from __future__ import annotations
from typing import List, Optional
from vision_fullcam.rules.base import Rule, RuleContext, Event, Debounce
from vision_fullcam.config import Config


def _recent(hist, now: float, sec: float):
    """hist: deque of dict with 'ts'"""
    if not hist:
        return []
    t_min = now - sec
    out = []
    for item in reversed(hist):
        ts = item.get("ts", None)
        if ts is None:
            continue
        if ts < t_min:
            break
        out.append(item)
    return list(reversed(out))


def _median(vals: List[float]) -> Optional[float]:
    v = [x for x in vals if x is not None]
    if not v:
        return None
    v.sort()
    n = len(v)
    m = n // 2
    if n % 2 == 1:
        return v[m]
    return 0.5 * (v[m - 1] + v[m])


class FallDetectionRule(Rule):
    name = "fall_detected"

    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.db = Debounce(cfg.fall_sec, cfg.cooldown_sec)

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now = float(ctx.timestamp)
        events: List[Event] = []

        for p in ctx.state.persons.values():
            hist = _recent(p.pose_hist, now, self.cfg.fall_window_sec)
            if len(hist) < 5:
                continue

            # keypoint confidence gate (optional)
            if self.cfg.fall_min_kp_conf > 0:
                confs = [h.get("kp_conf", 1.0) for h in hist]
                if sum(c >= self.cfg.fall_min_kp_conf for c in confs) < max(3, len(confs)//2):
                    continue

            h0, h1 = hist[0], hist[-1]

            hip0, hip1 = h0.get("hip_y"), h1.get("hip_y")
            if hip0 is None or hip1 is None:
                continue

            ts0 = float(h0.get("ts", now - self.cfg.fall_window_sec))
            ts1 = float(h1.get("ts", now))
            dt = max(1e-3, ts1 - ts0)

            drop_px = hip1 - hip0  # y 아래로 증가 가정
            drop_speed = drop_px / dt

            tilt = h1.get("tilt_deg", None)
            aspect_med = _median([h.get("aspect", None) for h in hist])

            # ---- candidate ----
            cond_drop = (drop_px >= self.cfg.fall_drop_px) and (drop_speed >= self.cfg.fall_drop_speed_px_per_s)
            cond_tilt = (tilt is not None) and (tilt >= self.cfg.fall_tilt_deg)
            cond_aspect = (aspect_med is not None) and (aspect_med <= self.cfg.fall_aspect_max)

            candidate = cond_drop and (cond_tilt or cond_aspect)
            if not candidate:
                continue

            # ---- confirm: immobility after candidate ----
            post = _recent(p.pose_hist, now, self.cfg.fall_immobile_sec)
            if len(post) < 4:
                continue

            moves = []
            prev = post[0].get("hip_y", None)
            for it in post[1:]:
                cur = it.get("hip_y", None)
                if prev is not None and cur is not None:
                    moves.append(abs(cur - prev))
                prev = cur

            immobile = (_median(moves) or 0.0) <= self.cfg.fall_immobile_px

            if self.db.check(now, immobile):
                events.append(
                    Event(
                        self.name,
                        "high",
                        p.id,
                        now,
                        {
                            "drop_px": float(drop_px),
                            "drop_speed_px_per_s": float(drop_speed),
                            "tilt_deg": float(tilt) if tilt is not None else None,
                            "aspect_med": float(aspect_med) if aspect_med is not None else None,
                        },
                    )
                )

        return events