import { requestJson } from "@/fetch";
import type { ApiMessageResponse } from "./api-types";

export type DepartmentCreate = {
	abbreviation?: string | null;
	abbreviation_fr?: string | null;
	gc_org_id?: number | null;
	lead_department_name?: string | null;
	lead_department_name_fr?: string | null;
	name: string;
	name_fr?: string | null;
};

export type DepartmentUpdate = {
	abbreviation?: string | null;
	abbreviation_fr?: string | null;
	gc_org_id?: number | null;
	lead_department_name?: string | null;
	lead_department_name_fr?: string | null;
	name?: string;
	name_fr?: string | null;
};

export type DepartmentRead = {
	abbreviation: string | null;
	abbreviation_fr: string | null;
	name: string;
	gc_org_id: number | null;
	lead_department_name: string | null;
	lead_department_name_fr: string | null;
	name_fr: string | null;
	created_at: string;
	uuid: string;
};

export type DepartmentsListResponse = {
	data: Array<DepartmentRead>;
	"has_more": boolean;
	"items_per_page": number;
	page: number;
	"total_count": number;
};

export const createDepartment = async (payload: DepartmentCreate): Promise<DepartmentRead | null> =>
	requestJson<DepartmentRead>("/api/v1/department", {
		body: JSON.stringify(payload),
		method: "POST",
	});

export const getDepartments = async (
	page = 1,
	itemsPerPage = 10,
): Promise<DepartmentsListResponse> => {
	const searchParameters = new URLSearchParams({
		"items_per_page": String(itemsPerPage),
		page: String(page),
	});

	return (await requestJson<DepartmentsListResponse>(`/api/v1/departments?${searchParameters.toString()}`, {
		cache: "no-store",
		method: "GET",
	})) as DepartmentsListResponse;
};

export const updateDepartment = async (departmentUuid: string, payload: DepartmentUpdate): Promise<ApiMessageResponse | null> =>
	requestJson<ApiMessageResponse>(`/api/v1/department/${encodeURIComponent(departmentUuid)}`, {
		body: JSON.stringify(payload),
		method: "PATCH",
	});

export const deleteDepartment = async (departmentUuid: string): Promise<ApiMessageResponse | null> =>
	requestJson<ApiMessageResponse>(`/api/v1/department/${encodeURIComponent(departmentUuid)}`, {
		method: "DELETE",
	});