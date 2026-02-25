export enum DetLabel {
  PERSON = 'person',
  LADDER = 'ladder',
  HELMET = 'helmet',
  VEST = 'safety_vest',
  SHOES = 'safety_shoes',
  OUTTRIGGER = 'outtrigger',
  GLOVE = 'glove',
}

// best.pt 클래스 인덱스 → 라벨 매핑
export const YOLO_CLASS_MAP: Record<number, string> = {
  0: DetLabel.GLOVE,
  1: DetLabel.HELMET,
  2: DetLabel.LADDER,
  3: DetLabel.OUTTRIGGER,
  4: DetLabel.PERSON,
  5: DetLabel.VEST,
};

export const NUM_CLASSES = Object.keys(YOLO_CLASS_MAP).length;
