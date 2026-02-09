# vision/stream/reader.py
import cv2

class FrameReader:
    def __init__(self, src=0):
        self.cap = cv2.VideoCapture(src)

    def read(self):
        ok, frame = self.cap.read()
        if not ok:
            return None
        return frame

    def release(self):
        self.cap.release()
