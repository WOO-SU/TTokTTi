export type BBox = [number, number, number, number]; // x1, y1, x2, y2

export interface Detection {
  label: string;
  bbox: BBox;
  score: number;
}

export interface Tracked {
  trackId: number;
  label: string;
  bbox: BBox;
  score: number;
}

export interface SafetyEvent {
  label: string;
  severity: 'low' | 'medium' | 'high';
  targetId: number | null;
  ts: number;
  info: Record<string, any>;
}

export interface Keypoint {
  x: number;
  y: number;
  score: number;
}

export interface PoseResult {
  keypoints: Record<string, Keypoint>;
  bodyTiltDeg: number | null;
  torsoVector: [number, number];
}
