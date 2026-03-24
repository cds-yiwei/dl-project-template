import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	getUserDepartment,
	updateUserDepartment as patchUserDepartment,
	type UserDepartmentUpdate,
} from "@/fetch/user-departments";
import { refreshActiveListQuery } from "@/lib/refresh-active-list-query";
import { usersQueryKey } from "./use-users";

export const userDepartmentQueryKey = (userUuid: string | null | undefined) =>
	["user-department", userUuid ?? "anonymous"] as const;

export type UserDepartmentState = {
	department: Awaited<ReturnType<typeof getUserDepartment>>;
	error: Error | null;
	isLoading: boolean;
	isUpdating: boolean;
	updateUserDepartment: (userUuid: string, payload: UserDepartmentUpdate) => Promise<void>;
};

export const useUserDepartment = (userUuid: string | null | undefined): UserDepartmentState => {
	const queryClient = useQueryClient();
	const query = useQuery({
		enabled: Boolean(userUuid),
		queryFn: () => getUserDepartment(userUuid ?? ""),
		queryKey: userDepartmentQueryKey(userUuid),
	});

	const mutation = useMutation({
		mutationFn: ({ payload, userUuid: nextUserUuid }: { payload: UserDepartmentUpdate; userUuid: string }) =>
			patchUserDepartment(nextUserUuid, payload),
		onSuccess: async (_response, variables) => {
			await refreshActiveListQuery(queryClient, {
				exactQueryKey: usersQueryKey(1, 10),
				invalidationKeys: [["users"], ["user-department", variables.userUuid]],
				refetchActiveQuery: () => query.refetch(),
			});
		},
	});

	return {
		department: query.data ?? null,
		error: (query.error as Error | null | undefined) ?? null,
		isLoading: query.isLoading,
		isUpdating: mutation.isPending,
		updateUserDepartment: async (nextUserUuid: string, payload: UserDepartmentUpdate): Promise<void> => {
			await mutation.mutateAsync({ payload, userUuid: nextUserUuid });
		},
	};
};