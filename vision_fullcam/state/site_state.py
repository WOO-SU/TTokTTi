# vision_fullcam/state/site_state.py
# 카메라로 알 수 있는 정보 
from dataclasses import dataclass

@dataclass
class SiteState:
    timestamp: float = 0.0
    person_count: int = 0
    any_ladder: bool = False
    any_outtrigger: bool = False
