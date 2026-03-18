import { afterEach, describe, expect, it, vi } from "vitest";
import { UnauthorizedRequestError } from "@/features/auth/auth-api";
import { getUserRole, updateUserRole } from "@/features/user-roles/user-roles-api";

describe("user-roles-api", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("loads the assigned role for a user", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
			json: () => Promise.resolve({
				created_at: "2026-03-17T00:00:00Z",
				description: "Administrator role",
				id: 3,
				name: "admin",
			}),
			ok: true,
			status: 200,
		} as Response);

		const response = await getUserRole("jdoe");

		expect(fetchMock).toHaveBeenCalledWith(
			"http://localhost:8000/api/v1/user/jdoe/role",
			expect.objectContaining({
				credentials: "include",
				method: "GET",
			}),
		);
		expect(response).toMatchObject({
			id: 3,
			name: "admin",
		});
	});

	it("updates the assigned role for a user", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
			headers: new Headers({ "content-type": "application/json" }),
			json: () => Promise.resolve({ message: "Role updated successfully" }),
			ok: true,
			status: 200,
		} as Response);

		const response = await updateUserRole("jdoe", { role_id: 3 });

		expect(fetchMock).toHaveBeenCalledWith(
			"http://localhost:8000/api/v1/user/jdoe/role",
			expect.objectContaining({
				body: JSON.stringify({ role_id: 3 }),
				credentials: "include",
				method: "PATCH",
			}),
		);
		expect(response).toMatchObject({ message: "Role updated successfully" });
	});

	it("throws an unauthorized error when the backend session has expired", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue({
			ok: false,
			status: 401,
		} as Response);

		await expect(getUserRole("jdoe")).rejects.toBeInstanceOf(UnauthorizedRequestError);
	});
});