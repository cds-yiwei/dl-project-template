import { requestJson } from "@/fetch";
import type { ApiMessageResponse } from "./api-types";
import type { RoleRead } from "./roles";

export type UserRoleUpdate = {
	role_id: number | null;
};

export const getUserRole = async (username: string): Promise<RoleRead | null> =>
	requestJson<RoleRead>(`/api/v1/user/${username}/role`, {
		method: "GET",
	});

export const updateUserRole = async (
	username: string,
	payload: UserRoleUpdate,
): Promise<ApiMessageResponse | null> =>
	requestJson<ApiMessageResponse>(`/api/v1/user/${username}/role`, {
		body: JSON.stringify(payload),
		method: "PATCH",
	});