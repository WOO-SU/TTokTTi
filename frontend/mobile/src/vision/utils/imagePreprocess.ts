import ImageResizer from 'react-native-image-resizer';
import RNFS from 'react-native-fs';
import jpeg from 'jpeg-js';
import { Buffer } from 'buffer';

/**
 * JPEG 이미지를 YOLO 입력 형식으로 변환 (640x640 stretch)
 *
 * @param imagePath - 원본 이미지 파일 경로 (file:// 형식)
 * @param targetSize - 리사이즈 목표 크기 (기본: 640)
 * @returns Float32Array [targetSize * targetSize * 3] (RGB, 0~1 정규화)
 */
export async function preprocessImageForYOLO(
  imagePath: string,
  targetSize: number = 640,
): Promise<Float32Array> {
  try {
    // 1) 640x640으로 강제 stretch (aspect ratio 무시)
    const resized = await ImageResizer.createResizedImage(
      imagePath,
      targetSize,
      targetSize,
      'JPEG',
      100,
      0,
      undefined, // outputPath
      false,     // keepMeta
      { mode: 'stretch' },
    );
    console.log(`[Vision:Preprocess] 리사이즈 완료: ${resized.width}x${resized.height}`);

    // 2) base64로 읽기
    const base64 = await RNFS.readFile(resized.uri, 'base64');

    // 3) JPEG 디코딩
    const buffer = Buffer.from(base64, 'base64');
    const rawImageData = jpeg.decode(buffer, { useTArray: true });
    const { width, height, data: rgba } = rawImageData;

    // 4) RGBA → RGB 변환 + 0~1 정규화
    const rgbData = new Float32Array(targetSize * targetSize * 3);
    const pixelCount = width * height;

    for (let i = 0; i < pixelCount; i++) {
      const srcIdx = i * 4;
      const dstIdx = i * 3;
      rgbData[dstIdx] = rgba[srcIdx] / 255.0;         // R
      rgbData[dstIdx + 1] = rgba[srcIdx + 1] / 255.0; // G
      rgbData[dstIdx + 2] = rgba[srcIdx + 2] / 255.0; // B
    }

    console.log(`[Vision:Preprocess] 완료: ${width}x${height} (stretch)`);

    // 임시 파일 삭제
    await RNFS.unlink(resized.uri).catch(() => {});

    return rgbData;
  } catch (error) {
    console.error('[Vision:Preprocess] 실패:', error);
    return new Float32Array(targetSize * targetSize * 3).fill(0.5);
  }
}

/**
 * 이미지 경로에서 file:// 프리픽스 제거
 */
export function normalizeImagePath(path: string): string {
  return path.replace(/^file:\/\//, '');
}
