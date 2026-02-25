from typing import List, NamedTuple
import math
import numpy as np

from vision_fullcam.rules.base import Rule, RuleContext, Event, Debounce
from vision_fullcam.config import Config


def _bbox_center(b):
    x1, y1, x2, y2 = b
    return ((x1 + x2) / 2.0, (y1 + y2) / 2.0)


def _bbox_centers_dist(b1, b2) -> float:
    c1 = _bbox_center(b1)
    c2 = _bbox_center(b2)
    return math.hypot(c2[0] - c1[0], c2[1] - c1[1])


def _bbox_aspect(b) -> float:
    x1, y1, x2, y2 = b
    return abs(x2 - x1) / max(1.0, abs(y2 - y1))


def _bbox_area(b) -> float:
    x1, y1, x2, y2 = b
    return max(0.0, (x2 - x1) * (y2 - y1))


class _Signals(NamedTuple):
    center_delta: float
    aspect_delta: float
    area_delta_r: float


def _compute_signals(b_old, b_new) -> _Signals:
    center_delta = _bbox_centers_dist(b_old, b_new)
    aspect_delta = abs(_bbox_aspect(b_new) - _bbox_aspect(b_old))
    area_old     = _bbox_area(b_old)
    area_delta_r = abs(_bbox_area(b_new) - area_old) / max(1.0, area_old)
    return _Signals(center_delta, aspect_delta, area_delta_r)


def _median(values: list, window: int) -> float:
    return float(np.median(values[-window:]))


class LadderInstabilityRule(Rule):
    name = "ladder_instability"

    _MIN_HIST   = 5
    _SIGNAL_WIN = 7

    def __init__(self, cfg: Config):
        self.cfg = cfg
        self._db_pool     = Debounce(0, 0)
        self._center_hist: dict[int, list] = {}
        self._aspect_hist: dict[int, list] = {}
        self._area_hist:   dict[int, list] = {}

    def is_active(self, ctx: RuleContext) -> bool:
        return ctx.state.person_on_ladder()

    def _hists(self, lid: int):
        self._center_hist.setdefault(lid, [])
        self._aspect_hist.setdefault(lid, [])
        self._area_hist.setdefault(lid, [])
        return self._center_hist[lid], self._aspect_hist[lid], self._area_hist[lid]

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now    = ctx.timestamp
        events: List[Event] = []

        for ladder in ctx.state.ladders.values():
            bbox_hist = list(ladder.bbox_hist)
            if len(bbox_hist) < 2:
                continue

            sig = _compute_signals(bbox_hist[-2], bbox_hist[-1])

            ch, ah, rh = self._hists(ladder.id)
            ch.append(sig.center_delta)
            ah.append(sig.aspect_delta)
            rh.append(sig.area_delta_r)

            if len(ch) < self._MIN_HIST:
                continue

            center = _median(ch, self._SIGNAL_WIN)
            aspect = _median(ah, self._SIGNAL_WIN)
            area_r = _median(rh, self._SIGNAL_WIN)

            db = self._db_pool.setdefault(
                ladder.id,
                Debounce(self.cfg.ladder_unstable_sec, self.cfg.cooldown_sec)
            )

            if (center > self.cfg.ladder_danger_center_px or
                    aspect > self.cfg.ladder_danger_aspect):
                if db.fire_immediate(now):
                    events.append(Event(
                        self.name, "high", ladder.id, now,
                        {
                            "center_delta_px": round(center, 1),
                            "aspect_delta":    round(aspect, 3),
                            "area_delta_r":    round(area_r, 3),
                        }
                    ))
                continue

            warn = (
                center > self.cfg.ladder_unstable_center_px or
                aspect > self.cfg.ladder_unstable_aspect     or
                area_r > self.cfg.ladder_unstable_area_r
            )
            if db.check(now, warn):
                events.append(Event(
                    self.name, "medium", ladder.id, now,
                    {
                        "center_delta_px": round(center, 1),
                        "aspect_delta":    round(aspect, 3),
                        "area_delta_r":    round(area_r, 3),
                    }
                ))

        return events


class LadderMovementWithPersonRule(Rule):
    name = "ladder_movement_with_person"

    _MOVE_WINDOW     = 10
    _ON_LADDER_CHECK = 5

    def __init__(self, cfg: Config):
        self.cfg = cfg
        self._db_pool = Debounce(0, 0)

    def is_active(self, ctx: RuleContext) -> bool:
        return ctx.state.person_on_ladder()

    def _person_stably_on_ladder(self, ctx: RuleContext) -> bool:
        for person in ctx.state.persons.values():
            hist = list(person.on_ladder_hist)
            if not hist:
                continue
            recent = hist[-self._ON_LADDER_CHECK:]
            if recent.count(True) > len(recent) / 2:
                return True
        return False

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now    = ctx.timestamp
        events: List[Event] = []

        if not self._person_stably_on_ladder(ctx):
            return events

        for ladder in ctx.state.ladders.values():
            bbox_hist = list(ladder.bbox_hist)
            if len(bbox_hist) < self._MOVE_WINDOW:
                continue

            move_px = _bbox_centers_dist(
                bbox_hist[-self._MOVE_WINDOW],
                bbox_hist[-1]
            )

            db = self._db_pool.setdefault(
                ladder.id,
                Debounce(self.cfg.ladder_move_sec, self.cfg.cooldown_sec)
            )

            if db.check(now, move_px > self.cfg.ladder_move_px):
                events.append(Event(
                    self.name, "high", ladder.id, now,
                    {
                        "move_px":       round(move_px, 1),
                        "window_frames": self._MOVE_WINDOW,
                    }
                ))

        return events