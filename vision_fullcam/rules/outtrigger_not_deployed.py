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

        # task["outtrigger_required"]=True 일 때만 체크
        required = bool(ctx.task.outtrigger_required)
        if not required:
            return []

        cond = not ctx.state.any_outtrigger

        # scene-level debounce → 고정 ID 사용
        SCENE_ID = 0

        if self.db.check(SCENE_ID, now, cond):
            events.append(
                Event(
                    self.name,
                    "medium",
                    SCENE_ID,
                    now,
                    {
                        "required": True,
                        "outtrigger_detected": ctx.state.any_outtrigger,
                    },
                )
            )

        return events
