import { useEffect } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { UserRead } from "../auth-api";
import { useAuthStore } from "@/store";

export type SessionState = {
	currentUser: UserRead | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	login: () => void;
	logout: () => Promise<void>;
	refreshSession: () => Promise<UserRead | null>;
	query: UseQueryResult<UserRead | null, Error>;
};

export const useSession = (): SessionState => {
	const currentUser = useAuthStore((state) => state.currentUser);
	const hasHydrated = useAuthStore((state) => state.hasHydrated);
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
	const isLoading = useAuthStore((state) => state.isLoading);
	const hydrateSession = useAuthStore((state) => state.hydrateSession);
	const login = useAuthStore((state) => state.login);
	const logout = useAuthStore((state) => state.logout);
	const refreshSession = useAuthStore((state) => state.refreshSession);

	useEffect(() => {
		if (hasHydrated || isLoading) {
			return;
		}

		void hydrateSession();
	}, [hasHydrated, hydrateSession, isLoading]);

	const query = {
		data: currentUser,
		fetchStatus: isLoading ? "fetching" : "idle",
		isFetched: hasHydrated,
		isFetching: isLoading,
		isLoading,
		isPending: isLoading,
		isRefetching: false,
		isSuccess: hasHydrated,
		refetch: async (): Promise<never> => ({ data: await refreshSession() } as never),
		status: isLoading ? "pending" : "success",
	} as unknown as UseQueryResult<UserRead | null, Error>;

	return {
		currentUser,
		isAuthenticated,
		isLoading,
		login,
		logout,
		refreshSession,
		query,
	};
};