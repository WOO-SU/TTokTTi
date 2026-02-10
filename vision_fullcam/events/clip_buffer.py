# vision/events/clip_buffer.py
from collections import deque
import time
import cv2

class ClipBuffer:
    """
    최근 N초를 계속 버퍼링하고, 이벤트 시점에 clip으로 저장.
    MVP: 간단하게 프레임 덱 저장.
    """
    def __init__(self, fps: int, keep_sec: float):
        self.fps = fps
        self.keep_sec = keep_sec
        self.buf = deque(maxlen=int(fps * keep_sec))

    def push(self, frame):
        self.buf.append((time.time(), frame.copy()))

    def save_event_clip(self, path: str):
        if not self.buf:
            return
        frames = [f for _, f in self.buf]
        h, w = frames[0].shape[:2]
        out = cv2.VideoWriter(path, cv2.VideoWriter_fourcc(*"mp4v"), self.fps, (w, h))
        for f in frames:
            out.write(f)
        out.release()
