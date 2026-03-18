import { getBackendOrigin, UnauthorizedRequestError } from "../auth/auth-api";

export type HealthCheck = {
	status: string;
	environment: string;
	version: string;
	timestamp: string;
};

export type ReadyCheck = {
	status: string;
	environment: string;
	version: string;
	app: string;
	database: string;
	redis: string;
	timestamp: string;
};

const createSystemRequest = async <ResponseType>(path: string): Promise<ResponseType> => {
	const response = await fetch(new URL(path, getBackendOrigin()).toString(), {
		headers: {
			Accept: "application/json",
		},
		method: "GET",
	});

	if (response.status === 401) {
		throw new UnauthorizedRequestError();
	}

	if (!response.ok) {
		throw new Error(`System request failed with status ${response.status}`);
	}

	return (await response.json()) as ResponseType;
};

export const getHealthCheck = async (): Promise<HealthCheck> =>
	createSystemRequest<HealthCheck>("/api/v1/health");

export const getReadyCheck = async (): Promise<ReadyCheck> =>
	createSystemRequest<ReadyCheck>("/api/v1/ready");