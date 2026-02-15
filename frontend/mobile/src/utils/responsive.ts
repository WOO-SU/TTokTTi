import {Dimensions} from 'react-native';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/** 너비 기반 비례 스케일. 레이아웃 크기, padding, margin, gap, borderRadius에 사용. */
export function s(size: number): number {
  return Math.round((size * SCREEN_WIDTH) / BASE_WIDTH);
}

/** 높이 기반 비례 스케일. 히어로 이미지 높이 등 세로 비율이 중요한 곳에 사용. */
export function vs(size: number): number {
  return Math.round((size * SCREEN_HEIGHT) / BASE_HEIGHT);
}

/** 완만한 스케일. fontSize, lineHeight 등 텍스트 관련 값에 사용. */
export function ms(size: number, factor: number = 0.5): number {
  return Math.round(size + (s(size) - size) * factor);
}

export {SCREEN_WIDTH, SCREEN_HEIGHT};
