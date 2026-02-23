import client from './client';

/** GET /risk/latest/{worksession_id} — COMPLETED 보고서 존재 확인 */
export async function checkLatestRisk(
    worksessionId: number,
): Promise<{ exists: boolean; assessment_id?: number }> {
    const res = await client.get(`/risk/latest/${worksessionId}`);
    return res.data as { exists: boolean; assessment_id?: number };
}

/** POST /risk/start/{worksession_id} — assessment 레코드 생성 */
export async function startRiskAssessment(
    worksessionId: number,
): Promise<{ assessment_id: number }> {
    const res = await client.post(`/risk/start/${worksessionId}`);
    return res.data as { assessment_id: number };
}

/** POST /risk/upload/{assessment_id} — blob path DB 저장 */
export async function uploadRiskPhoto(
    assessmentId: number,
    blobName: string,
): Promise<void> {
    await client.post(`/risk/upload/${assessmentId}`, {
        blob_name: blobName,
    });
}

/** POST /risk/assess/{assessment_id} — LLM 평가 생성 요청 (LLM 처리로 최대 60초 소요) */
export async function requestRiskAssess(
    assessmentId: number,
): Promise<void> {
    await client.post(`/risk/assess/${assessmentId}`, {}, { timeout: 120000 });
}

/** GET /risk/worker/{assessment_id} — 근로자용 보고서 조회 */
export type WorkerReport = {
    assessment_id: number;
    status: string;
    short_message: string;
    images: { id: number; blob_name: string; created_at: string }[];
    top_risks: {
        id: string;
        title: string;
        risk_grade: string;
        risk_R: number;
        expected_accident: string;
    }[];
    immediate_actions: string[];
    message?: {
        status: { overall_grade: string; work_permission: string };
        alert_message: string;
        main_risks: { type: string; what_can_happen: string }[];
        action_checklist: string[];
        guide_message: string;
    };
};

export async function fetchWorkerReport(
    assessmentId: number,
): Promise<WorkerReport> {
    const res = await client.get(`/risk/worker/${assessmentId}`);
    return res.data as WorkerReport;
}

/** GET /risk/media/sas?blob_name=... — blob 읽기용 SAS URL 발급 */
export async function fetchSasUrl(
    blobName: string,
): Promise<string> {
    const res = await client.get('/risk/media/sas', { params: { blob_name: blobName } });
    const url = (res.data as { url: string | { download_url: string } }).url;
    return typeof url === 'string' ? url : url.download_url;
}
