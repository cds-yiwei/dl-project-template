import { useQuery } from "@tanstack/react-query";
import { getUserPosts, type PostsListResponse } from "@/fetch/posts";

export const postsQueryKey = (username: string | null | undefined, page: number, itemsPerPage: number) =>
	["posts", username ?? "anonymous", page, itemsPerPage] as const;

export type PostsState = {
	error: Error | null;
	isLoading: boolean;
	itemsPerPage: number;
	page: number;
	posts: PostsListResponse["data"];
	refetch: () => Promise<unknown>;
	response: PostsListResponse | null;
};

export const usePosts = (
	username: string | null | undefined,
	page = 1,
	itemsPerPage = 25,
): PostsState => {
	const query = useQuery<PostsListResponse, Error>({
		enabled: Boolean(username),
		queryFn: () => getUserPosts(username ?? "", page, itemsPerPage),
		queryKey: postsQueryKey(username, page, itemsPerPage),
	});

	return {
		error: query.error ?? null,
		isLoading: query.isLoading,
		itemsPerPage,
		page,
		posts: query.data?.data ?? [],
		refetch: () => query.refetch(),
		response: query.data ?? null,
	};
};