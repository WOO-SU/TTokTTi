# vision/events/emitter.py
import os, json, time
from typing import List
from vision_fullcam.rules.base import Event
from vision_fullcam.events.snapshot import save_snapshot

class EventEmitter:
    def __init__(self, out_dir: str, clip_buffer):
        self.out_dir = out_dir
        self.clip_buffer = clip_buffer
        os.makedirs(out_dir, exist_ok=True)
        os.makedirs(os.path.join(out_dir, "snapshots"), exist_ok=True)
        os.makedirs(os.path.join(out_dir, "clips"), exist_ok=True)

    def emit(self, events: List[Event], frame):
        for e in events:
            ts = int(e.ts * 1000)
            base = f"{ts}_{e.label}_{e.target_id if e.target_id is not None else 'na'}"

            # 1) json log
            with open(os.path.join(self.out_dir, f"{base}.json"), "w", encoding="utf-8") as f:
                json.dump({
                    "label": e.label,
                    "severity": e.severity,
                    "target_id": e.target_id,
                    "ts": e.ts,
                    "info": e.info,
                }, f, ensure_ascii=False, indent=2)

            # 2) snapshot
            snap_path = os.path.join(self.out_dir, "snapshots", f"{base}.jpg")
            save_snapshot(frame, snap_path, title=f"{e.label} ({e.severity})")

            # 3) clip (전/후 클립)
            clip_path = os.path.join(self.out_dir, "clips", f"{base}.mp4")
            self.clip_buffer.save_event_clip(clip_path)
