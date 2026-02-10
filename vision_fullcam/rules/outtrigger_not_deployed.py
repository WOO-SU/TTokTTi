# vision/rules/ladder_rules.py 에 붙이거나 별도 파일로 분리해도 됨
# 여기서는 별도 파일로.
# vision/rules/height_rule.py 와 동일한 방식.

# vision/rules/ladder_rules_outtrigger.py
from typing import List
from vision_fullcam.rules.base import Rule, RuleContext, Event, Debounce
from vision_fullcam.config import Config

class OuttriggerNotDeployedRule(Rule):
    name = "outtrigger_not_deployed"
    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.db = {}

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now = ctx.timestamp
        events = []
        # meta["outtrigger_required"]=True 일 때만 체크
        required = bool(ctx.meta.get("outtrigger_required", False))
        if not required:
            return []
        
        db = self.db.setdefault(
            ctx.track_id,
            Debounce(self.cfg.outtrigger_not_deployed_sec, self.cfg.cooldown_sec)
        )
        cond = not ctx.state.any_outtrigger

        if db.check(now, cond):
            events.append(Event(
                self.name,
                "medium",
                ctx.track_id,
                now,
                {
                    "required": True,
                    "outtrigger_detected": ctx.state.any_outtrigger
                }
            ))
        return events
