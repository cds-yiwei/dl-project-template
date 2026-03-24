import type { ApiMessageResponse } from "./api-types";
import { buildApiUrl, getApiBaseUrl } from "./base-url";
import { UnauthorizedRequestError } from "./errors";
import { requestJson } from "./request-json";

export type UserRead = {
	auth_provider: string | null;
	auth_subject: string | null;
	department_abbreviation?: string | null;
	department_uuid?: string | null;
	email: string;
	name: string;
	profile_image_url: string | null;
	role_uuid: string | null;
	tier_uuid: string | null;
	uuid: string;
	username: string;
};

export const getCurrentUser = async (): Promise<UserRead | null> => {
	try {
		return await requestJson<UserRead>(
			"/api/v1/user/me/",
			{
				cache: "no-store",
				method: "GET",
			},
			{ redirectOnUnauthorized: false },
		);
	} catch (error: unknown) {
		if (error instanceof UnauthorizedRequestError) {
			return null;
		}

		throw error;
	}
};

export const logoutCurrentUser = async (): Promise<void> => {
	await requestJson<ApiMessageResponse>("/api/v1/logout", { method: "POST" });
};

export const getOidcLoginUrl = (): string => buildApiUrl("/api/v1/auth/oidc/login");

export const getBackendOrigin = (): string => getApiBaseUrl();