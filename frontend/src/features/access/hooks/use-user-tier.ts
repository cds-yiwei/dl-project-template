import { useQuery } from "@tanstack/react-query";
import { getUserTier, type UserTierRead } from "@/fetch/access";

export type UserTierState = {
	error: Error | null;
	isLoading: boolean;
	tier: UserTierRead | null;
};

export const userTierQueryKey = (username: string) =>
	["user-tier", username] as const;

export const useUserTier = (username: string | null | undefined): UserTierState => {
	const query = useQuery<UserTierRead | null, Error>({
		enabled: Boolean(username),
		queryFn: () => getUserTier(username as string),
		queryKey: userTierQueryKey(username ?? "anonymous"),
	});

	return {
		error: query.error ?? null,
		isLoading: query.isLoading,
		tier: query.data ?? null,
	};
};