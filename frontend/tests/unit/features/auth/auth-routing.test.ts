import { describe, expect, it, vi } from "vitest";
import {
	completeLoginRedirect,
	requireAuthenticatedUser,
	redirectAuthenticatedUser,
	sanitizeAppPath,
} from "@/features/auth/auth-routing";
import { ensureCurrentUser, revalidateCurrentUser } from "@/features/auth/session-queries";

vi.mock("@/features/auth/session-queries", () => ({
	ensureCurrentUser: vi.fn(),
	revalidateCurrentUser: vi.fn(),
}));

const sampleUser = {
	"auth_provider": "gc-sso",
	"auth_subject": "subject-123",
	email: "jane@example.com",
	id: 7,
	name: "Jane Doe",
	"profile_image_url": "https://example.com/jane.png",
	"role_id": 2,
	"tier_id": 3,
	username: "jdoe",
};

describe("auth-routing", () => {
	it("keeps internal app paths and rejects external ones", () => {
		expect(sanitizeAppPath("/users")).toBe("/users");
		expect(sanitizeAppPath("https://example.com/attack", "/profile")).toBe("/profile");
		expect(sanitizeAppPath(undefined, "/profile")).toBe("/profile");
	});

	it("returns the authenticated user for protected routes", async () => {
		vi.mocked(ensureCurrentUser).mockResolvedValue(sampleUser);

		await expect(requireAuthenticatedUser("/users")).resolves.toEqual(sampleUser);
	});

	it("redirects unauthenticated users to the login route", async () => {
		vi.mocked(ensureCurrentUser).mockResolvedValue(null);

		await expect(requireAuthenticatedUser("/users")).rejects.toMatchObject({
			options: {
				replace: true,
				search: { redirect: "/users" },
				to: "/login",
			},
		});
	});

	it("redirects authenticated users away from the login page", async () => {
		vi.mocked(ensureCurrentUser).mockResolvedValue(sampleUser);

		await expect(redirectAuthenticatedUser("/profile")).rejects.toMatchObject({
			options: {
				replace: true,
				to: "/profile",
			},
		});
	});

	it("revalidates session state and redirects into the authenticated area", async () => {
		vi.mocked(revalidateCurrentUser).mockResolvedValue(sampleUser);

		await expect(completeLoginRedirect("/users")).rejects.toMatchObject({
			options: {
				replace: true,
				to: "/users",
			},
		});
	});

	it("returns to login when post-login revalidation still has no session", async () => {
		vi.mocked(revalidateCurrentUser).mockResolvedValue(null);

		await expect(completeLoginRedirect("/profile")).rejects.toMatchObject({
			options: {
				replace: true,
				search: { redirect: "/profile" },
				to: "/login",
			},
		});
	});
});