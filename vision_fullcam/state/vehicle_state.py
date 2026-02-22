# vision_fullcam/state/vehicle_state.py
from dataclasses import dataclass, field
from typing import Optional, List, Tuple

BBox = Tuple[float, float, float, float]

@dataclass
class VehicleState:
    track_id: int
    bbox: Optional[BBox] = None
    bbox_hist: List[BBox] = field(default_factory=list)
    last_seen: float = 0.0

    @property
    def id(self):
        return self.track_id