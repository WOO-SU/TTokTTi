/**
 * MoveNet 17 keypoint 배열에서 몸 기울기 계산.
 * kps: [y, x, score] × 17 (MoveNet output 순서)
 *
 * index 5: left_shoulder, 6: right_shoulder
 * index 11: left_hip, 12: right_hip
 */
export function bodyTiltDeg(
  kps: Array<[number, number, number]>,
): number | null {
  const ls = kps[5]; // left_shoulder [y, x, score]
  const rs = kps[6]; // right_shoulder
  const lh = kps[11]; // left_hip
  const rh = kps[12]; // right_hip

  if (
    Math.min(ls[2], rs[2], lh[2], rh[2]) < 0.4
  ) {
    return null;
  }

  const shoulderX = (ls[1] + rs[1]) / 2;
  const shoulderY = (ls[0] + rs[0]) / 2;
  const hipX = (lh[1] + rh[1]) / 2;
  const hipY = (lh[0] + rh[0]) / 2;

  const vx = shoulderX - hipX;
  const vy = hipY - shoulderY;

  return Math.abs((Math.atan2(vx, vy) * 180) / Math.PI);
}
