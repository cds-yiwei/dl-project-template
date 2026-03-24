import { requestJson } from "@/fetch";
import type { ApiMessageResponse } from "./api-types";
import type { DepartmentRead } from "./departments";

export type UserDepartmentUpdate = {
	departmentAbbreviation: string | null;
};

export const getUserDepartment = async (userUuid: string): Promise<DepartmentRead | null> =>
	requestJson<DepartmentRead>(`/api/v1/user/${userUuid}/department`, {
		method: "GET",
	});

export const updateUserDepartment = async (
	userUuid: string,
	payload: UserDepartmentUpdate,
): Promise<ApiMessageResponse | null> =>
	requestJson<ApiMessageResponse>(`/api/v1/user/${userUuid}/department`, {
		body: JSON.stringify(payload),
		method: "PATCH",
	});