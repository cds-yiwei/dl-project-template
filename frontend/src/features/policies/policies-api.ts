import {
	requestJson,
	type ApiMessageResponse,
	buildApiUrl,
	UnauthorizedRequestError,
} from "../auth/auth-api";

export type PolicyRead = {
	action: string;
	id: number;
	resource: string;
	subject: string;
};

export type PolicyCreate = {
	action: string;
	resource: string;
	subject: string;
};

export type PolicyUpdate = {
	action?: string | null;
	resource?: string | null;
	subject?: string | null;
};

export type PoliciesListResponse = {
	data: Array<PolicyRead>;
	"has_more": boolean;
	"items_per_page": number;
	page: number;
	"total_count": number;
};

export const getPolicies = async (
	page = 1,
	itemsPerPage = 10,
): Promise<PoliciesListResponse> => {
	const searchParameters = new URLSearchParams({
		"items_per_page": String(itemsPerPage),
		page: String(page),
	});

	const response = await fetch(
		buildApiUrl(`/api/v1/policies?${searchParameters.toString()}`),
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
		throw new Error(`Unable to load policies: ${response.status}`);
	}

	return (await response.json()) as PoliciesListResponse;
};

export const createPolicy = async (
	payload: PolicyCreate,
): Promise<PolicyRead | null> =>
	requestJson<PolicyRead>("/api/v1/policy", {
		body: JSON.stringify(payload),
		method: "POST",
	});

export const updatePolicy = async (
	policyId: number,
	payload: PolicyUpdate,
): Promise<ApiMessageResponse | null> =>
	requestJson<ApiMessageResponse>(`/api/v1/policy/${policyId}`, {
		body: JSON.stringify(payload),
		method: "PATCH",
	});

export const deletePolicy = async (
	policyId: number,
): Promise<ApiMessageResponse | null> =>
	requestJson<ApiMessageResponse>(`/api/v1/policy/${policyId}`, {
		method: "DELETE",
	});