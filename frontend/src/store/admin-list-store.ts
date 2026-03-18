import { useStore } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";

type AdminListKey = "policies" | "roles" | "tiers" | "users";

type AdminListViewState = {
	page: number;
	searchDraft: string;
};

type AdminListStoreState = {
	lists: Record<AdminListKey, AdminListViewState>;
	resetAllListState: () => void;
	resetListState: (key: AdminListKey) => void;
	setPage: (key: AdminListKey, page: number) => void;
	setSearchDraft: (key: AdminListKey, searchDraft: string) => void;
};

const createDefaultListState = (): AdminListViewState => ({
	page: 1,
	searchDraft: "",
});

const createInitialLists = (): Record<AdminListKey, AdminListViewState> => ({
	policies: createDefaultListState(),
	roles: createDefaultListState(),
	tiers: createDefaultListState(),
	users: createDefaultListState(),
});

const adminListStore = createStore<AdminListStoreState>()(
	persist(
		(set) => ({
			lists: createInitialLists(),
			resetAllListState: () => {
				set({ lists: createInitialLists() });
			},
			resetListState: (key) => {
				set((state) => ({
					lists: {
						...state.lists,
						[key]: createDefaultListState(),
					},
				}));
			},
			setPage: (key, page) => {
				set((state) => ({
					lists: {
						...state.lists,
						[key]: {
							...state.lists[key],
							page: Math.max(1, page),
						},
					},
				}));
			},
			setSearchDraft: (key, searchDraft) => {
				set((state) => ({
					lists: {
						...state.lists,
						[key]: {
							...state.lists[key],
							searchDraft,
						},
					},
				}));
			},
		}),
		{
			name: "admin-list-store",
			partialize: (state) => ({ lists: state.lists }),
			storage: createJSONStorage(() => localStorage),
		},
	),
);

const useAdminListState = (key: AdminListKey): AdminListViewState & {
	reset: () => void;
	setPage: (page: number) => void;
	setSearchDraft: (searchDraft: string) => void;
} => {
	const listState = useStore(adminListStore, (state) => state.lists[key]);
	const setPage = useStore(adminListStore, (state) => state.setPage);
	const setSearchDraft = useStore(adminListStore, (state) => state.setSearchDraft);
	const resetListState = useStore(adminListStore, (state) => state.resetListState);

	return {
		...listState,
		reset: () => {
			resetListState(key);
		},
		setPage: (page) => {
			setPage(key, page);
		},
		setSearchDraft: (searchDraft) => {
			setSearchDraft(key, searchDraft);
		},
	};
};

const resetAdminListStore = (): void => {
	adminListStore.getState().resetAllListState();
	localStorage.removeItem("admin-list-store");
};

export { adminListStore, resetAdminListStore, useAdminListState };
export type { AdminListKey, AdminListStoreState, AdminListViewState };