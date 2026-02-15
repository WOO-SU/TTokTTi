# vision/rules/ppe_rules.py
from typing import List
from vision_fullcam.rules.base import Rule, RuleContext, Event, Debounce
from vision_fullcam.config import Config

class HelmetNotWornRule(Rule):
    name = "helmet_not_worn"

    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.db_dict = {}  # person별 debounce 관리
    
    def is_active(self, ctx):
        return ctx.state.has_person()

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now = ctx.timestamp
        events = []

        for p in ctx.state.persons.values():
            if len(p.helmet_hist) < 10:
                continue

            recent = list(p.helmet_hist)[-10:]
            miss_ratio = recent.count(False) / len(recent)
            cond = miss_ratio > 0.7

            db = self.db_dict.setdefault(
                p.id,
                Debounce(self.cfg.ppe_missing_sec, self.cfg.cooldown_sec)
            )

            if db.check(now, cond):
                events.append(
                    Event(self.name, "medium", p.id, now, {"miss_ratio": float(miss_ratio)})
                )

        return events


class SafetyVestNotWornRule(Rule):
    name = "safety_vest_not_worn"

    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.db_dict = {}
    
    def is_active(self, ctx):
        return ctx.state.has_person()

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now = ctx.timestamp
        events = []

        for p in ctx.state.persons.values():
            if len(p.vest_hist) < 10:
                continue

            recent = list(p.vest_hist)[-10:]
            miss_ratio = recent.count(False) / len(recent)
            cond = miss_ratio > 0.7

            db = self.db_dict.setdefault(
                p.id,
                Debounce(self.cfg.ppe_missing_sec, self.cfg.cooldown_sec)
            )

            if db.check(now, cond):
                events.append(Event(
                    self.name,
                    "medium",
                    p.id,
                    now,
                    {"miss_ratio": float(miss_ratio)}
                ))

        return events