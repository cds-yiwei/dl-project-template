import { requestJson } from "@/fetch";
import type { ApiMessageResponse } from "./api-types";
import type { RoleRead } from "./roles";

export type UserRoleUpdate = {
	role_uuid: string | null;
};

export const getUserRole = async (userUuid: string): Promise<RoleRead | null> =>
	requestJson<RoleRead>(`/api/v1/user/${userUuid}/role`, {
		method: "GET",
	});

export const updateUserRole = async (
	userUuid: string,
	payload: UserRoleUpdate,
): Promise<ApiMessageResponse | null> =>
	requestJson<ApiMessageResponse>(`/api/v1/user/${userUuid}/role`, {
		body: JSON.stringify(payload),
		method: "PATCH",
	});