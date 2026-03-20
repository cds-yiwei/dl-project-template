import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	BadRequestError,
	ForbiddenRequestError,
	ServerRequestError,
	UnauthorizedRequestError,
	requestJson,
} from "@/fetch";

describe("requestJson", () => {
	const originalFetch = globalThis.fetch;
	const originalLocation = globalThis.location;

	beforeEach(() => {
		vi.unstubAllEnvs();
		vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8000");
		vi.stubGlobal("location", {
			href: "http://localhost:3000/dashboard",
			pathname: "/dashboard",
			replace: vi.fn(),
			search: "",
		} satisfies Pick<Location, "href" | "pathname" | "replace" | "search">);
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.unstubAllGlobals();
		if (originalLocation) {
			globalThis.location = originalLocation;
		}
		vi.restoreAllMocks();
	});

	it("throws a BadRequestError with backend payload details for 400 responses", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			headers: new Headers({ "content-type": "application/json" }),
			json: () => Promise.resolve({ detail: "Title is required" }),
			ok: false,
			status: 400,
		} as Response);

		await expect(
			requestJson("/api/v1/posts", {
				method: "POST",
			}),
		).rejects.toMatchObject({
			detail: "Title is required",
			status: 400,
		});
		await expect(
			requestJson("/api/v1/posts", {
				method: "POST",
			}),
		).rejects.toBeInstanceOf(BadRequestError);
	});

	it("redirects to login and throws UnauthorizedRequestError for 401 responses", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			headers: new Headers({ "content-type": "application/json" }),
			json: () => Promise.resolve({ detail: "Session expired" }),
			ok: false,
			status: 401,
		} as Response);

		await expect(
			requestJson("/api/v1/posts", {
				method: "GET",
			}),
		).rejects.toBeInstanceOf(UnauthorizedRequestError);

		expect(window.location.replace).toHaveBeenCalledWith(
			"/login?reason=unauthorized&message=session-expired&redirect=%2Fdashboard",
		);
	});

	it("throws a ForbiddenRequestError for 403 responses without redirecting", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			headers: new Headers({ "content-type": "application/json" }),
			json: () => Promise.resolve({ detail: "Forbidden" }),
			ok: false,
			status: 403,
		} as Response);

		await expect(
			requestJson("/api/v1/policies", {
				method: "GET",
			}),
		).rejects.toBeInstanceOf(ForbiddenRequestError);
		expect(window.location.replace).not.toHaveBeenCalled();
	});

	it("throws a ServerRequestError for 5xx responses", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			headers: new Headers({ "content-type": "application/json" }),
			json: () => Promise.resolve({ detail: "Backend unavailable" }),
			ok: false,
			status: 503,
		} as Response);

		await expect(
			requestJson("/api/v1/posts", {
				method: "GET",
			}),
		).rejects.toMatchObject({
			detail: "Backend unavailable",
			status: 503,
		});
		await expect(
			requestJson("/api/v1/posts", {
				method: "GET",
			}),
		).rejects.toBeInstanceOf(ServerRequestError);
	});
});