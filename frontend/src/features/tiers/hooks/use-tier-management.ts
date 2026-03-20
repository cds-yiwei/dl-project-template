import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	createTier as postTier,
	deleteTier as removeTier,
	updateTier as patchTier,
	type TierCreate,
	type TierUpdate,
} from "@/fetch/tiers";
import { refreshActiveListQuery } from "@/lib/refresh-active-list-query";
import { tiersQueryKey, useTiers, type TiersState } from "./use-tiers";

export type TierManagementState = TiersState & {
	createTier: (payload: TierCreate) => Promise<void>;
	deleteTier: (name: string) => Promise<void>;
	isCreating: boolean;
	isDeleting: boolean;
	isUpdating: boolean;
	updateTier: (name: string, payload: TierUpdate) => Promise<void>;
};

export const useTierManagement = (
	page = 1,
	itemsPerPage = 10,
): TierManagementState => {
	const queryClient = useQueryClient();
	const query = useTiers(page, itemsPerPage);

	const refreshTiers = async (): Promise<void> => {
		await refreshActiveListQuery(queryClient, {
			exactQueryKey: tiersQueryKey(page, itemsPerPage),
			invalidationKeys: [["user-tier"]],
			refetchActiveQuery: query.refetch,
		});
	};

	const createMutation = useMutation({
		mutationFn: postTier,
		onSuccess: refreshTiers,
	});

	const updateMutation = useMutation({
		mutationFn: ({ name, payload }: { name: string; payload: TierUpdate }) =>
			patchTier(name, payload),
		onSuccess: refreshTiers,
	});

	const deleteMutation = useMutation({
		mutationFn: removeTier,
		onSuccess: refreshTiers,
	});

	return {
		...query,
		createTier: async (payload: TierCreate): Promise<void> => {
			await createMutation.mutateAsync(payload);
		},
		deleteTier: async (name: string): Promise<void> => {
			await deleteMutation.mutateAsync(name);
		},
		isCreating: createMutation.isPending,
		isDeleting: deleteMutation.isPending,
		isUpdating: updateMutation.isPending,
		updateTier: async (name: string, payload: TierUpdate): Promise<void> => {
			await updateMutation.mutateAsync({ name, payload });
		},
	};
};