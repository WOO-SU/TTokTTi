import client from './client';

export type WorkSessionStatus = 'READY' | 'IN_PROGRESS' | 'DONE';

export type WorkSessionItem = {
  id: number;
  name: string;
  status: WorkSessionStatus;
  starts_at: string;
  ends_at: string | null;
};

type TodayResponse = {
  ok: boolean;
  count: number;
  data: WorkSessionItem[];
};

type ActivateResponse = {
  ok: boolean;
  status: WorkSessionStatus;
  detail?: string;
};

/** 오늘의 작업 세션 목록 조회 */
export async function getTodayWorkSessions(): Promise<WorkSessionItem[]> {
  const res = await client.get<TodayResponse>('/worksession/today/');
  return res.data.data;
}

/** 작업 세션 활성화 (READY → IN_PROGRESS) */
export async function activateWorkSession(
  worksessionId: number,
): Promise<ActivateResponse> {
  const res = await client.patch<ActivateResponse>('/worksession/activate/', {
    worksession_id: worksessionId,
  });
  return res.data;
}
