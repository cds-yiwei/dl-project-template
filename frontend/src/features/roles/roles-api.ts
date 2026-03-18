import {
	requestJson,
	type ApiMessageResponse,
	buildApiUrl,
	UnauthorizedRequestError,
} from "../auth/auth-api";

export type RoleRead = {
	created_at: string;
	description?: string | null;
	id: number;
	name: string;
};

export type RoleCreate = {
	description?: string | null;
	name: string;
};

export type RoleUpdate = {
	description?: string | null;
	name?: string | null;
};

export type RolesListResponse = {
	data: Array<RoleRead>;
	"has_more": boolean;
	"items_per_page": number;
	page: number;
	"total_count": number;
};

export const getRoles = async (
	page = 1,
	itemsPerPage = 10,
): Promise<RolesListResponse> => {
	const searchParameters = new URLSearchParams({
		"items_per_page": String(itemsPerPage),
		page: String(page),
	});

	const response = await fetch(
		buildApiUrl(`/api/v1/roles?${searchParameters.toString()}`),
		{
			cache: "no-store",
			credentials: "include",
			headers: {
				Accept: "application/json",
			},
			method: "GET",
		},
	);

	if (response.status === 401) {
		throw new UnauthorizedRequestError();
	}

	if (!response.ok) {
		throw new Error(`Unable to load roles: ${response.status}`);
	}

	return (await response.json()) as RolesListResponse;
};

export const createRole = async (payload: RoleCreate): Promise<RoleRead | null> =>
	requestJson<RoleRead>("/api/v1/role", {
		body: JSON.stringify(payload),
		method: "POST",
	});

export const updateRole = async (
	name: string,
	payload: RoleUpdate,
): Promise<ApiMessageResponse | null> =>
	requestJson<ApiMessageResponse>(`/api/v1/role/${name}`, {
		body: JSON.stringify(payload),
		method: "PATCH",
	});

export const deleteRole = async (
	name: string,
): Promise<ApiMessageResponse | null> =>
	requestJson<ApiMessageResponse>(`/api/v1/role/${name}`, {
		method: "DELETE",
	});