# vision_fullcam/rules/ladder_rules.py
from typing import List
import math

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

def ladder_tilt_deg(b):
    """
    MVP: bbox 기반 기울기 근사
    (2차에서 Hough line으로 교체 가능)
    """
    x1, y1, x2, y2 = b
    dx = abs(x2 - x1)
    dy = max(1, abs(y2 - y1))
    # 수직 대비 기울기
    return abs(math.degrees(math.atan2(dx, dy)))


# -----------------------
# Ladder Tilt Rule
# -----------------------
class LadderTiltRule(Rule):
    name = "ladder_tilt"

    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.db = Debounce(cfg.ladder_tilt_sec, cfg.cooldown_sec)

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now = ctx.timestamp
        events: List[Event] = []

        for l in ctx.state.ladders.values():
            if l.bbox is None:
                continue

            angle = ladder_tilt_deg(l.bbox)
            l.tilt_hist.append(angle)

            # 경고 / 위험 단계
            cond = angle > self.cfg.ladder_tilt_warn_deg
            if self.db.check(now, cond):
                sev = "high" if angle > self.cfg.ladder_tilt_danger_deg else "medium"
                events.append(
                    Event(
                        self.name,
                        sev,
                        l.id,
                        now,
                        {"tilt_deg": angle},
                    )
                )
        return events


# -----------------------
# Ladder Movement With Person Rule
# -----------------------
class LadderMovementWithPersonRule(Rule):
    name = "ladder_movement_with_person"

    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.db = Debounce(cfg.ladder_move_sec, cfg.cooldown_sec)

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now = ctx.timestamp
        events: List[Event] = []

        # ✅ 핵심: "사람이 사다리 위에 있는가?"
        on_ladder_any = any(
            (len(p.on_ladder_hist) > 0 and p.on_ladder_hist[-1])
            for p in ctx.state.persons.values()
        )

        if not on_ladder_any:
            return []

        for l in ctx.state.ladders.values():
            if len(l.bbox_hist) < 2:
                continue

            b1 = l.bbox_hist[-2]
            b2 = l.bbox_hist[-1]
            move_px = bbox_move_px(b1, b2)

            cond = move_px > self.cfg.ladder_move_px

            if self.db.check(now, cond):
                events.append(
                    Event(
                        self.name,
                        "high",
                        l.id,
                        now,
                        {"move_px": move_px},
                    )
                )

        return events
