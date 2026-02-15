# vision/rules/base.py
from dataclasses import dataclass
from typing import Dict, List, Optional
import time
from ..state.state_buffer import StateBuffer
from ..state.task_state import TaskState

@dataclass
class RuleContext:
    timestamp: float
    frame: object
    state: "StateBuffer"
    task: "TaskState"

@dataclass
class KeyPoint:
    x: float
    y: float
    confidence: float

@dataclass
class Pose:
    keypoints: dict[str, KeyPoint]
    body_tilt_deg: float | None = None
    torso_vector: tuple[float, float] | None = None

@dataclass
class Event:
    label: str
    severity: str
    target_id: Optional[int]
    ts: float
    info: dict

class Rule:
    name: str
    def is_active(self, ctx: RuleContext) -> bool:
        return True
    
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

    def fire_immediate(self, now: float) -> bool:
        """즉시 발화, duration 체크 없이"""
        if now < self.cool_until:
            return False
        self.cool_until = now + self.cooldown
        return True

    def reset(self, now: float):
        self.start_ts = None
        self.cool_until = now