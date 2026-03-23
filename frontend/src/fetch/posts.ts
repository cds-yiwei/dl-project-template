import { requestJson } from "@/fetch";
import type { ApiMessageResponse } from "./api-types";

export type PostStatus = "draft" | "in_review" | "approved" | "rejected";

export type PostRead = {
	created_at: string;
	created_by_user_id: number;
	media_url: string | null;
	status: PostStatus;
	text: string;
	title: string;
	uuid: string;
};

export type PostCreate = {
	media_url?: string | null;
	text: string;
	title: string;
};

export type PostUpdate = {
	media_url?: string | null;
	text?: string | null;
	title?: string | null;
};

export type PostReviewPayload = {
	comment?: string | null;
};

export type PostsListResponse = {
	data: Array<PostRead>;
	"has_more": boolean;
	"items_per_page": number;
	page: number;
	"total_count": number;
};

const normalizePostPayload = <Payload extends PostCreate | PostUpdate>(payload: Payload): Payload => {
	const normalizedPayload = { ...payload };
	const mediaUrl = normalizedPayload.media_url;

	if (typeof mediaUrl === "string" && mediaUrl.trim().length === 0) {
		delete normalizedPayload.media_url;
	}

	if (mediaUrl === null) {
		delete normalizedPayload.media_url;
	}

	return normalizedPayload;
};

const getPaginatedPosts = async (path: string): Promise<PostsListResponse> =>
	(await requestJson<PostsListResponse>(path, {
		cache: "no-store",
		method: "GET",
	})) as PostsListResponse;

export const getUserPosts = async (
	userUuid: string,
	page = 1,
	itemsPerPage = 25,
): Promise<PostsListResponse> => {
	const searchParameters = new URLSearchParams({
		"items_per_page": String(itemsPerPage),
		page: String(page),
	});

	return getPaginatedPosts(`/api/v1/user/${userUuid}/posts?${searchParameters.toString()}`);
};

export const getPendingReviewPosts = async (
	page = 1,
	itemsPerPage = 10,
): Promise<PostsListResponse> => {
	const searchParameters = new URLSearchParams({
		"items_per_page": String(itemsPerPage),
		page: String(page),
	});

	return getPaginatedPosts(`/api/v1/posts/pending-review?${searchParameters.toString()}`);
};

export const createPost = async (
	userUuid: string,
	payload: PostCreate,
): Promise<PostRead | null> =>
	requestJson<PostRead>(`/api/v1/user/${userUuid}/post`, {
		body: JSON.stringify(normalizePostPayload(payload)),
		method: "POST",
	});

export const updatePost = async (
	userUuid: string,
	postUuid: string,
	payload: PostUpdate,
): Promise<ApiMessageResponse | null> =>
	requestJson<ApiMessageResponse>(`/api/v1/user/${userUuid}/post/${postUuid}`, {
		body: JSON.stringify(normalizePostPayload(payload)),
		method: "PATCH",
	});

export const deletePost = async (
	userUuid: string,
	postUuid: string,
): Promise<ApiMessageResponse | null> =>
	requestJson<ApiMessageResponse>(`/api/v1/user/${userUuid}/post/${postUuid}`, {
		method: "DELETE",
	});

export const submitPostForReview = async (
	userUuid: string,
	postUuid: string,
): Promise<ApiMessageResponse | null> =>
	requestJson<ApiMessageResponse>(`/api/v1/user/${userUuid}/post/${postUuid}/submit-review`, {
		method: "POST",
	});

export const approvePost = async (
	postUuid: string,
	payload: PostReviewPayload,
): Promise<ApiMessageResponse | null> =>
	requestJson<ApiMessageResponse>(`/api/v1/posts/${postUuid}/approve`, {
		body: JSON.stringify(payload),
		method: "POST",
	});

export const rejectPost = async (
	postUuid: string,
	payload: PostReviewPayload,
): Promise<ApiMessageResponse | null> =>
	requestJson<ApiMessageResponse>(`/api/v1/posts/${postUuid}/reject`, {
		body: JSON.stringify(payload),
		method: "POST",
	});