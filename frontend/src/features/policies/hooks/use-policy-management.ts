import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	createPolicy as postPolicy,
	deletePolicy as removePolicy,
	updatePolicy as patchPolicy,
	type PolicyCreate,
	type PolicyUpdate,
} from "../policies-api";
import { refreshActiveListQuery } from "@/lib/refresh-active-list-query";
import { policiesQueryKey, usePolicies, type PoliciesState } from "./use-policies";

export type PolicyManagementState = PoliciesState & {
	createPolicy: (payload: PolicyCreate) => Promise<void>;
	deletePolicy: (policyId: number) => Promise<void>;
	isCreating: boolean;
	isDeleting: boolean;
	isUpdating: boolean;
	updatePolicy: (policyId: number, payload: PolicyUpdate) => Promise<void>;
};

export const usePolicyManagement = (
	page = 1,
	itemsPerPage = 10,
): PolicyManagementState => {
	const queryClient = useQueryClient();
	const query = usePolicies(page, itemsPerPage);

	const refreshPolicies = async (): Promise<void> => {
		await refreshActiveListQuery(queryClient, {
			exactQueryKey: policiesQueryKey(page, itemsPerPage),
			refetchActiveQuery: query.refetch,
		});
	};

	const createMutation = useMutation({
		mutationFn: postPolicy,
		onSuccess: refreshPolicies,
	});

	const updateMutation = useMutation({
		mutationFn: ({ payload, policyId }: { payload: PolicyUpdate; policyId: number }) =>
			patchPolicy(policyId, payload),
		onSuccess: refreshPolicies,
	});

	const deleteMutation = useMutation({
		mutationFn: removePolicy,
		onSuccess: refreshPolicies,
	});

	return {
		...query,
		createPolicy: async (payload: PolicyCreate): Promise<void> => {
			await createMutation.mutateAsync(payload);
		},
		deletePolicy: async (policyId: number): Promise<void> => {
			await deleteMutation.mutateAsync(policyId);
		},
		isCreating: createMutation.isPending,
		isDeleting: deleteMutation.isPending,
		isUpdating: updateMutation.isPending,
		updatePolicy: async (policyId: number, payload: PolicyUpdate): Promise<void> => {
			await updateMutation.mutateAsync({ payload, policyId });
		},
	};
};