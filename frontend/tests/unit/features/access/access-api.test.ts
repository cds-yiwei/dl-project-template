import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getUserTier } from "@/features/access/access-api";

describe("access-api", () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		vi.unstubAllEnvs();
		vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8000");
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	it("requests the current user's tier details", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			json: () => Promise.resolve({
				id: 7,
				username: "jdoe",
				name: "Jane Doe",
				email: "jane@example.com",
				profile_image_url: "https://example.com/jane.png",
				auth_provider: "gc-sso",
				auth_subject: "subject-123",
				role_id: 4,
				tier_id: 2,
				tier_name: "free",
				tier_created_at: "2026-03-17T00:00:00Z",
			}),
			ok: true,
		} as Response) as typeof fetch;

		const response = await getUserTier("jdoe");

		expect(globalThis.fetch).toHaveBeenCalledWith(
			"http://localhost:8000/api/v1/user/jdoe/tier",
			expect.objectContaining({
				credentials: "include",
				method: "GET",
			}),
		);
		expect(response?.tier_name).toBe("free");
	});
});