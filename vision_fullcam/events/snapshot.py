# vision/events/snapshot.py
import cv2

def save_snapshot(frame, path: str, title: str = ""):
    img = frame.copy()
    if title:
        cv2.putText(img, title, (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255,255,255), 2)
    cv2.imwrite(path, img)
