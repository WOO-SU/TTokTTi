import type { BBox, Keypoint } from '../types';

const ASSUMED_PERSON_HEIGHT_M = 1.7;

export function estimatePersonHeightPx(
  keypoints: Record<string, Keypoint>,
): number | null {
  const leftAnkle = keypoints.left_ankle;
  const rightAnkle = keypoints.right_ankle;
  const nose = keypoints.nose;

  if (!leftAnkle || !rightAnkle || !nose) return null;
  if (leftAnkle.score < 0.3 || rightAnkle.score < 0.3 || nose.score < 0.3) {
    return null;
  }

  const ankleY = (leftAnkle.y + rightAnkle.y) / 2;
  const headY = nose.y;
  return Math.abs(ankleY - headY);
}

export function estimateLadderHeightM(
  ladderBbox: BBox,
  personHeightPx: number | null,
): number | null {
  if (personHeightPx === null || personHeightPx < 30) return null;

  const ladderPx = Math.abs(ladderBbox[3] - ladderBbox[1]);
  const scale = ASSUMED_PERSON_HEIGHT_M / personHeightPx;
  return ladderPx * scale;
}
