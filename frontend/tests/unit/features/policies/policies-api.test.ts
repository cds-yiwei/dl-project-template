import { afterEach, describe, expect, it, vi } from "vitest";
import { UnauthorizedRequestError } from "@/fetch";
import { createPolicy, deletePolicy, getPolicies, updatePolicy } from "@/fetch/policies";

describe("policies-api", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("requests the backend policies list with pagination parameters", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
			json: () => Promise.resolve({
				data: [{ action: "read", id: 4, resource: "roles", subject: "analyst" }],
				"has_more": false,
				"items_per_page": 10,
				page: 1,
				"total_count": 1,
			}),
			ok: true,
		} as Response);

		const response = await getPolicies();

		expect(fetchMock).toHaveBeenCalledWith(
			"http://localhost:8000/api/v1/policies?items_per_page=10&page=1",
			expect.objectContaining({
				credentials: "include",
				method: "GET",
			}),
		);
		expect(response).toMatchObject({
			data: [{ action: "read", id: 4, resource: "roles", subject: "analyst" }],
		});
	});

	it("creates a policy through the backend API", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
			headers: new Headers({ "content-type": "application/json" }),
			json: () => Promise.resolve({ action: "read", id: 4, resource: "roles", subject: "analyst" }),
			ok: true,
			status: 201,
		} as Response);

		const response = await createPolicy({ action: "read", resource: "roles", subject: "analyst" });

		expect(fetchMock).toHaveBeenCalledWith(
			"http://localhost:8000/api/v1/policy",
			expect.objectContaining({
				body: JSON.stringify({ action: "read", resource: "roles", subject: "analyst" }),
				credentials: "include",
				method: "POST",
			}),
		);
		expect(response).toMatchObject({ action: "read", id: 4, resource: "roles", subject: "analyst" });
	});

	it("updates a policy through the backend API", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
			headers: new Headers({ "content-type": "application/json" }),
			json: () => Promise.resolve({ message: "Policy updated" }),
			ok: true,
			status: 200,
		} as Response);

		const response = await updatePolicy(4, { action: "write" });

		expect(fetchMock).toHaveBeenCalledWith(
			"http://localhost:8000/api/v1/policy/4",
			expect.objectContaining({
				body: JSON.stringify({ action: "write" }),
				credentials: "include",
				method: "PATCH",
			}),
		);
		expect(response).toMatchObject({ message: "Policy updated" });
	});

	it("deletes a policy through the backend API", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
			headers: new Headers({ "content-type": "application/json" }),
			json: () => Promise.resolve({ message: "Policy deleted" }),
			ok: true,
			status: 200,
		} as Response);

		const response = await deletePolicy(4);

		expect(fetchMock).toHaveBeenCalledWith(
			"http://localhost:8000/api/v1/policy/4",
			expect.objectContaining({
				credentials: "include",
				method: "DELETE",
			}),
		);
		expect(response).toMatchObject({ message: "Policy deleted" });
	});

	it("throws an unauthorized error when the backend session has expired", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue({
			ok: false,
			status: 401,
		} as Response);

		await expect(getPolicies()).rejects.toBeInstanceOf(UnauthorizedRequestError);
	});
});