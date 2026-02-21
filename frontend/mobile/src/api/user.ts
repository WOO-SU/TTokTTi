import client from './client';

export interface ChangePasswordResponse {
    ok?: boolean;
    detail?: string;
}

export interface UserProfile {
    id: number;
    username: string;
    name: string;
    phone: string;
    address: string;
    birth_date: string;
    photo: string | null;
    sex: string;
    is_active: boolean;
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

export async function getUserProfile(userId: number): Promise<UserProfile> {
    const res = await client.get(`/user/${userId}/`);
    return res.data;
}

export async function updateUserProfile(userId: number, data: Partial<UserProfile>): Promise<UserProfile> {
    const res = await client.put(`/user/${userId}/`, data);
    return res.data;
}
