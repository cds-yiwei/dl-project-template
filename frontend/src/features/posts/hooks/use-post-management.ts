import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	approvePost as postApproval,
	createPost as postCreate,
	deletePost as removePost,
	rejectPost as postRejection,
	submitPostForReview as postSubmission,
	updatePost as patchPost,
	type PostCreate,
	type PostReviewPayload,
	type PostUpdate,
} from "@/fetch/posts";
import { refreshActiveListQuery } from "@/lib/refresh-active-list-query";
import { pendingReviewPostsQueryKey } from "./use-pending-review-posts";
import { postsQueryKey, usePosts, type PostsState } from "./use-posts";

export type PostManagementState = PostsState & {
	approve: (postId: number, payload: PostReviewPayload) => Promise<void>;
	createPost: (payload: PostCreate) => Promise<void>;
	deletePost: (postId: number) => Promise<void>;
	isApproving: boolean;
	isCreating: boolean;
	isDeleting: boolean;
	isRejecting: boolean;
	isSubmittingForReview: boolean;
	isUpdating: boolean;
	reject: (postId: number, payload: PostReviewPayload) => Promise<void>;
	submitForReview: (postId: number) => Promise<void>;
	updatePost: (postId: number, payload: PostUpdate) => Promise<void>;
};

export const usePostManagement = (
	username: string | null | undefined,
	page = 1,
	itemsPerPage = 25,
): PostManagementState => {
	const queryClient = useQueryClient();
	const query = usePosts(username, page, itemsPerPage);

	const refreshPosts = async (): Promise<void> => {
		if (!username) {
			return;
		}

		await refreshActiveListQuery(queryClient, {
			exactQueryKey: postsQueryKey(username, page, itemsPerPage),
			invalidationKeys: [["posts", username]],
			refetchActiveQuery: query.refetch,
		});
	};

	const createMutation = useMutation({
		mutationFn: (payload: PostCreate) => postCreate(username ?? "", payload),
		onSuccess: refreshPosts,
	});

	const updateMutation = useMutation({
		mutationFn: ({ payload, postId }: { payload: PostUpdate; postId: number }) =>
			patchPost(username ?? "", postId, payload),
		onSuccess: refreshPosts,
	});

	const deleteMutation = useMutation({
		mutationFn: (postId: number) => removePost(username ?? "", postId),
		onSuccess: refreshPosts,
	});

	const submitMutation = useMutation({
		mutationFn: (postId: number) => postSubmission(username ?? "", postId),
		onSuccess: refreshPosts,
	});

	const approveMutation = useMutation({
		mutationFn: ({ payload, postId }: { payload: PostReviewPayload; postId: number }) =>
			postApproval(postId, payload),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: pendingReviewPostsQueryKey(1, 10) });
		},
	});

	const rejectMutation = useMutation({
		mutationFn: ({ payload, postId }: { payload: PostReviewPayload; postId: number }) =>
			postRejection(postId, payload),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["pending-review-posts"] });
		},
	});

	return {
		...query,
		approve: async (postId: number, payload: PostReviewPayload): Promise<void> => {
			await approveMutation.mutateAsync({ payload, postId });
		},
		createPost: async (payload: PostCreate): Promise<void> => {
			await createMutation.mutateAsync(payload);
		},
		deletePost: async (postId: number): Promise<void> => {
			await deleteMutation.mutateAsync(postId);
		},
		isApproving: approveMutation.isPending,
		isCreating: createMutation.isPending,
		isDeleting: deleteMutation.isPending,
		isRejecting: rejectMutation.isPending,
		isSubmittingForReview: submitMutation.isPending,
		isUpdating: updateMutation.isPending,
		reject: async (postId: number, payload: PostReviewPayload): Promise<void> => {
			await rejectMutation.mutateAsync({ payload, postId });
		},
		submitForReview: async (postId: number): Promise<void> => {
			await submitMutation.mutateAsync(postId);
		},
		updatePost: async (postId: number, payload: PostUpdate): Promise<void> => {
			await updateMutation.mutateAsync({ payload, postId });
		},
	};
};