import { queryOptions } from "@tanstack/react-query";
import { authStore } from "@/store";
import { getCurrentUser, type UserRead } from "@/fetch/auth";

export const currentUserQueryKey = ["auth", "current-user"] as const;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export const currentUserQueryOptions = () =>
	queryOptions<UserRead | null, Error>({
		queryKey: currentUserQueryKey,
		queryFn: getCurrentUser,
		retry: false,
	});

export const ensureCurrentUser = async (): Promise<UserRead | null> =>
	authStore.getState().hydrateSession();

export const revalidateCurrentUser = async (): Promise<UserRead | null> =>
	authStore.getState().refreshSession();