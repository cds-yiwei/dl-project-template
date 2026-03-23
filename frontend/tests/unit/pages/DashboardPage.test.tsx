import type { PropsWithChildren, ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ForbiddenRequestError } from "@/fetch";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { useSession, useUserRole } from "@/hooks";
import { usePendingReviewPosts, usePosts } from "@/features/posts/hooks";

const navigate = vi.fn((options: { replace?: boolean; search?: Record<string, string>; to: string }): Promise<void> => {
	void options;

	return Promise.resolve();
});

vi.mock("react-i18next", () => ({
	useTranslation: (): { t: (key: string, options?: Record<string, string | number>) => string } => ({
		t: (key: string, options?: Record<string, string | number>): string => {
			const translations: Record<string, string> = {
				"dashboard.approvedPosts": `Approved posts: ${options?.["count"] ?? 0}`,
				"dashboard.awaitingApproval": "Awaiting approval",
				"dashboard.draftPosts": `My draft posts: ${options?.["count"] ?? 0}`,
				"dashboard.email": `Email: ${options?.["value"] ?? ""}`,
				"dashboard.inReviewPosts": `Under reviewed posts: ${options?.["count"] ?? 0}`,
				"dashboard.pendingReviewSummary": `There are ${options?.["count"] ?? 0} posts waiting for a decision.`,
				"dashboard.role": `Role: ${options?.["value"] ?? "No role assigned"}`,
				"dashboard.summary": "Overview of your account and post workflow.",
				"dashboard.title": "Dashboard",
				"dashboard.username": `Username: ${options?.["value"] ?? ""}`,
			};

			return translations[key] ?? key;
		},
	}),
}));

vi.mock("@gcds-core/components-react", () => ({
	GcdsHeading: ({ children }: PropsWithChildren): ReactElement => <h1>{children}</h1>,
	GcdsNotice: ({ children, noticeTitle }: PropsWithChildren<{ noticeTitle?: string }>): ReactElement => <section>{noticeTitle ? <h2>{noticeTitle}</h2> : null}{children}</section>,
	GcdsText: ({ children }: PropsWithChildren): ReactElement => <p>{children}</p>,
}));

vi.mock("@tanstack/react-router", () => ({
	useNavigate: (): typeof navigate => navigate,
	useRouterState: ({ select }: { select: (state: { location: { pathname: string } }) => string }): string =>
		select({ location: { pathname: "/dashboard" } }),
}));

vi.mock("@/hooks", () => ({
	useSession: vi.fn(),
	useUserRole: vi.fn(),
}));

vi.mock("@/features/posts/hooks", () => ({
	usePendingReviewPosts: vi.fn(),
	usePosts: vi.fn(),
}));

describe("DashboardPage", () => {
	it("shows the signed-in profile, role, summaries, and approval queue when permitted", () => {
		vi.mocked(useSession).mockReturnValue({
			currentUser: {
				name: "Jane Doe",
				username: "jdoe",
				email: "jane@example.com",
				profile_image_url: "https://example.com/jane.png",
				auth_provider: "gc-sso",
				auth_subject: "subject-123",
				role_uuid: "role-uuid-3",
				tier_uuid: "tier-uuid-2",
				uuid: "user-uuid-7",
			},
			isAuthenticated: true,
			isLoading: false,
			login: vi.fn(),
			logout: vi.fn((): Promise<void> => Promise.resolve()),
			refreshSession: vi.fn((): Promise<null> => Promise.resolve(null)),
		});
		vi.mocked(useUserRole).mockReturnValue({
			error: null,
			isLoading: false,
			isUpdating: false,
			role: { created_at: "2026-03-18T00:00:00Z", description: "Reviewer", name: "reviewer", uuid: "role-uuid-3" },
			updateUserRole: vi.fn((): Promise<void> => Promise.resolve()),
		});
		vi.mocked(usePosts).mockReturnValue({
			error: null,
			isLoading: false,
			itemsPerPage: 100,
			page: 1,
			refetch: vi.fn((): Promise<unknown> => Promise.resolve()),
			response: null,
			posts: [
				{ created_at: "2026-03-18T00:00:00Z", created_by_user_id: 7, media_url: null, status: "draft", text: "A", title: "A", uuid: "post-uuid-1" },
				{ created_at: "2026-03-18T00:00:00Z", created_by_user_id: 7, media_url: null, status: "in_review", text: "B", title: "B", uuid: "post-uuid-2" },
				{ created_at: "2026-03-18T00:00:00Z", created_by_user_id: 7, media_url: null, status: "approved", text: "C", title: "C", uuid: "post-uuid-3" },
			],
		});
		vi.mocked(usePendingReviewPosts).mockReturnValue({
			error: null,
			isLoading: false,
			itemsPerPage: 10,
			page: 1,
			refetch: vi.fn((): Promise<unknown> => Promise.resolve()),
			response: { data: [], has_more: false, items_per_page: 10, page: 1, total_count: 2 },
			posts: [],
		});

		render(<DashboardPage />);

		expect(useUserRole).toHaveBeenCalledWith("user-uuid-7");
		expect(usePosts).toHaveBeenCalledWith("user-uuid-7", 1, 500);
		expect(screen.getByRole("heading", { name: /dashboard/i })).toBeTruthy();
		expect(screen.getByText(/username: jdoe/i)).toBeTruthy();
		expect(screen.getByText(/email: jane@example.com/i)).toBeTruthy();
		expect(screen.getByText(/role: reviewer/i)).toBeTruthy();
		expect(screen.getByText(/my draft posts: 1/i)).toBeTruthy();
		expect(screen.getByText(/under reviewed posts: 1/i)).toBeTruthy();
		expect(screen.getByText(/approved posts: 1/i)).toBeTruthy();
		expect(screen.getByRole("heading", { name: /awaiting approval/i })).toBeTruthy();
		expect(screen.getByText(/there are 2 posts waiting for a decision/i)).toBeTruthy();
	});

	it("hides the awaiting approval section when the user cannot review posts", () => {
		vi.mocked(useSession).mockReturnValue({
			currentUser: {
				name: "Jane Doe",
				username: "jdoe",
				email: "jane@example.com",
				profile_image_url: "https://example.com/jane.png",
				auth_provider: "gc-sso",
				auth_subject: "subject-123",
				role_uuid: "role-uuid-3",
				tier_uuid: "tier-uuid-2",
				uuid: "user-uuid-7",
			},
			isAuthenticated: true,
			isLoading: false,
			login: vi.fn(),
			logout: vi.fn((): Promise<void> => Promise.resolve()),
			refreshSession: vi.fn((): Promise<null> => Promise.resolve(null)),
		});
		vi.mocked(useUserRole).mockReturnValue({
			error: null,
			isLoading: false,
			isUpdating: false,
			role: null,
			updateUserRole: vi.fn((): Promise<void> => Promise.resolve()),
		});
		vi.mocked(usePosts).mockReturnValue({
			error: null,
			isLoading: false,
			itemsPerPage: 100,
			page: 1,
			refetch: vi.fn((): Promise<unknown> => Promise.resolve()),
			response: null,
			posts: [],
		});
		vi.mocked(usePendingReviewPosts).mockReturnValue({
			error: new ForbiddenRequestError(),
			isLoading: false,
			itemsPerPage: 10,
			page: 1,
			refetch: vi.fn((): Promise<unknown> => Promise.resolve()),
			response: null,
			posts: [],
		});

		render(<DashboardPage />);

		expect(useUserRole).toHaveBeenCalledWith("user-uuid-7");
		expect(usePosts).toHaveBeenCalledWith("user-uuid-7", 1, 500);
		expect(screen.queryByRole("heading", { name: /awaiting approval/i })).toBeNull();
	});
});