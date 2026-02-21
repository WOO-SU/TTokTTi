import client from './client';

export type TargetPhotoStatus = 'BEFORE' | 'AFTER';

type UploadTargetPhotoResponse = {
    ok: boolean;
    detail?: string;
};

/** 작업 대상 사진 업로드 (프론트 -> 백 -> DB) */
export async function uploadTargetPhoto(
    worksessionId: number,
    status: TargetPhotoStatus,
    imagePath: string,
): Promise<UploadTargetPhotoResponse> {
    const res = await client.post<UploadTargetPhotoResponse>('/check/target/', {
        worksession_id: worksessionId,
        status,
        image_path: imagePath,
    });
    return res.data;
}
