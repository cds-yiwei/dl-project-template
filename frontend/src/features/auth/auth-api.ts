export type UserRead = {
	id: number;
	name: string;
	username: string;
	email: string;
	profile_image_url: string;
	auth_provider: string | null;
	auth_subject: string | null;
	role_id: number | null;
	tier_id: number | null;
};

export type ApiMessageResponse = Record<string, string>;

export class UnauthorizedRequestError extends Error {
	status = 401;

	constructor(message = "Unauthorized request") {
		super(message);
		this.name = "UnauthorizedRequestError";
	}
}

export class ForbiddenRequestError extends Error {
	status = 403;

	constructor(message = "Forbidden request") {
		super(message);
		this.name = "ForbiddenRequestError";
	}
}

export const isUnauthorizedRequestError = (
	error: Error | null | undefined,
): error is UnauthorizedRequestError => error instanceof UnauthorizedRequestError;

export const isForbiddenRequestError = (
	error: Error | null | undefined,
): error is ForbiddenRequestError => error instanceof ForbiddenRequestError;

const defaultApiBaseUrl = "http://localhost:8000";

const getDefaultApiBaseUrl = (): string => {
	const location = globalThis.location;

	if (!location) {
		return defaultApiBaseUrl;
	}

	const hostname = location.hostname?.trim();

	if (hostname === "localhost" || hostname === "127.0.0.1") {
		return `${location.protocol}//${hostname}:8000`;
	}

	return location.origin || defaultApiBaseUrl;
};

export const getApiBaseUrl = (): string => {
	const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

	return configuredBaseUrl && configuredBaseUrl.length > 0
		? configuredBaseUrl
		: getDefaultApiBaseUrl();
};

export const buildApiUrl = (path: string): string => new URL(path, getApiBaseUrl()).toString();

export const requestJson = async <ResponseType>(
	path: string,
	requestInit: RequestInit,
): Promise<ResponseType | null> => {
	const response = await fetch(buildApiUrl(path), {
		...requestInit,
		credentials: "include",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			...(requestInit.headers ?? {}),
		},
	});

	if (response.status === 401) {
		throw new UnauthorizedRequestError();
	}

	if (response.status === 403) {
		throw new ForbiddenRequestError();
	}

	if (!response.ok) {
		throw new Error(`Request failed with status ${response.status}`);
	}

	if (response.status === 204) {
		return null;
	}

	const responseContentType = response.headers?.get?.("content-type");

	if (!responseContentType || !responseContentType.includes("application/json")) {
		return null;
	}

	return (await response.json()) as ResponseType;
};

export const getCurrentUser = async (): Promise<UserRead | null> => {
	const response = await fetch(buildApiUrl("/api/v1/user/me/"), {
		cache: "no-store",
		credentials: "include",
		headers: {
			Accept: "application/json",
		},
		method: "GET",
	});

	if (response.status === 401) {
		return null;
	}

	if (!response.ok) {
		throw new Error(`Unable to resolve current user: ${response.status}`);
	}

	return (await response.json()) as UserRead;
};

export const logoutCurrentUser = async (): Promise<void> => {
	await requestJson<Record<string, string>>("/api/v1/logout", {
		method: "POST",
	});
};

export const getOidcLoginUrl = (): string =>
	buildApiUrl("/api/v1/auth/oidc/login");

export const getBackendOrigin = (): string => getApiBaseUrl();