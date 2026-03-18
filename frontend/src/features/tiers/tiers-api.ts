import {
	requestJson,
	type ApiMessageResponse,
	ForbiddenRequestError,
	UnauthorizedRequestError,
	buildApiUrl,
} from "../auth/auth-api";

export type TierCreate = {
	name: string;
};

export type TierUpdate = {
	name?: string;
};

export type TierRead = {
	id: number;
	name: string;
	created_at: string;
};

export type TiersListResponse = {
	data: Array<TierRead>;
	"has_more": boolean;
	"items_per_page": number;
	page: number;
	"total_count": number;
};

export const createTier = async (payload: TierCreate): Promise<TierRead | null> =>
	requestJson<TierRead>("/api/v1/tier", {
		body: JSON.stringify(payload),
		method: "POST",
	});

export const getTiers = async (
	page = 1,
	itemsPerPage = 10,
): Promise<TiersListResponse> => {
	const searchParameters = new URLSearchParams({
		"items_per_page": String(itemsPerPage),
		page: String(page),
	});

	const response = await fetch(
		buildApiUrl(`/api/v1/tiers?${searchParameters.toString()}`),
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

	if (response.status === 403) {
		throw new ForbiddenRequestError();
	}

	if (!response.ok) {
		throw new Error(`Unable to load tiers: ${response.status}`);
	}

	return (await response.json()) as TiersListResponse;
};

export const updateTier = async (name: string, payload: TierUpdate): Promise<ApiMessageResponse | null> =>
	requestJson<ApiMessageResponse>(`/api/v1/tier/${encodeURIComponent(name)}`, {
		body: JSON.stringify(payload),
		method: "PATCH",
	});

export const deleteTier = async (name: string): Promise<ApiMessageResponse | null> =>
	requestJson<ApiMessageResponse>(`/api/v1/tier/${encodeURIComponent(name)}`, {
		method: "DELETE",
	});