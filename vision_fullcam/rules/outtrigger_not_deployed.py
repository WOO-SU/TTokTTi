# vision/rules/ladder_rules.py 에 붙이거나 별도 파일로 분리해도 됨
# 여기서는 별도 파일로.
# vision/rules/height_rule.py 와 동일한 방식.

# vision_fullcam/rules/outtrigger_not_deployed.py
from typing import List
from vision_fullcam.rules.base import Rule, RuleContext, Event, Debounce
from vision_fullcam.config import Config

class OuttriggerNotDeployedRule(Rule):
    name = "outtrigger_not_deployed"

    def __init__(self, cfg: Config):
        self.cfg = cfg
        # 필요 작업인데 미전개가 duration만큼 지속되면 이벤트
        self.db = Debounce(cfg.outtrigger_missing_sec, cfg.cooldown_sec)

    def evaluate(self, ctx: RuleContext) -> List[Event]:
        now = ctx.timestamp

        # TaskState는 dict 아님: 속성으로 접근
        required = bool(getattr(ctx.task, "outtrigger_required", False))
        if not required:
            return []

        # SiteState 기반: outtrigger가 화면에 보이는지
        deployed = bool(ctx.state.site.any_outtrigger)

        cond = required and (not deployed)
        if self.db.check(now, cond):
            return [Event(self.name, "medium", None, now, {
                "required": required,
                "deployed": deployed
            })]
        return []
