from typing import List, Optional
import math

from vision_fullcam.rules.base import Rule, RuleContext, Event, Debounce
from vision_fullcam.config import Config


def _bbox_center(b):
    x1, y1, x2, y2 = b
    return ((x1 + x2) / 2.0, (y1 + y2) / 2.0)


def _dist_px(b1, b2) -> float:
    c1 = _bbox_center(b1)
    c2 = _bbox_center(b2)
    return math.hypot(c2[0] - c1[0], c2[1] - c1[1])


class VehicleProximityRule(Rule):
    name = "vehicle_proximity"

    def __init__(self, cfg: Config):
        self.cfg       = cfg
        self.warn_px   = getattr(cfg, "vehicle_proximity_warn_px",   260.0)
        self.danger_px = getattr(cfg, "vehicle_proximity_danger_px", 200.0)
        self.db_sec    = getattr(cfg, "vehicle_proximity_sec",          0.6)
        self.cooldown  = getattr(cfg, "cooldown_sec",                   3.0)
        self._db_pool  = Debounce(0, 0)

    def is_active(self, ctx: RuleContext) -> bool:
        return bool(ctx.state.persons) and bool(getattr(ctx.state, "vehicles", None))

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now      = ctx.timestamp
        events: List[Event] = []
        vehicles = getattr(ctx.state, "vehicles", {})

        for pid, person in ctx.state.persons.items():
            if person.bbox is None:
                continue

            best_dist             = float("inf")
            best_vid: Optional[int] = None

            for vid, vehicle in vehicles.items():
                if vehicle.bbox is None:
                    continue
                d = _dist_px(person.bbox, vehicle.bbox)
                if d < best_dist:
                    best_dist = d
                    best_vid  = vid

            if best_vid is None:
                continue

            db = self._db_pool.setdefault(
                pid,
                Debounce(self.db_sec, self.cooldown)
            )

            if best_dist <= self.danger_px:
                if db.fire_immediate(now):
                    events.append(Event(
                        self.name, "high", pid, now,
                        {"distance_px": round(best_dist, 1), "vehicle_id": best_vid}
                    ))
                continue

            if db.check(now, best_dist <= self.warn_px):
                events.append(Event(
                    self.name, "medium", pid, now,
                    {"distance_px": round(best_dist, 1), "vehicle_id": best_vid}
                ))

        return events