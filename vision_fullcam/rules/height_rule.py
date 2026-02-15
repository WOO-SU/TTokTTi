# vision/rules/height_rule.py
from typing import List
from vision_fullcam.rules.base import Rule, RuleContext, Event, Debounce
from vision_fullcam.config import Config

class HeightLadderViolationRule(Rule):
    name = "height_ladder_violation"
    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.db = Debounce(0.5, cfg.cooldown_sec)
    
    def is_active(self, ctx):
        return ctx.state.has_person()

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now = ctx.timestamp
        events = []

        for l in ctx.state.ladders.values():
            h = l.est_height_m
            if h is None:
                continue

            if self.db.check(l.id, now, h >= 3.5):
                events.append(Event(
                    self.name,
                    "medium",
                    l.id,
                    now,
                    {
                        "estimated_height_m": round(h, 2),
                        "assumed_person_height_m": 1.7
                    }
                ))
        
        return events
