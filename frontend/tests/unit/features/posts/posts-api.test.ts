import { afterEach, describe, expect, it, vi } from "vitest";
import {
	approvePost,
	createPost,
	getPendingReviewPosts,
	getUserPosts,
	rejectPost,
	submitPostForReview,
} from "@/fetch/posts";

describe("posts-api", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("loads posts for a specific user", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
			json: () => Promise.resolve({
				data: [
					{
						created_at: "2026-03-18T00:00:00Z",
						created_by_user_id: 7,
						id: 11,
						media_url: null,
						status: "draft",
						text: "Draft body",
						title: "Draft post",
					},
				],
				has_more: false,
				items_per_page: 25,
				page: 1,
				total_count: 1,
			}),
			ok: true,
			status: 200,
		} as Response);

		const response = await getUserPosts("jdoe", 1, 25);

		expect(fetchMock).toHaveBeenCalledWith(
			"http://localhost:8000/api/v1/jdoe/posts?items_per_page=25&page=1",
			expect.objectContaining({
				credentials: "include",
				method: "GET",
			}),
		);
		expect(response.total_count).toBe(1);
		expect(response.data[0]).toMatchObject({ id: 11, status: "draft", title: "Draft post" });
	});

	it("creates and submits a post for review", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce({
				headers: new Headers({ "content-type": "application/json" }),
				json: () => Promise.resolve({
					created_at: "2026-03-18T00:00:00Z",
					created_by_user_id: 7,
					id: 12,
					media_url: null,
					status: "draft",
					text: "Body",
					title: "New post",
				}),
				ok: true,
				status: 201,
			} as Response)
			.mockResolvedValueOnce({
				headers: new Headers({ "content-type": "application/json" }),
				json: () => Promise.resolve({ message: "Post submitted for review" }),
				ok: true,
				status: 200,
			} as Response);

		await createPost("jdoe", { text: "Body", title: "New post" });
		await submitPostForReview("jdoe", 12);

		expect(fetchMock).toHaveBeenNthCalledWith(
			1,
			"http://localhost:8000/api/v1/jdoe/post",
			expect.objectContaining({
				body: JSON.stringify({ text: "Body", title: "New post" }),
				method: "POST",
			}),
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			2,
			"http://localhost:8000/api/v1/jdoe/post/12/submit-review",
			expect.objectContaining({ method: "POST" }),
		);
	});

	it("loads pending review posts and sends review decisions", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce({
				json: () => Promise.resolve({
					data: [],
					has_more: false,
					items_per_page: 10,
					page: 1,
					total_count: 0,
				}),
				ok: true,
				status: 200,
			} as Response)
			.mockResolvedValueOnce({
				headers: new Headers({ "content-type": "application/json" }),
				json: () => Promise.resolve({ message: "Post approved" }),
				ok: true,
				status: 200,
			} as Response)
			.mockResolvedValueOnce({
				headers: new Headers({ "content-type": "application/json" }),
				json: () => Promise.resolve({ message: "Post rejected" }),
				ok: true,
				status: 200,
			} as Response);

		await getPendingReviewPosts(1, 10);
		await approvePost(19, { comment: "Looks good" });
		await rejectPost(20, { comment: "Needs revisions" });

		expect(fetchMock).toHaveBeenNthCalledWith(
			1,
			"http://localhost:8000/api/v1/posts/pending-review?items_per_page=10&page=1",
			expect.objectContaining({ method: "GET" }),
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			2,
			"http://localhost:8000/api/v1/posts/19/approve",
			expect.objectContaining({
				body: JSON.stringify({ comment: "Looks good" }),
				method: "POST",
			}),
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			3,
			"http://localhost:8000/api/v1/posts/20/reject",
			expect.objectContaining({
				body: JSON.stringify({ comment: "Needs revisions" }),
				method: "POST",
			}),
		);
	});

	it("omits a blank media url from create payloads", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
			headers: new Headers({ "content-type": "application/json" }),
			json: () => Promise.resolve({
				created_at: "2026-03-18T00:00:00Z",
				created_by_user_id: 7,
				id: 12,
				media_url: null,
				status: "draft",
				text: "Body",
				title: "New post",
			}),
			ok: true,
			status: 201,
		} as Response);

		await createPost("jdoe", { media_url: "", text: "Body", title: "New post" });

		expect(fetchMock).toHaveBeenCalledWith(
			"http://localhost:8000/api/v1/jdoe/post",
			expect.objectContaining({
				body: JSON.stringify({ text: "Body", title: "New post" }),
				method: "POST",
			}),
		);
	});
});