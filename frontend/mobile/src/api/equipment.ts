import client from './client';

// TODO: 백엔드 API 완성 후 실제 엔드포인트로 교체
const ENDPOINTS = {
  SAS_TOKEN: '/equipment/sas-token/',
  ANALYZE: '/equipment/analyze/',
  RESULT: '/equipment/result/',
};

export type AnalysisStatus = 'pending' | 'completed' | 'failed';

export type AnalysisResult = {
  status: AnalysisStatus;
  passed?: boolean;
  message?: string;
};

/** 1단계: Blob 업로드용 SAS 토큰 발급 */
export async function getSasToken(): Promise<{sasUrl: string; blobPath: string}> {
  const res = await client.get(ENDPOINTS.SAS_TOKEN);
  return res.data;
}

/** 1단계: SAS URL로 Blob 스토리지에 이미지 업로드 */
export async function uploadToBlob(
  sasUrl: string,
  fileUri: string,
): Promise<void> {
  const response = await fetch(fileUri);
  const blob = await response.blob();

  await fetch(sasUrl, {
    method: 'PUT',
    headers: {
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': 'image/jpeg',
    },
    body: blob,
  });
}

/** 2단계: 분석 요청 (이미지 경로를 비동기 작업 큐에 전송) */
export async function requestAnalysis(
  blobPath: string,
  equipmentType: string,
): Promise<{taskId: string}> {
  const res = await client.post(ENDPOINTS.ANALYZE, {
    image_path: blobPath,
    equipment_type: equipmentType,
  });
  return res.data;
}

/** 3단계: 분석 결과 조회 (폴링용) */
export async function fetchResult(taskId: string): Promise<AnalysisResult> {
  const res = await client.get(`${ENDPOINTS.RESULT}${taskId}/`);
  return res.data;
}
