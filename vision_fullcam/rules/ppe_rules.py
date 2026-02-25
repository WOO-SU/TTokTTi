from typing import List
from vision_fullcam.rules.base import Rule, RuleContext, Event, Debounce
from vision_fullcam.config import Config

_MIN_HIST        = 10
_CHECK_WIN       = 15
_MISS_RATIO_THRESH = 0.7


def _miss_ratio(hist: list, window: int) -> float:
    recent = hist[-window:]
    return recent.count(False) / len(recent)


class HelmetNotWornRule(Rule):
    name = "helmet_not_worn"

    def __init__(self, cfg: Config):
        self.cfg = cfg
        self._db_pool = Debounce(0, 0)

    def is_active(self, ctx: RuleContext) -> bool:
        return ctx.state.has_person()

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now    = ctx.timestamp
        events = []

        for person in ctx.state.persons.values():
            hist = list(person.helmet_hist)
            if len(hist) < _MIN_HIST:
                continue

            ratio = _miss_ratio(hist, _CHECK_WIN)
            db = self._db_pool.setdefault(
                person.id,
                Debounce(self.cfg.ppe_missing_sec, self.cfg.cooldown_sec)
            )

            if db.check(now, ratio > _MISS_RATIO_THRESH):
                events.append(Event(
                    self.name, "medium", person.id, now,
                    {"miss_ratio": round(ratio, 2)}
                ))

        return events


class SafetyVestNotWornRule(Rule):
    name = "safety_vest_not_worn"

    def __init__(self, cfg: Config):
        self.cfg = cfg
        self._db_pool = Debounce(0, 0)

    def is_active(self, ctx: RuleContext) -> bool:
        return ctx.state.has_person()

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now    = ctx.timestamp
        events = []

        for person in ctx.state.persons.values():
            hist = list(person.vest_hist)
            if len(hist) < _MIN_HIST:
                continue

            ratio = _miss_ratio(hist, _CHECK_WIN)
            db = self._db_pool.setdefault(
                person.id,
                Debounce(self.cfg.ppe_missing_sec, self.cfg.cooldown_sec)
            )

            if db.check(now, ratio > _MISS_RATIO_THRESH):
                events.append(Event(
                    self.name, "medium", person.id, now,
                    {"miss_ratio": round(ratio, 2)}
                ))

        return events