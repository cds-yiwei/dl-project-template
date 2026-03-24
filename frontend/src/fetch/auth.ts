import type { ApiMessageResponse } from "./api-types";
import { buildApiUrl, getApiBaseUrl } from "./base-url";
import { UnauthorizedRequestError } from "./errors";
import { requestJson } from "./request-json";

export type UserRead = {
	authProvider: string | null;
	authSubject: string | null;
	departmentAbbreviation?: string | null;
	departmentUuid?: string | null;
	email: string;
	name: string;
	profileImageUrl: string | null;
	roleUuid: string | null;
	tierUuid: string | null;
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