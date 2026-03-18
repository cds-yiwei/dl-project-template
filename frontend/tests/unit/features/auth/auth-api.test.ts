import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getApiBaseUrl, getCurrentUser, getOidcLoginUrl, logoutCurrentUser } from "@/features/auth/auth-api";

const createUserFixture = (): Record<string, string | number> => ({
	id: 1,
	name: "Jane Doe",
	username: "jdoe",
	email: "jane@example.com",
	"profile_image_url": "https://example.com/avatar.png",
	"auth_provider": "gc-sso",
	"auth_subject": "subject-123",
	"role_id": 1,
	"tier_id": 2,
});

describe("auth-api", () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		vi.unstubAllEnvs();
		vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8000");
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("returns the current user when the backend session is valid", async () => {
		const user = createUserFixture();

		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(user),
		}) as typeof fetch;

		await expect(getCurrentUser()).resolves.toEqual(user);
		expect(globalThis.fetch).toHaveBeenCalledWith(
			"http://localhost:8000/api/v1/user/me/",
			expect.objectContaining({
				cache: "no-store",
				credentials: "include",
				method: "GET",
			}),
		);
	});

	it("returns null when the backend says the user is unauthenticated", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 401,
		}) as typeof fetch;

		await expect(getCurrentUser()).resolves.toBeNull();
	});

	it("posts to logout with credentials included", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({ ok: true }) as typeof fetch;

		await logoutCurrentUser();

		expect(globalThis.fetch).toHaveBeenCalledWith(
			"http://localhost:8000/api/v1/logout",
			expect.objectContaining({
				credentials: "include",
				method: "POST",
			}),
		);
	});

	it("derives the fallback backend origin from the current local hostname", () => {
		vi.unstubAllEnvs();
		vi.stubGlobal("location", {
			hostname: "127.0.0.1",
			origin: "http://127.0.0.1:3000",
			protocol: "http:",
		} satisfies Pick<Location, "hostname" | "origin" | "protocol">);

		expect(getApiBaseUrl()).toBe("http://localhost:8000");
	});

	it("builds the backend OIDC login URL from the configured origin", () => {
		expect(getOidcLoginUrl()).toBe("http://localhost:8000/api/v1/auth/oidc/login");
	});
});