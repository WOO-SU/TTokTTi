# vision/rules/ppe_rules.py
from typing import List
from vision_fullcam.rules.base import Rule, RuleContext, Event, Debounce
from vision_fullcam.config import Config

class HelmetNotWornRule(Rule):
    name = "helmet_not_worn"
    def __init__(self, cfg: Config):
        self.db = Debounce(cfg.ppe_missing_sec, cfg.cooldown_sec)

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now = ctx.timestamp
        events = []
        # MVP: "헬멧이 화면에 있나"가 아니라 "사람별 헬멧"로 가야 맞음.
        # 일단은 state.persons[*].helmet_hist에 외부에서 업데이트된다고 가정.
        for p in ctx.state.persons.values():
            if len(p.helmet_hist) < 10:
                continue
            recent = list(p.helmet_hist)[-10:]
            miss_ratio = recent.count(False) / len(recent)
            if self.db.check(now, miss_ratio > 0.7):
                events.append(Event(self.name, "medium", p.id, now, {"miss_ratio": miss_ratio}))
        return events

class SafetyVestNotWornRule(Rule):
    name = "safety_vest_not_worn"
    def __init__(self, cfg: Config):
        self.db = Debounce(cfg.ppe_missing_sec, cfg.cooldown_sec)

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now = ctx.timestamp
        events = []
        for p in ctx.state.persons.values():
            if len(p.vest_hist) < 10:
                continue
            recent = list(p.vest_hist)[-10:]
            miss_ratio = recent.count(False) / len(recent)
            if self.db.check(now, miss_ratio > 0.7):
                events.append(Event(self.name, "medium", p.id, now, {"miss_ratio": miss_ratio}))
        return events

class SafetyShoesNotWornRule(Rule):
    name = "safety_shoes_not_worn"
    def __init__(self, cfg: Config):
        self.db = Debounce(cfg.ppe_missing_sec, cfg.cooldown_sec)

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now = ctx.timestamp
        events = []
        for p in ctx.state.persons.values():
            if len(p.shoes_hist) < 10:
                continue
            recent = list(p.shoes_hist)[-10:]
            miss_ratio = recent.count(False) / len(recent)
            if self.db.check(now, miss_ratio > 0.7):
                events.append(Event(self.name, "low", p.id, now, {"miss_ratio": miss_ratio}))
        return events
