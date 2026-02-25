import cv2


def draw_tracked(frame, tracked):
    """
    tracked:
      - dict[int, Tracked]  (SimpleTracker 반환 형태)
      - 또는 list[Tracked]
    둘 다 안전하게 처리
    """

    if tracked is None:
        return

    # dict면 value만 사용
    if isinstance(tracked, dict):
        iterable = tracked.values()
    else:
        iterable = tracked

    for t in iterable:
        # 방어 코드 (혹시 int 같은 게 섞여도 터지지 않게)
        if not hasattr(t, "bbox"):
            continue

        x1, y1, x2, y2 = map(int, t.bbox)

        # label별 색상
        color = (0, 255, 0)          # default
        if t.label == "ladder":
            color = (255, 200, 0)
        elif t.label == "vehicle":
            color = (0, 0, 255)
        elif t.label == "person":
            color = (0, 255, 0)

        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        cv2.putText(
            frame,
            f"{t.label}:{t.track_id}",
            (x1, max(15, y1 - 5)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            color,
            1,
        )


def draw_events(frame, events):
    """
    rule 이벤트를 화면 좌측 상단에 표시
    """
    if not events:
        return

    y = 30
    for e in events:
        text = f"[EVENT] {e.label}"

        cv2.putText(
            frame,
            text,
            (10, y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 0, 255),
            2,
        )
        y += 30