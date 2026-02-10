from collections import deque
import time
import numpy as np

class LadderState:
    def __init__(self, track_id: int):
        self.id = track_id
        self.last_seen = time.time()

        self.bbox_hist = deque(maxlen=60)
        self.tilt_hist = deque(maxlen=60)
        self.bbox = None

        self.height_m_hist = deque(maxlen=10)  # 추정된 사다리 높이(m) 히스토리
    
    @property
    def est_height_m(self):
        if not self.height_m_hist:
            return None
        return float(np.median(self.height_m_hist))