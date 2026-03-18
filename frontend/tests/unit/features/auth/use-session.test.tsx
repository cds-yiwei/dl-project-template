import type { PropsWithChildren, ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSession } from "@/features/auth/hooks/use-session";

vi.mock("@/features/auth/auth-api", () => ({
	getCurrentUser: vi.fn(),
	getOidcLoginUrl: vi.fn((): string => "http://localhost:8000/api/v1/auth/oidc/login"),
	logoutCurrentUser: vi.fn((): Promise<void> => Promise.resolve()),
}));

type DeferredPromise<T> = {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (reason?: unknown) => void;
};

const createDeferred = <T,>(): DeferredPromise<T> => {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;

	const promise = new Promise<T>((innerResolve, innerReject) => {
		resolve = innerResolve;
		reject = innerReject;
	});

	return { promise, reject, resolve };
};

describe("useSession", () => {
	let getCurrentUser: typeof import("@/features/auth/auth-api").getCurrentUser;
	let logoutCurrentUser: typeof import("@/features/auth/auth-api").logoutCurrentUser;

	beforeEach(async () => {
		({ getCurrentUser, logoutCurrentUser } = await import("@/features/auth/auth-api"));
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("keeps the user signed out when a stale current-user request resolves after logout", async () => {
		const deferredCurrentUser = createDeferred<{
			id: number;
			name: string;
			username: string;
			email: string;
			profile_image_url: string;
			auth_provider: string | null;
			auth_subject: string | null;
			role_id: number | null;
			tier_id: number | null;
		}>();

		vi.mocked(getCurrentUser).mockImplementation(() => deferredCurrentUser.promise);
		vi.mocked(logoutCurrentUser).mockResolvedValue();

		const queryClient = new QueryClient();
		const wrapper = ({ children }: PropsWithChildren): ReactElement => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);

		const { result } = renderHook(() => useSession(), { wrapper });

		await act(async () => {
			await result.current.logout();
		});

		expect(result.current.currentUser).toBeNull();
		expect(result.current.isAuthenticated).toBe(false);

		deferredCurrentUser.resolve({
			auth_provider: "gc-sso",
			auth_subject: "subject-123",
			email: "jane@example.com",
			id: 7,
			name: "Jane Doe",
			profile_image_url: "https://example.com/jane.png",
			role_id: 2,
			tier_id: 3,
			username: "jdoe",
		});

		await waitFor(() => {
			expect(result.current.currentUser).toBeNull();
			expect(result.current.isAuthenticated).toBe(false);
		});
	});
});