import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppNavigation from "@/components/ui/AppNavigation";
import { useSession } from "@/hooks";

vi.mock("react-i18next", () => ({
	useTranslation: (): { t: (key: string) => string } => ({
		t: (key: string): string => {
			const translations: Record<string, string> = {
				"nav.access": "My access",
					"nav.dashboard": "Dashboard",
				"nav.health": "Health",
				"nav.home": "Home",
				"nav.label": "Primary navigation",
				"nav.login": "Sign in",
				"nav.logout": "Sign out",
					"nav.posts": "Posts",
					"nav.policies": "Policies",
				"nav.profile": "Profile",
					"nav.roles": "Roles",
				"nav.tiers": "Tiers",
				"nav.users": "Users",
			};

			return translations[key] ?? key;
		},
	}),
}));

vi.mock("@tanstack/react-router", () => ({
	useRouterState: ({ select }: { select: (state: { location: { pathname: string } }) => string }): string =>
		select({ location: { pathname: "/users" } }),
}));

vi.mock("@/hooks", () => ({
	useSession: vi.fn(),
}));

describe("AppNavigation", () => {
	it("shows authenticated links when a session exists", () => {
		vi.mocked(useSession).mockReturnValue({
			currentUser: {
				id: 7,
				name: "Jane Doe",
				username: "jdoe",
				email: "jane@example.com",
				profile_image_url: "https://example.com/jane.png",
				auth_provider: "gc-sso",
				auth_subject: "subject-123",
				role_id: 3,
				tier_id: 2,
			},
			isAuthenticated: true,
			isLoading: false,
			login: vi.fn(),
			logout: vi.fn((): Promise<void> => Promise.resolve()),
			refreshSession: vi.fn((): Promise<null> => Promise.resolve(null)),
			query: {} as never,
		});

		render(<AppNavigation />);

		expect(screen.getByRole("navigation", { name: /primary navigation/i })).toBeTruthy();
		expect(screen.getByRole("link", { name: /dashboard/i })).toBeTruthy();
		expect(screen.getByRole("link", { name: /posts/i })).toBeTruthy();
		expect(screen.getByRole("link", { name: /users/i })).toBeTruthy();
		expect(screen.getByRole("link", { name: /policies/i })).toBeTruthy();
		expect(screen.getByRole("link", { name: /roles/i })).toBeTruthy();
		expect(screen.getByRole("link", { name: /tiers/i })).toBeTruthy();
		expect(screen.getByRole("link", { name: /my access/i })).toBeTruthy();
		expect(screen.getByRole("link", { name: /sign out/i })).toBeTruthy();
	});

	it("shows the public sign-in link when no session exists", () => {
		vi.mocked(useSession).mockReturnValue({
			currentUser: null,
			isAuthenticated: false,
			isLoading: false,
			login: vi.fn(),
			logout: vi.fn((): Promise<void> => Promise.resolve()),
			refreshSession: vi.fn((): Promise<null> => Promise.resolve(null)),
			query: {} as never,
		});

		render(<AppNavigation />);

		expect(screen.getByRole("link", { name: /home/i })).toBeTruthy();
		expect(screen.getByRole("link", { name: /health/i })).toBeTruthy();
		expect(screen.getByRole("link", { name: /sign in/i })).toBeTruthy();
	});
});