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
        self.db = Debounce(cfg.outtrigger_missing_sec, cfg.cooldown_sec)

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now = ctx.timestamp
        # task["outtrigger_required"]=True 일 때만 체크
        required = bool(ctx.task.get("outtrigger_required", False))
        cond = required and (not ctx.state.any_outtrigger)
        if self.db.check(now, cond):
            return [Event(self.name, "medium", None, now, {"required": required})]
        return []
