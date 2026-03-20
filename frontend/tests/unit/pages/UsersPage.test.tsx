import type { PropsWithChildren, ReactElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UnauthorizedRequestError } from "@/fetch";
import { UsersPage } from "@/features/users/pages/UsersPage";
import { useRoles, useUserManagement, useUserRole } from "@/hooks";

const navigate = vi.fn((options: { replace?: boolean; search?: Record<string, string>; to: string }): Promise<void> => {
	void options;

	return Promise.resolve();
});

vi.mock("react-i18next", () => ({
	useTranslation: (): { t: (key: string, options?: Record<string, string>) => string } => ({
		t: (key: string, options?: Record<string, string>): string => {
			const translations: Record<string, string> = {
				"users.createAction": "Create user",
				"users.createTitle": "Create user",
				"users.editTitle": "Edit user",
				"users.email": `Email: ${options?.["value"] ?? ""}`,
				"users.loadingRoleBody": "Loading role assignment.",
				"users.manageAction": "Manage user",
				"users.manageRoleTitle": "Assigned role",
				"users.profileLink": "Open profile",
				"users.provider": `Provider: ${options?.["value"] ?? ""}`,
				"users.role": `Role: ${options?.["value"] ?? ""}`,
				"users.resultsSummary": `Showing ${options?.["count"] ?? "0"} users on page ${options?.["page"] ?? "1"}`,
				"users.roleSaveAction": "Save role",
				"users.summary": "Protected list of backend users.",
				"users.title": "Users",
				"users.username": `Username: ${options?.["value"] ?? ""}`,
			};

			return translations[key] ?? key;
		},
	}),
}));

vi.mock("@gcds-core/components-react", () => ({
	GcdsHeading: ({ children }: PropsWithChildren): ReactElement => <h1>{children}</h1>,
	GcdsLink: ({ children, ...properties }: PropsWithChildren<Record<string, unknown>>): ReactElement => <a {...properties}>{children}</a>,
	GcdsNotice: ({ children, noticeTitle }: PropsWithChildren<{ noticeTitle?: string }>): ReactElement => (
		<section>
			{noticeTitle ? <h2>{noticeTitle}</h2> : null}
			{children}
		</section>
	),
	GcdsText: ({ children }: PropsWithChildren): ReactElement => <p>{children}</p>,
}));

vi.mock("@/components/ui", () => ({
	Button: ({ children, onGcdsClick, type }: PropsWithChildren<{ onGcdsClick?: () => void; type?: "button" | "submit" }>): ReactElement => (
		<button type={type ?? "button"} onClick={onGcdsClick}>
			{children}
		</button>
	),
	ConfirmDialog: ({ isOpen, title }: { isOpen: boolean; title: string }): ReactElement | null => (isOpen ? <section><h2>{title}</h2></section> : null),
	DataTable: ({ action, pageNumber, primaryAction, rows, title, summary }: { action?: { buttonLabel: string; onAction: (row: { email: string; id: number; name: string; provider: string; roleName: string; username: string }) => void }; pageNumber?: number; primaryAction?: { buttonLabel: string; onAction: () => void }; rows?: Array<{ email: string; id: number; name: string; provider: string; roleName: string; username: string }>; title?: string; summary?: string }): ReactElement => (
		<section>
			{title ? <h2>{title}</h2> : null}
			<p>{summary ?? `Showing ${rows?.length ?? 0} users on page ${pageNumber ?? 1}`}</p>
			{primaryAction ? <button onClick={primaryAction.onAction} type="button">{primaryAction.buttonLabel}</button> : null}
			{action && rows && rows[0] ? <button onClick={() => action.onAction(rows[0]!)} type="button">{action.buttonLabel}</button> : null}
		</section>
	),
	Pagination: ({ currentPage, totalPages }: { currentPage: number; totalPages: number }): ReactElement | null => (totalPages > 1 ? <p>{`Page ${currentPage} of ${totalPages}`}</p> : null),
	Input: ({ inputId, label, name, onInput, type, value }: { inputId: string; label: string; name: string; onInput?: (event: { target: { value: string } }) => void; type?: string; value?: string }): ReactElement => (
		<label htmlFor={inputId}>
			<span>{label}</span>
			<input id={inputId} name={name} type={type} value={value} onInput={(event): void => onInput?.({ target: { value: (event.target as HTMLInputElement).value } })} />
		</label>
	),
	Heading: ({ children }: PropsWithChildren): ReactElement => <h1>{children}</h1>,
	Notice: ({ children, noticeTitle }: PropsWithChildren<{ noticeTitle?: string }>): ReactElement => <section>{noticeTitle ? <h2>{noticeTitle}</h2> : null}{children}</section>,
	Select: ({ children, label, name, onInput, selectId, value }: PropsWithChildren<{ label: string; name: string; onInput?: (event: { target: { value: string } }) => void; selectId: string; value?: string }>): ReactElement => (
		<label htmlFor={selectId}>
			<span>{label}</span>
			<select id={selectId} name={name} value={value} onInput={(event): void => onInput?.({ target: { value: (event.target as HTMLSelectElement).value } })}>
				{children}
			</select>
		</label>
	),
	Text: ({ children }: PropsWithChildren): ReactElement => <p>{children}</p>,
	Modal: ({ children, isOpen, title }: PropsWithChildren<{ isOpen: boolean; title: string }>): ReactElement | null => (isOpen ? <section><h2>{title}</h2>{children}</section> : null),
}));

vi.mock("@tanstack/react-router", () => ({
	useNavigate: (): typeof navigate => navigate,
	useRouterState: ({ select }: { select: (state: { location: { pathname: string } }) => string }): string =>
		select({ location: { pathname: "/users" } }),
}));

vi.mock("@/hooks", () => ({
	useAdminListState: vi.fn(() => ({
		page: 1,
		searchDraft: "",
		setPage: vi.fn(),
		setSearchDraft: vi.fn(),
	})),
	useRoles: vi.fn(),
	useUserManagement: vi.fn(),
	useUserRole: vi.fn(),
}));

describe("UsersPage", () => {
	it("supports modal-driven user management with inline role assignment", () => {
		vi.mocked(useUserManagement).mockReturnValue({
			error: null,
			createUser: vi.fn((): Promise<void> => Promise.resolve()),
			deleteUser: vi.fn((): Promise<void> => Promise.resolve()),
			isCreating: false,
			isDeleting: false,
			isLoading: false,
			isUpdating: false,
			itemsPerPage: 10,
			page: 1,
			response: {
				data: [
					{
						"auth_provider": "gc-sso",
						"auth_subject": "subject-123",
						email: "jane@example.com",
						id: 7,
						name: "Jane Doe",
						"profile_image_url": "https://example.com/jane.png",
						"role_id": 3,
						"tier_id": 3,
						username: "jdoe",
					},
				],
				"has_more": false,
				"items_per_page": 10,
				page: 1,
				"total_count": 1,
			},
			users: [
				{
					"auth_provider": "gc-sso",
					"auth_subject": "subject-123",
					email: "jane@example.com",
					id: 7,
					name: "Jane Doe",
					"profile_image_url": "https://example.com/jane.png",
					"role_id": 3,
					"tier_id": 3,
					username: "jdoe",
				},
			],
			updateUser: vi.fn((): Promise<void> => Promise.resolve()),
		});
		vi.mocked(useRoles).mockReturnValue({
			error: null,
			isLoading: false,
			itemsPerPage: 10,
			page: 1,
			refetch: vi.fn((): Promise<unknown> => Promise.resolve()),
			response: {
				data: [{ created_at: "2026-03-17T00:00:00Z", description: "Administrator role", id: 3, name: "admin" }],
				"has_more": false,
				"items_per_page": 10,
				page: 1,
				"total_count": 1,
			},
			roles: [{ created_at: "2026-03-17T00:00:00Z", description: "Administrator role", id: 3, name: "admin" }],
		});
		vi.mocked(useUserRole).mockReturnValue({
			error: null,
			isLoading: false,
			isUpdating: false,
			role: { created_at: "2026-03-17T00:00:00Z", description: "Administrator role", id: 3, name: "admin" },
			updateUserRole: vi.fn((): Promise<void> => Promise.resolve()),
		});

		render(<UsersPage />);

		expect(screen.getAllByRole("heading", { name: /users/i }).length).toBeGreaterThan(0);
		expect(screen.getByRole("button", { name: /create user/i })).toBeTruthy();
		expect(screen.getByText(/showing 1 users on page 1/i)).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: /create user/i }));
		expect(screen.getByRole("heading", { name: /create user/i })).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: /manage user/i }));
		expect(screen.getByRole("heading", { name: /edit user/i })).toBeTruthy();
		expect(screen.getByRole("heading", { name: /assigned role/i })).toBeTruthy();
		expect(screen.getByRole("button", { name: /save role/i })).toBeTruthy();
	});

	it("does not render a generic error notice for unauthorized hook errors", () => {
		vi.mocked(useUserManagement).mockReturnValue({
			error: new UnauthorizedRequestError(),
			createUser: vi.fn((): Promise<void> => Promise.resolve()),
			deleteUser: vi.fn((): Promise<void> => Promise.resolve()),
			isCreating: false,
			isDeleting: false,
			isLoading: false,
			isUpdating: false,
			itemsPerPage: 10,
			page: 1,
			response: null,
			updateUser: vi.fn((): Promise<void> => Promise.resolve()),
			users: [],
		});
		vi.mocked(useRoles).mockReturnValue({
			error: null,
			isLoading: false,
			itemsPerPage: 10,
			page: 1,
			refetch: vi.fn((): Promise<unknown> => Promise.resolve()),
			response: null,
			roles: [],
		});
		vi.mocked(useUserRole).mockReturnValue({
			error: null,
			isLoading: false,
			isUpdating: false,
			role: null,
			updateUserRole: vi.fn((): Promise<void> => Promise.resolve()),
		});

		render(<UsersPage />);

		expect(navigate).not.toHaveBeenCalled();
		expect(screen.queryByText(/users.errorTitle/i)).toBeNull();
	});
});