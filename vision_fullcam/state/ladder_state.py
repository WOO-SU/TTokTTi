# vision/state/ladder_state.py
from collections import deque
import time

class LadderState:
    def __init__(self, track_id: int):
        self.id = track_id
        self.last_seen = time.time()

        self.bbox_hist = deque(maxlen=60) # 이동량
        self.tilt_hist = deque(maxlen=60) # 기울기 각도
        self.bbox = None
