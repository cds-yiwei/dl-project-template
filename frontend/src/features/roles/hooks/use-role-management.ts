import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	createRole as postRole,
	deleteRole as removeRole,
	updateRole as patchRole,
	type RoleCreate,
	type RoleUpdate,
} from "@/fetch/roles";
import { refreshActiveListQuery } from "@/lib/refresh-active-list-query";
import { rolesQueryKey, useRoles, type RolesState } from "./use-roles";

export type RoleManagementState = RolesState & {
	createRole: (payload: RoleCreate) => Promise<void>;
	deleteRole: (name: string) => Promise<void>;
	isCreating: boolean;
	isDeleting: boolean;
	isUpdating: boolean;
	updateRole: (name: string, payload: RoleUpdate) => Promise<void>;
};

export const useRoleManagement = (
	page = 1,
	itemsPerPage = 10,
): RoleManagementState => {
	const queryClient = useQueryClient();
	const query = useRoles(page, itemsPerPage);

	const refreshRoles = async (): Promise<void> => {
		await refreshActiveListQuery(queryClient, {
			exactQueryKey: rolesQueryKey(page, itemsPerPage),
			invalidationKeys: [["user-role"]],
			refetchActiveQuery: query.refetch,
		});
	};

	const createMutation = useMutation({
		mutationFn: postRole,
		onSuccess: refreshRoles,
	});

	const updateMutation = useMutation({
		mutationFn: ({ name, payload }: { name: string; payload: RoleUpdate }) =>
			patchRole(name, payload),
		onSuccess: refreshRoles,
	});

	const deleteMutation = useMutation({
		mutationFn: removeRole,
		onSuccess: refreshRoles,
	});

	return {
		...query,
		createRole: async (payload: RoleCreate): Promise<void> => {
			await createMutation.mutateAsync(payload);
		},
		deleteRole: async (name: string): Promise<void> => {
			await deleteMutation.mutateAsync(name);
		},
		isCreating: createMutation.isPending,
		isDeleting: deleteMutation.isPending,
		isUpdating: updateMutation.isPending,
		updateRole: async (name: string, payload: RoleUpdate): Promise<void> => {
			await updateMutation.mutateAsync({ name, payload });
		},
	};
};