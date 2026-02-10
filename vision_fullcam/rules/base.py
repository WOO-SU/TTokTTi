# vision/rules/base.py
from dataclasses import dataclass
from typing import Dict, List, Optional
import time

@dataclass
class RuleContext:
    timestamp: float
    frame: "object"  # np.ndarray
    state: "object"  # StateBuffer
    task: "object"   # TaskState

@dataclass
class Event:
    label: str
    severity: str
    target_id: Optional[int]
    ts: float
    info: dict

class Rule:
    name: str
    def evaluate(self, ctx: RuleContext) -> List[Event]:
        raise NotImplementedError

class Debounce:
    """
    condition이 duration만큼 참이면 fire.
    fire 이후 cooldown 동안 재발화 방지.
    """
    def __init__(self, duration_sec: float, cooldown_sec: float):
        self.duration = duration_sec
        self.cooldown = cooldown_sec
        self.start_ts: Optional[float] = None
        self.cool_until: float = 0.0

    def check(self, now: float, cond: bool) -> bool:
        if now < self.cool_until:
            return False
        if cond:
            if self.start_ts is None:
                self.start_ts = now
            if now - self.start_ts >= self.duration:
                self.start_ts = None
                self.cool_until = now + self.cooldown
                return True
        else:
            self.start_ts = None
        return False
