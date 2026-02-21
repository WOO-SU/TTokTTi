import client from './client';

export interface ChangePasswordResponse {
    ok?: boolean;
    detail?: string;
}

/**
 * 비밀번호 변경 API 호출
 * POST /api/user/password/change/
 */
export async function changePassword(
    currentPassword: string,
    newPassword: string,
): Promise<ChangePasswordResponse> {
    const res = await client.post('/user/password/change/', {
        current_password: currentPassword,
        new_password: newPassword,
    });
    return res.data;
}
