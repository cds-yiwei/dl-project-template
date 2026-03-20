import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	getUserRole,
	updateUserRole as patchUserRole,
	type UserRoleUpdate,
} from "@/fetch/user-roles";
import { refreshActiveListQuery } from "@/lib/refresh-active-list-query";
import { usersQueryKey } from "./use-users";

export const userRoleQueryKey = (username: string | null | undefined) =>
	["user-role", username ?? "anonymous"] as const;

export type UserRoleState = {
	error: Error | null;
	isLoading: boolean;
	isUpdating: boolean;
	role: Awaited<ReturnType<typeof getUserRole>>;
	updateUserRole: (username: string, payload: UserRoleUpdate) => Promise<void>;
};

export const useUserRole = (username: string | null | undefined): UserRoleState => {
	const queryClient = useQueryClient();
	const query = useQuery({
		enabled: Boolean(username),
		queryFn: () => getUserRole(username ?? ""),
		queryKey: userRoleQueryKey(username),
	});

	const mutation = useMutation({
		mutationFn: ({ payload, username: nextUsername }: { payload: UserRoleUpdate; username: string }) =>
			patchUserRole(nextUsername, payload),
		onSuccess: async (_response, variables) => {
			await refreshActiveListQuery(queryClient, {
				exactQueryKey: usersQueryKey(1, 10),
				invalidationKeys: [["users"], ["user-role", variables.username]],
				refetchActiveQuery: () => query.refetch(),
			});
		},
	});

	return {
		error: (query.error as Error | null | undefined) ?? null,
		isLoading: query.isLoading,
		isUpdating: mutation.isPending,
		role: query.data ?? null,
		updateUserRole: async (nextUsername: string, payload: UserRoleUpdate): Promise<void> => {
			await mutation.mutateAsync({ payload, username: nextUsername });
		},
	};
};