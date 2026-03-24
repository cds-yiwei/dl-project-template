import { toLoginHref } from "@/features/auth/login-search";
import { buildApiUrl } from "./base-url";
import {
	BadRequestError,
	ForbiddenRequestError,
	HttpRequestError,
	ServerRequestError,
	UnauthorizedRequestError,
} from "./errors";

const unauthorizedPaths = new Set(["/auth-complete", "/login"]);

type RequestJsonOptions = {
	redirectOnUnauthorized?: boolean;
};

const parseResponseData = async (response: Response): Promise<unknown> => {
	const responseContentType = response.headers?.get?.("content-type");

	if (responseContentType && responseContentType.includes("application/json")) {
		try {
			// `Response.json()` is typed as `any` by lib.dom; cast to `unknown`
			// so callers must explicitly narrow before use.
			 
			const raw = (await response.json());
			return raw;
		} catch {
			return null;
		}
	}

	if (typeof response.json !== "function") {
		return null;
	}

	try {
		// `Response.json()` is typed as `any` by lib.dom; cast to `unknown`
		// so callers must explicitly narrow before use.
		 
		const raw = (await response.json());
		return raw;
	} catch {
		return null;
	}
};

const getErrorDetail = (responseData: unknown): string | undefined => {
	if (!responseData || typeof responseData !== "object") {
		return undefined;
	}

	const detail = (responseData as Record<string, unknown>)['detail'];

	return typeof detail === "string" && detail.trim().length > 0 ? detail : undefined;
};

const redirectToLogin = (): void => {
	const location = globalThis.location;

	if (!location || unauthorizedPaths.has(location.pathname)) {
		return;
	}

	location.replace(
		toLoginHref({
			message: "session-expired",
			reason: "unauthorized",
			redirect: location.pathname,
		}),
	);
};

const toRequestError = (status: number, responseData: unknown): HttpRequestError => {
	const detail = getErrorDetail(responseData);

	if (status === 400) {
		return new BadRequestError({ detail, responseData });
	}

	if (status === 401) {
		return new UnauthorizedRequestError({ detail, responseData });
	}

	if (status === 403) {
		return new ForbiddenRequestError({ detail, responseData });
	}

	if (status >= 500) {
		return new ServerRequestError({ detail, responseData, status });
	}

	return new HttpRequestError({ detail, responseData, status });
};

export const requestJson = async <ResponseType>(
	path: string,
	requestInit: RequestInit,
	options: RequestJsonOptions = {},
): Promise<ResponseType | null> => {
	const response = await fetch(buildApiUrl(path), {
		...requestInit,
		credentials: requestInit.credentials ?? "include",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			...(requestInit.headers ?? {}),
		},
	});

	if (response.status === 204) {
		return null;
	}

	// parseResponseData may call Response.json() which is typed as `any` by lib.dom;
	// narrow to `unknown` here intentionally before further checks.
	 
	const responseData: unknown = await parseResponseData(response);

	if (!response.ok) {
		const requestError = toRequestError(response.status, responseData);

		if (
			requestError instanceof UnauthorizedRequestError &&
			options.redirectOnUnauthorized !== false
		) {
			redirectToLogin();
		}

		throw requestError;
	}

	if (responseData === null) {
		return null;
	}

	return responseData as ResponseType;
};
