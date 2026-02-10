import time
import cv2

from vision_fullcam.config import Config
from vision_fullcam.stream.reader import FrameReader

from vision_fullcam.detection.yolo_detector import YoloDetector
from vision_fullcam.detection.fake_detector import FakeDetector

from vision_fullcam.tracking.simple_tracker import SimpleTracker, Tracked
from vision_fullcam.state.state_buffer import StateBuffer
from vision_fullcam.state.task_state import TaskState
from vision_fullcam.state.ppe_observer import PPEObserver

from vision_fullcam.pose.movenet import PoseEstimator

from vision_fullcam.rules.base import RuleContext
from vision_fullcam.rules.ppe_rules import (
    HelmetNotWornRule,
    SafetyVestNotWornRule,
    SafetyShoesNotWornRule,
)
from vision_fullcam.rules.worker_count import InsufficientWorkerCountRule
from vision_fullcam.rules.ladder_rules import (
    LadderTiltRule,
    LadderMovementWithPersonRule,
)
from vision_fullcam.rules.height_rule import HeightLadderViolationRule
from vision_fullcam.rules.outtrigger_not_deployed import OuttriggerNotDeployedRule
from vision_fullcam.rules.posture_rules import (
    ExcessiveBodyTiltRule,
    TopStepUsageRule,
)

from vision_fullcam.events.clip_buffer import ClipBuffer
from vision_fullcam.events.emitter import EventEmitter

def build_detector(cfg: Config):
    if getattr(cfg, "use_fake_detector", True):
        return FakeDetector(fps=cfg.fps_monitor)

    cls_map = {
        0: "person",
        1: "ladder",
        2: "helmet",
        3: "safety_vest",
        4: "safety_shoes",
        5: "outtrigger",
    }
    return YoloDetector(
        model_path=getattr(cfg, "yolo_model_path", "yolov8n.pt"),
        cls_map=cls_map,
    )


# --------------------------------------------------
# FakeDetector key handler
# --------------------------------------------------
def _handle_keys(detector, task: TaskState, key: int):
    if key in (-1, 255):
        return
    if key == 27:
        raise KeyboardInterrupt

    if not isinstance(detector, FakeDetector):
        return

    mapping = {
        ord("0"): ("normal", "normal"),
        ord("1"): ("no_helmet", "helmet_not_worn"),
        ord("2"): ("no_vest", "safety_vest_not_worn"),
        ord("3"): ("no_shoes", "safety_shoes_not_worn"),
        ord("4"): ("one_person", "insufficient_worker_count"),
        ord("5"): ("ladder_move", "ladder_movement_with_person"),
        ord("6"): ("tilted_ladder", "ladder_tilt"),
        ord("7"): ("outtrigger_missing", "outtrigger_not_deployed"),
        ord("8"): ("outtrigger_deployed", "normal"),
    }

    if key in mapping:
        mode, desc = mapping[key]
        detector.set_mode(mode)
        print(f"[MODE] {desc}")
        return

    if key == ord("t"):
        task.outtrigger_required = not task.outtrigger_required
        print(f"[TASK] outtrigger_required={task.outtrigger_required}")

    if key == ord("h"):
        task.expected_height_m = 4.0 if task.expected_height_m < 3.5 else 2.0
        print(f"[TASK] expected_height_m={task.expected_height_m}")


# --------------------------------------------------
# main
# --------------------------------------------------
def main():
    cfg = Config()

    # ===== input =====
    reader = FrameReader(getattr(cfg, "camera_index", 0))
    detector = build_detector(cfg)
    tracker = SimpleTracker(iou_thr=getattr(cfg, "tracker_iou_thr", 0.3))

    # ===== state =====
    state = StateBuffer()
    ppe_observer = PPEObserver()

    # ===== pose =====
    pose_estimator = PoseEstimator()  # ← MoveNet 자리

    # ===== task (앱 입력값) =====
    task = TaskState(
        work_mode="ladder",
        expected_height_m=float(getattr(cfg, "expected_height_m", 2.0)),
        outtrigger_required=bool(getattr(cfg, "outtrigger_required", False)),
    )
    task.start()

    # ===== events =====
    clip_buffer = ClipBuffer(
        fps=cfg.fps_monitor,
        keep_sec=cfg.clip_pre_sec + cfg.clip_post_sec,
    )
    emitter = EventEmitter(
        out_dir=getattr(cfg, "output_dir", "runs"),
        clip_buffer=clip_buffer,
    )

    # ===== rules =====
    rules = [
        HeightLadderViolationRule(cfg),
        LadderMovementWithPersonRule(cfg),
        LadderTiltRule(cfg),
        OuttriggerNotDeployedRule(cfg),

        HelmetNotWornRule(cfg),
        SafetyVestNotWornRule(cfg),
        SafetyShoesNotWornRule(cfg),

        InsufficientWorkerCountRule(cfg),

        # pose 기반 (MoveNet 결과 필요)
        ExcessiveBodyTiltRule(cfg),
        TopStepUsageRule(cfg),
    ]

    dt_target = 1.0 / max(1, cfg.fps_monitor)

    try:
        while True:
            t0 = time.time()
            frame = reader.read()
            if frame is None:
                break

            clip_buffer.push(frame)

            # 1️⃣ detection
            detections = detector.detect(frame)

            # 2️⃣ tracking
            tracked_input = [
                Tracked(-1, d.label, d.bbox, d.score)
                for d in detections
            ]
            tracked = tracker.update(tracked_input)

            # 3️⃣ state update
            now = time.time()
            state.update(tracked, frame, now)

            # 4️⃣ pose estimation (MoveNet 자리)
            for p in state.persons.values():
                pose = pose_estimator.infer(frame, p.bbox)
                if pose:
                    p.pose_hist.append(pose)

            # 5️⃣ PPE observer
            ppe_observer.update(
                persons=state.persons,
                tracked=tracked,
                frame_shape=frame.shape[:2],
            )

            # 6️⃣ rule context
            ctx = RuleContext(
                timestamp=now,
                frame=frame,
                state=state,
                task=task,
            )

            # 7️⃣ rule evaluation
            events = []
            for rule in rules:
                events.extend(rule.evaluate(ctx))

            # 8️⃣ emit
            if events:
                emitter.emit(events, frame)
                for e in events:
                    print(
                        f"[EVENT] {e.label} "
                        f"sev={e.severity} "
                        f"target={e.target_id} "
                        f"info={e.info}"
                    )

            # 9️⃣ monitor
            if getattr(cfg, "show_window", True):
                cv2.imshow("vision_fullcam", frame)

            key = cv2.waitKey(1) & 0xFF
            _handle_keys(detector, task, key)

            # fps sync
            dt = time.time() - t0
            if dt < dt_target:
                time.sleep(dt_target - dt)

    except KeyboardInterrupt:
        pass
    finally:
        reader.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()