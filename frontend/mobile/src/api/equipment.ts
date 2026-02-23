import client from './client';

// 백엔드 실제 엔드포인트
const ENDPOINTS = {
  SAS_UPLOAD: '/user/storage/sas/upload/',
  CHECK_START: '/check/start/',
  CHECK_UPDATE: '/check/update/',
  TARGET_PHOTO: '/check/target/',
};

// 프론트 장비명 → 백엔드 category 매핑
const CATEGORY_MAP: Record<string, string> = {
  안전모: 'HELMET',
  안전조끼: 'VEST',
  안전장갑: 'GLOVE',
};

export type ComplianceData = {
  id: number;
  is_updated: boolean;
  is_complied: boolean | null;
  category: string;
  original_image: string | null;
  detected_image: string | null;
};

/** 1단계: Blob 업로드용 SAS URL 발급 */
export async function getSasToken(contentType?: string) {
  const res = await client.post(ENDPOINTS.SAS_UPLOAD, {
    content_type: contentType || 'image/jpeg',
  });
  // 응답: { upload_url, blob_name, container, expires_at, ... }
  return res.data as {
    upload_url: string;
    blob_name: string;
    container: string;
    expires_at: string;
  };
}

/** 1단계: SAS URL로 Blob 스토리지에 이미지 업로드 */
export async function uploadToBlob(
  uploadUrl: string,
  fileUri: string,
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: {
      uri: fileUri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any,
    headers: {
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': 'image/jpeg',
    },
  });

  if (!response.ok) {
    throw new Error(`Blob upload failed: ${response.status}`);
  }
}

/** 2단계: 탐지 요청 (DB에 Compliance 레코드 생성) */
export async function requestDetection(
  blobName: string,
  equipmentTitle: string,
  worksessionId: number,
): Promise<number> {
  const category = CATEGORY_MAP[equipmentTitle] || equipmentTitle;
  const res = await client.post(ENDPOINTS.CHECK_START, {
    category,
    original_image: blobName,
    worksession_id: worksessionId,
  });
  // 응답: { ok: true, compliance_id: 123 }
  return res.data.compliance_id;
}

/** 3단계: 결과 조회 (폴링용) */
export async function fetchCheckUpdate(
  complianceId: number,
): Promise<{ isUpdated: boolean; isComplied: boolean | null }> {
  const res = await client.get(ENDPOINTS.CHECK_UPDATE, {
    params: { compliance_id: complianceId },
  });
  // 응답: { ok: true, data: { is_updated, is_complied, ... } }
  const data: ComplianceData = res.data.data;
  return {
    isUpdated: data.is_updated,
    isComplied: data.is_complied,
  };
}

/** 4단계: 수동 점검 요청 (근로자 → 관리자) */
export async function requestManualCheck(
  worksessionId: number,
  complianceId: number,
): Promise<void> {
  await client.post('/check/request/', {
    worksession_id: worksessionId,
    compliance_id: complianceId,
  });
}

/** 5단계: 작업물 촬영 데이터 업로드 (타겟 사진) */
export async function requestTargetPhoto(
  blobName: string,
  worksessionId: number,
  status: 'BEFORE' | 'AFTER' = 'BEFORE',
): Promise<void> {
  await client.post(ENDPOINTS.TARGET_PHOTO, {
    worksession_id: worksessionId,
    status: status,
    image_path: blobName,
  });
}
