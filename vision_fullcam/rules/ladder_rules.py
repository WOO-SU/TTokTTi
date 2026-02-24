from typing import List
import math
import numpy as np

from vision_fullcam.rules.base import Rule, RuleContext, Event, Debounce
from vision_fullcam.config import Config


# -----------------------
# utils
# -----------------------
def bbox_center(b):
    x1, y1, x2, y2 = b
    return ((x1 + x2) / 2.0, (y1 + y2) / 2.0)


def bbox_move_px(b1, b2) -> float:
    c1 = bbox_center(b1)
    c2 = bbox_center(b2)
    return math.hypot(c2[0] - c1[0], c2[1] - c1[1])


def ladder_tilt_deg(bbox):
    """
    사다리 bbox 기울기 각도 근사 (deg)
    """
    x1, y1, x2, y2 = bbox
    w = abs(x2 - x1)
    h = max(1, abs(y2 - y1))
    return abs(math.degrees(math.atan2(w, h)))


# -----------------------
# Ladder Tilt Rule
# -----------------------
class LadderTiltRule(Rule):
    name = "ladder_tilt"

    def __init__(self, cfg: Config):
        self.cfg = cfg
        # per-ladder debounce container
        self.db = Debounce(0.0, 0.0)
    
    def is_active(self, ctx):
        return ctx.state.person_on_ladder()

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now = ctx.timestamp
        events: List[Event] = []

        for l in ctx.state.ladders.values():
            if l.bbox is None:
                continue

            # 1) raw angle from bbox
            raw_angle = ladder_tilt_deg(l.bbox)

            # 2) push raw angle to history
            l.tilt_hist.append(raw_angle)

            # 3) robust median (deque-safe)
            hist = list(l.tilt_hist)
            if len(hist) < 3:
                # 초기 프레임 보호
                continue

            angle = float(np.median(hist[-7:]))

            # 4) per-ladder debounce
            db = self.db.setdefault(
                l.id,
                Debounce(self.cfg.ladder_tilt_sec, self.cfg.cooldown_sec)
            )

            # danger: 즉시
            if angle > self.cfg.ladder_tilt_danger_deg:
                if db.fire_immediate(now):
                    events.append(Event(
                        self.name,
                        "high",
                        l.id,
                        now,
                        {
                            "tilt_deg": angle,
                            "tilt_raw_deg": raw_angle,
                        }
                    ))
                continue

            # warn: 지속 조건
            if db.check(now, angle > self.cfg.ladder_tilt_warn_deg):
                events.append(Event(
                    self.name,
                    "medium",
                    l.id,
                    now,
                    {
                        "tilt_deg": angle,
                        "tilt_raw_deg": raw_angle,
                    }
                ))

        return events


# -----------------------
# Ladder Movement With Person Rule
# -----------------------
class LadderMovementWithPersonRule(Rule):
    name = "ladder_movement_with_person"

    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.db = Debounce(cfg.ladder_move_sec, cfg.cooldown_sec)
    
    def is_active(self, ctx):
        return ctx.state.person_on_ladder()

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now = ctx.timestamp
        events: List[Event] = []

        # 사람이 사다리 위에 있는 프레임이 하나라도 있는지
        on_ladder_any = any(
            (len(p.on_ladder_hist) > 0 and p.on_ladder_hist[-1])
            for p in ctx.state.persons.values()
        )

        if not on_ladder_any:
            return events

        for l in ctx.state.ladders.values():
            if len(l.bbox_hist) < 2:
                continue

            b1 = l.bbox_hist[-2]
            b2 = l.bbox_hist[-1]
            move_px = bbox_move_px(b1, b2)

            cond = move_px > self.cfg.ladder_move_px

            if self.db.check(now, cond):
                events.append(Event(
                    self.name,
                    "high",
                    l.id,
                    now,
                    {"move_px": move_px},
                ))

        return events