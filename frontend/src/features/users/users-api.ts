import {
	requestJson,
	type ApiMessageResponse,
	buildApiUrl,
	UnauthorizedRequestError,
	type UserRead,
} from "../auth/auth-api";

export type UserCreate = {
	email: string;
	name: string;
	password: string;
	username: string;
};

export type UserUpdate = {
	auth_provider?: string | null;
	auth_subject?: string | null;
	email?: string | null;
	name?: string | null;
	profile_image_url?: string | null;
	username?: string | null;
};

export type UsersListResponse = {
	data: Array<UserRead>;
	"has_more": boolean;
	"items_per_page": number;
	page: number;
	"total_count": number;
};

export const getUsers = async (
	page = 1,
	itemsPerPage = 10,
): Promise<UsersListResponse> => {
	const searchParameters = new URLSearchParams({
		"items_per_page": String(itemsPerPage),
		page: String(page),
	});

	const response = await fetch(
		buildApiUrl(`/api/v1/users?${searchParameters.toString()}`),
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
		throw new Error(`Unable to load users: ${response.status}`);
	}

	return (await response.json()) as UsersListResponse;
};

export const createUser = async (payload: UserCreate): Promise<UserRead | null> =>
	requestJson<UserRead>("/api/v1/user", {
		body: JSON.stringify(payload),
		method: "POST",
	});

export const updateUser = async (
	username: string,
	payload: UserUpdate,
): Promise<ApiMessageResponse | null> =>
	requestJson<ApiMessageResponse>(`/api/v1/user/${username}`, {
		body: JSON.stringify(payload),
		method: "PATCH",
	});

export const deleteUser = async (
	username: string,
): Promise<ApiMessageResponse | null> =>
	requestJson<ApiMessageResponse>(`/api/v1/user/${username}`, {
		method: "DELETE",
	});