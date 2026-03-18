import type { QueryClient, QueryKey } from "@tanstack/react-query";

type RefreshActiveListQueryOptions = {
	exactQueryKey: QueryKey;
	invalidationKeys?: QueryKey[];
	refetchActiveQuery: () => Promise<unknown>;
};

export const refreshActiveListQuery = async (
	queryClient: QueryClient,
	{ exactQueryKey, invalidationKeys = [], refetchActiveQuery }: RefreshActiveListQueryOptions,
): Promise<void> => {
	await queryClient.invalidateQueries({
		exact: true,
		queryKey: exactQueryKey,
		refetchType: "none",
	});

	for (const queryKey of invalidationKeys) {
		await queryClient.invalidateQueries({ queryKey, refetchType: "none" });
	}

	await refetchActiveQuery();
};