import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	getUserRole,
	updateUserRole as patchUserRole,
	type UserRoleUpdate,
} from "@/fetch/user-roles";
import { refreshActiveListQuery } from "@/lib/refresh-active-list-query";
import { usersQueryKey } from "./use-users";

export const userRoleQueryKey = (userUuid: string | null | undefined) =>
	["user-role", userUuid ?? "anonymous"] as const;

export type UserRoleState = {
	error: Error | null;
	isLoading: boolean;
	isUpdating: boolean;
	role: Awaited<ReturnType<typeof getUserRole>>;
	updateUserRole: (userUuid: string, payload: UserRoleUpdate) => Promise<void>;
};

export const useUserRole = (userUuid: string | null | undefined): UserRoleState => {
	const queryClient = useQueryClient();
	const query = useQuery({
		enabled: Boolean(userUuid),
		queryFn: () => getUserRole(userUuid ?? ""),
		queryKey: userRoleQueryKey(userUuid),
	});

	const mutation = useMutation({
		mutationFn: ({ payload, userUuid: nextUserUuid }: { payload: UserRoleUpdate; userUuid: string }) =>
			patchUserRole(nextUserUuid, payload),
		onSuccess: async (_response, variables) => {
			await refreshActiveListQuery(queryClient, {
				exactQueryKey: usersQueryKey(1, 10),
				invalidationKeys: [["users"], ["user-role", variables.userUuid]],
				refetchActiveQuery: () => query.refetch(),
			});
		},
	});

	return {
		error: (query.error as Error | null | undefined) ?? null,
		isLoading: query.isLoading,
		isUpdating: mutation.isPending,
		role: query.data ?? null,
		updateUserRole: async (nextUserUuid: string, payload: UserRoleUpdate): Promise<void> => {
			await mutation.mutateAsync({ payload, userUuid: nextUserUuid });
		},
	};
};