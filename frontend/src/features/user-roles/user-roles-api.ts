import {
	requestJson,
	type ApiMessageResponse,
	buildApiUrl,
	UnauthorizedRequestError,
} from "../auth/auth-api";
import type { RoleRead } from "../roles/roles-api";

export type UserRoleUpdate = {
	role_id: number | null;
};

export const getUserRole = async (username: string): Promise<RoleRead | null> => {
	const response = await fetch(buildApiUrl(`/api/v1/user/${username}/role`), {
		credentials: "include",
		headers: {
			Accept: "application/json",
		},
		method: "GET",
	});

	if (response.status === 401) {
		throw new UnauthorizedRequestError();
	}

	if (!response.ok) {
		throw new Error(`Unable to load user role: ${response.status}`);
	}

	return (await response.json()) as RoleRead | null;
};

export const updateUserRole = async (
	username: string,
	payload: UserRoleUpdate,
): Promise<ApiMessageResponse | null> =>
	requestJson<ApiMessageResponse>(`/api/v1/user/${username}/role`, {
		body: JSON.stringify(payload),
		method: "PATCH",
	});