from typing import List, Optional, Tuple
import numpy as np

from vision_fullcam.rules.base import Rule, RuleContext, Event, Debounce
from vision_fullcam.config import Config


class ExcessiveBodyTiltRule(Rule):
    name = "excessive_body_tilt"

    _MIN_HIST   = 5
    _MEDIAN_WIN = 7

    def __init__(self, cfg: Config):
        self.cfg = cfg
        self._db_pool = Debounce(0, 0)

    def is_active(self, ctx: RuleContext) -> bool:
        return ctx.state.person_on_ladder()

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now    = ctx.timestamp
        events = []

        for person in ctx.state.persons.values():
            hist = list(person.pose_hist)
            if len(hist) < self._MIN_HIST:
                continue

            tilt_values = [
                h["tilt_deg"] for h in hist[-self._MEDIAN_WIN:]
                if h.get("tilt_deg") is not None
            ]
            if not tilt_values:
                continue

            tilt = float(np.median(tilt_values))

            db = self._db_pool.setdefault(
                person.id,
                Debounce(self.cfg.body_tilt_sec, self.cfg.cooldown_sec)
            )

            if db.check(now, tilt > self.cfg.body_tilt_deg):
                events.append(Event(
                    self.name, "medium", person.id, now,
                    {"tilt_deg": round(tilt, 1)}
                ))

        return events


class TopStepUsageRule(Rule):
    name = "top_step_usage"

    def __init__(self, cfg: Config):
        self.cfg = cfg
        self._db_pool = Debounce(0, 0)

    def is_active(self, ctx: RuleContext) -> bool:
        return ctx.state.person_on_ladder()

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now           = ctx.timestamp
        events        = []
        top_step_zone = getattr(ctx.task, "top_step_zone", None)

        if not top_step_zone:
            return events

        for person in ctx.state.persons.values():
            kps = ctx.keypoints_map.get(person.id)
            db  = self._db_pool.setdefault(
                person.id,
                Debounce(self.cfg.top_step_sec, self.cfg.cooldown_sec)
            )

            if not kps:
                db.reset()
                continue

            left_ankle:  Optional[Tuple] = kps.get("left_ankle")
            right_ankle: Optional[Tuple] = kps.get("right_ankle")

            if not left_ankle and not right_ankle:
                db.reset()
                continue

            in_zone = (
                (left_ankle  and self._in_zone(left_ankle,  top_step_zone)) or
                (right_ankle and self._in_zone(right_ankle, top_step_zone))
            )

            if db.check(now, in_zone):
                events.append(Event(
                    self.name, "medium", person.id, now,
                    {
                        "left_ankle":    left_ankle,
                        "right_ankle":   right_ankle,
                        "top_step_zone": top_step_zone,
                    }
                ))

        return events

    @staticmethod
    def _in_zone(point: Tuple[float, float], zone: Tuple[float, float, float, float]) -> bool:
        x, y = point
        x1, y1, x2, y2 = zone
        return x1 <= x <= x2 and y1 <= y <= y2