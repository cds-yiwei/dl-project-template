import type { PropsWithChildren, ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccessPage } from "@/features/access/pages/AccessPage";
import { useSession, useUserTier } from "@/hooks";

vi.mock("react-i18next", () => ({
	useTranslation: (): { t: (key: string, options?: Record<string, string>) => string } => ({
		t: (key: string, options?: Record<string, string>): string => {
			const translations: Record<string, string> = {
				"access.title": "My access",
				"access.summary": "Tier information for the signed-in account.",
				"access.tierCreatedAt": `Tier created: ${options?.["value"] ?? ""}`,
				"access.tierName": `Tier name: ${options?.["value"] ?? ""}`,
				"access.username": `Username: ${options?.["value"] ?? ""}`,
			};

			return translations[key] ?? key;
		},
	}),
}));

vi.mock("@gcds-core/components-react", () => ({
	GcdsHeading: ({ children }: PropsWithChildren): ReactElement => <h1>{children}</h1>,
	GcdsNotice: ({ children, noticeTitle }: PropsWithChildren<{ noticeTitle?: string }>): ReactElement => (
		<section>
			{noticeTitle ? <h2>{noticeTitle}</h2> : null}
			{children}
		</section>
	),
	GcdsText: ({ children }: PropsWithChildren): ReactElement => <p>{children}</p>,
}));

vi.mock("@tanstack/react-router", () => ({
	useNavigate: vi.fn(() => vi.fn()),
	useRouterState: ({ select }: { select: (state: { location: { pathname: string } }) => string }): string =>
		select({ location: { pathname: "/access" } }),
}));

vi.mock("@/hooks", () => ({
	useSession: vi.fn(),
	useUserTier: vi.fn(),
}));

describe("AccessPage", () => {
	it("renders the current user's tier details", () => {
		vi.mocked(useSession).mockReturnValue({
			currentUser: {
				name: "Jane Doe",
				username: "jdoe",
				email: "jane@example.com",
				profileImageUrl: "https://example.com/jane.png",
				authProvider: "gc-sso",
				authSubject: "subject-123",
				roleUuid: "role-uuid-4",
				tierUuid: "tier-uuid-2",
				uuid: "user-uuid-7",
			},
			isAuthenticated: true,
			isLoading: false,
			login: vi.fn(),
			logout: vi.fn((): Promise<void> => Promise.resolve()),
			refreshSession: vi.fn((): Promise<null> => Promise.resolve(null)),
		});
		vi.mocked(useUserTier).mockReturnValue({
			error: null,
			isLoading: false,
			tier: {
				name: "Jane Doe",
				username: "jdoe",
				email: "jane@example.com",
				profileImageUrl: "https://example.com/jane.png",
				authProvider: "gc-sso",
				authSubject: "subject-123",
				roleUuid: "role-uuid-4",
					tierName: "free",
					tierCreatedAt: "2026-03-17T00:00:00Z",
					tierUuid: "tier-uuid-2",
				uuid: "user-uuid-7",
			},
		});

		render(<AccessPage />);

		expect(screen.getByRole("heading", { name: /my access/i })).toBeTruthy();
		expect(screen.getByText(/tier name: free/i)).toBeTruthy();
		expect(screen.getByText(/username: jdoe/i)).toBeTruthy();
	});
});