type HttpRequestErrorOptions = {
	detail?: string;
	message?: string;
	responseData?: unknown;
	status: number;
};

export class HttpRequestError extends Error {
	detail?: string;
	responseData?: unknown;
	status: number;

	constructor({ detail, message, responseData, status }: HttpRequestErrorOptions) {
		super(message ?? detail ?? `Request failed with status ${status}`);
		this.name = "HttpRequestError";
		this.detail = detail;
		this.responseData = responseData;
		this.status = status;
	}
}

export class BadRequestError extends HttpRequestError {
	constructor(options: Omit<HttpRequestErrorOptions, "status">) {
		super({ ...options, status: 400 });
		this.name = "BadRequestError";
	}
}

export class UnauthorizedRequestError extends HttpRequestError {
	constructor(options: Partial<Omit<HttpRequestErrorOptions, "status">> = {}) {
		super({
			detail: options.detail,
			message: options.message ?? options.detail ?? "Unauthorized request",
			responseData: options.responseData,
			status: 401,
		});
		this.name = "UnauthorizedRequestError";
	}
}

export class ForbiddenRequestError extends HttpRequestError {
	constructor(options: Partial<Omit<HttpRequestErrorOptions, "status">> = {}) {
		super({
			detail: options.detail,
			message: options.message ?? options.detail ?? "Forbidden request",
			responseData: options.responseData,
			status: 403,
		});
		this.name = "ForbiddenRequestError";
	}
}

export class ServerRequestError extends HttpRequestError {
	constructor(options: HttpRequestErrorOptions) {
		super(options);
		this.name = "ServerRequestError";
	}
}

export const isUnauthorizedRequestError = (
	error: Error | null | undefined,
): error is UnauthorizedRequestError => error instanceof UnauthorizedRequestError;

export const isForbiddenRequestError = (
	error: Error | null | undefined,
): error is ForbiddenRequestError => error instanceof ForbiddenRequestError;

export const isBadRequestError = (
	error: Error | null | undefined,
): error is BadRequestError => error instanceof BadRequestError;

export const isServerRequestError = (
	error: Error | null | undefined,
): error is ServerRequestError => error instanceof ServerRequestError;
