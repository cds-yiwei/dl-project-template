import type { PropsWithChildren, ReactElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ForbiddenRequestError } from "@/fetch";
import { PostManagementPage } from "@/features/posts/pages/PostManagementPage";
import { useSession } from "@/hooks";
import { usePendingReviewPosts, usePostManagement } from "@/features/posts/hooks";

vi.mock("react-i18next", () => ({
	useTranslation: (): { t: (key: string, options?: Record<string, string | number>) => string } => ({
		t: (key: string, options?: Record<string, string | number>): string => {
			const translations: Record<string, string> = {
				"posts.approveAction": "Approve",
				"posts.commentLabel": "Review comment",
				"posts.createAction": "Create post",
				"posts.editTitle": "Manage post",
				"posts.invalidMediaUrl": "Enter a valid media URL or leave it blank.",
				"posts.invalidText": "Post content is required.",
				"posts.invalidTitle": "Post title must be at least 2 characters.",
				"posts.manageAction": "Manage",
				"posts.manageReviewQueue": "Posts awaiting review",
				"posts.myPostsTitle": "My posts",
				"posts.rejectAction": "Reject",
				"posts.reviewTitle": "Review post",
				"posts.submitAction": "Submit for review",
				"posts.summary": "Create drafts and review submissions.",
				"posts.title": "Post management",
			};

			return translations[key] ?? (options?.["value"] as string | undefined) ?? key;
		},
	}),
}));

vi.mock("@gcds-core/components-react", () => ({
	GcdsHeading: ({ children }: PropsWithChildren): ReactElement => <h1>{children}</h1>,
	GcdsNotice: ({ children, noticeTitle }: PropsWithChildren<{ noticeTitle?: string }>): ReactElement => <section>{noticeTitle ? <h2>{noticeTitle}</h2> : null}{children}</section>,
	GcdsText: ({ children }: PropsWithChildren): ReactElement => <p>{children}</p>,
}));

vi.mock("@/hooks", () => ({
	useSession: vi.fn(),
}));

vi.mock("@/features/posts/hooks", () => ({
	usePendingReviewPosts: vi.fn(),
	usePostManagement: vi.fn(),
}));

vi.mock("@/components/ui", () => ({
	Button: ({ children, onGcdsClick, type }: PropsWithChildren<{ onGcdsClick?: () => void; type?: "button" | "submit" }>): ReactElement => (
		<button type={type ?? "button"} onClick={onGcdsClick}>{children}</button>
	),
	Input: ({ inputId, label, onInput, value }: { inputId: string; label: string; onInput?: (event: { target: { value: string } }) => void; value?: string }): ReactElement => (
		<label htmlFor={inputId}><span>{label}</span><input id={inputId} value={value} onInput={(event): void => onInput?.({ target: { value: (event.target as HTMLInputElement).value } })} /></label>
	),
	Heading: ({ children }: PropsWithChildren): ReactElement => <h1>{children}</h1>,
	Modal: ({ children, footer, isOpen, title }: PropsWithChildren<{ footer?: ReactElement; isOpen: boolean; title: string }>): ReactElement | null => isOpen ? <section><h2>{title}</h2>{children}{footer}</section> : null,
	Notice: ({ children, noticeTitle }: PropsWithChildren<{ noticeTitle?: string }>): ReactElement => <section>{noticeTitle ? <h2>{noticeTitle}</h2> : null}{children}</section>,
	Pagination: (): ReactElement | null => null,
	Text: ({ children }: PropsWithChildren): ReactElement => <p>{children}</p>,
	Textarea: ({ label, onInput, textareaId, value }: { label: string; onInput?: (event: { target: { value: string } }) => void; textareaId: string; value?: string }): ReactElement => (
		<label htmlFor={textareaId}><span>{label}</span><textarea id={textareaId} value={value} onInput={(event): void => onInput?.({ target: { value: (event.target as HTMLTextAreaElement).value } })} /></label>
	),
	DataTable: ({ action, columns, primaryAction, rows, title }: { action?: { buttonLabel: string; onAction: (row: Record<string, unknown>) => void }; columns?: Array<{ cellRenderer?: (row: Record<string, unknown>) => ReactElement | string | null; field?: string; headerName: string }>; primaryAction?: { buttonLabel: string; onAction: () => void }; rows?: Array<Record<string, unknown>>; title?: string }): ReactElement => (
		<section>
			{title ? <h2>{title}</h2> : null}
			{primaryAction ? <button onClick={primaryAction.onAction} type="button">{primaryAction.buttonLabel}</button> : null}
			{rows?.map((row) => (
				<div key={String(row["uuid"] ?? row["id"])}>
					{columns?.map((column) => (
						<div key={column.headerName}>
							{column.cellRenderer ? column.cellRenderer(row) : <span>{String(row[column.field ?? ""] ?? "")}</span>}
						</div>
					))}
					{action ? <button onClick={() => action.onAction(row)} type="button">{action.buttonLabel}</button> : null}
				</div>
			))}
		</section>
	),
}));

describe("PostManagementPage", () => {
	it("renders reviewer and author manage actions that open modal workflows", () => {
		const submitForReview = vi.fn((): Promise<void> => Promise.resolve());
		const approve = vi.fn((): Promise<void> => Promise.resolve());
		const reject = vi.fn((): Promise<void> => Promise.resolve());

		vi.mocked(useSession).mockReturnValue({
			currentUser: {
				name: "Jane Doe",
				username: "jdoe",
				email: "jane@example.com",
				profileImageUrl: "https://example.com/jane.png",
				authProvider: "gc-sso",
				authSubject: "subject-123",
				roleUuids: ["role-uuid-3"],
				tierUuid: "tier-uuid-2",
				uuid: "user-uuid-7",
			},
			isAuthenticated: true,
			isLoading: false,
			login: vi.fn(),
			logout: vi.fn((): Promise<void> => Promise.resolve()),
			refreshSession: vi.fn((): Promise<null> => Promise.resolve(null)),
		});
		vi.mocked(usePostManagement).mockReturnValue({
			approve,
			createPost: vi.fn((): Promise<void> => Promise.resolve()),
			deletePost: vi.fn((): Promise<void> => Promise.resolve()),
			error: null,
			isApproving: false,
			isCreating: false,
			isDeleting: false,
			isLoading: false,
			isRejecting: false,
			isSubmittingForReview: false,
			isUpdating: false,
			itemsPerPage: 25,
			page: 1,
			posts: [
				{ createdAt: "2026-03-18T00:00:00Z", createdByUserId: 7, mediaUrl: null, status: "draft", text: "Draft", title: "Draft post", uuid: "post-uuid-11" },
			],
			reject,
			refetch: vi.fn((): Promise<unknown> => Promise.resolve()),
			response: null,
			submitForReview,
			updatePost: vi.fn((): Promise<void> => Promise.resolve()),
		});
		vi.mocked(usePendingReviewPosts).mockReturnValue({
			error: null,
			isLoading: false,
			itemsPerPage: 10,
			page: 1,
			posts: [
				{ createdAt: "2026-03-18T00:00:00Z", createdByUserId: 9, mediaUrl: null, status: "in_review", text: "Waiting", title: "Needs review", uuid: "post-uuid-21" },
			],
			refetch: vi.fn((): Promise<unknown> => Promise.resolve()),
			response: null,
		});

		render(<PostManagementPage />);

		expect(usePostManagement).toHaveBeenCalledWith("user-uuid-7", 1, 25);
		expect(screen.getByRole("heading", { name: /post management/i })).toBeTruthy();
		const reviewHeading = screen.getByRole("heading", { name: /posts awaiting review/i });
		const myPostsHeading = screen.getByRole("heading", { name: /my posts/i });
		expect(reviewHeading.compareDocumentPosition(myPostsHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(screen.getByRole("button", { name: /create post/i })).toBeTruthy();
		expect(screen.getAllByRole("button", { name: /manage/i })).toHaveLength(2);
		expect(screen.queryByRole("button", { name: /submit for review/i })).toBeNull();
		expect(screen.queryByRole("button", { name: /approve/i })).toBeNull();
		expect(screen.queryByRole("button", { name: /reject/i })).toBeNull();

		fireEvent.click(screen.getAllByRole("button", { name: /manage/i })[0]!);
		fireEvent.input(screen.getByLabelText(/review comment/i), { target: { value: "Looks good" } });
		fireEvent.click(screen.getByRole("button", { name: /approve/i }));
		fireEvent.click(screen.getAllByRole("button", { name: /manage/i })[1]!);
		fireEvent.click(screen.getByRole("button", { name: /submit for review/i }));

		expect(approve).toHaveBeenCalledWith("post-uuid-21", { comment: "Looks good" });
		expect(submitForReview).toHaveBeenCalledWith("post-uuid-11");
	});

	it("hides reviewer actions when the user cannot access the approval queue", () => {
		vi.mocked(useSession).mockReturnValue({
			currentUser: {
				name: "Jane Doe",
				username: "jdoe",
				email: "jane@example.com",
				profileImageUrl: "https://example.com/jane.png",
				authProvider: "gc-sso",
				authSubject: "subject-123",
				roleUuids: ["role-uuid-3"],
				tierUuid: "tier-uuid-2",
				uuid: "user-uuid-7",
			},
			isAuthenticated: true,
			isLoading: false,
			login: vi.fn(),
			logout: vi.fn((): Promise<void> => Promise.resolve()),
			refreshSession: vi.fn((): Promise<null> => Promise.resolve(null)),
		});
		vi.mocked(usePostManagement).mockReturnValue({
			approve: vi.fn((): Promise<void> => Promise.resolve()),
			createPost: vi.fn((): Promise<void> => Promise.resolve()),
			deletePost: vi.fn((): Promise<void> => Promise.resolve()),
			error: null,
			isApproving: false,
			isCreating: false,
			isDeleting: false,
			isLoading: false,
			isRejecting: false,
			isSubmittingForReview: false,
			isUpdating: false,
			itemsPerPage: 25,
			page: 1,
			posts: [],
			reject: vi.fn((): Promise<void> => Promise.resolve()),
			refetch: vi.fn((): Promise<unknown> => Promise.resolve()),
			response: null,
			submitForReview: vi.fn((): Promise<void> => Promise.resolve()),
			updatePost: vi.fn((): Promise<void> => Promise.resolve()),
		});
		vi.mocked(usePendingReviewPosts).mockReturnValue({
			error: new ForbiddenRequestError(),
			isLoading: false,
			itemsPerPage: 10,
			page: 1,
			posts: [],
			refetch: vi.fn((): Promise<unknown> => Promise.resolve()),
			response: null,
		});

		render(<PostManagementPage />);

		expect(usePostManagement).toHaveBeenCalledWith("user-uuid-7", 1, 25);
		expect(screen.queryByRole("heading", { name: /posts awaiting review/i })).toBeNull();
	});

	it("does not submit an invalid create payload", () => {
		const createPost = vi.fn((): Promise<void> => Promise.resolve());

		vi.mocked(useSession).mockReturnValue({
			currentUser: {
				name: "Jane Doe",
				username: "jdoe",
				email: "jane@example.com",
				profileImageUrl: "https://example.com/jane.png",
				authProvider: "gc-sso",
				authSubject: "subject-123",
				roleUuids: ["role-uuid-3"],
				tierUuid: "tier-uuid-2",
				uuid: "user-uuid-7",
			},
			isAuthenticated: true,
			isLoading: false,
			login: vi.fn(),
			logout: vi.fn((): Promise<void> => Promise.resolve()),
			refreshSession: vi.fn((): Promise<null> => Promise.resolve(null)),
		});
		vi.mocked(usePostManagement).mockReturnValue({
			approve: vi.fn((): Promise<void> => Promise.resolve()),
			createPost,
			deletePost: vi.fn((): Promise<void> => Promise.resolve()),
			error: null,
			isApproving: false,
			isCreating: false,
			isDeleting: false,
			isLoading: false,
			isRejecting: false,
			isSubmittingForReview: false,
			isUpdating: false,
			itemsPerPage: 25,
			page: 1,
			posts: [],
			reject: vi.fn((): Promise<void> => Promise.resolve()),
			refetch: vi.fn((): Promise<unknown> => Promise.resolve()),
			response: null,
			submitForReview: vi.fn((): Promise<void> => Promise.resolve()),
			updatePost: vi.fn((): Promise<void> => Promise.resolve()),
		});
		vi.mocked(usePendingReviewPosts).mockReturnValue({
			error: new ForbiddenRequestError(),
			isLoading: false,
			itemsPerPage: 10,
			page: 1,
			posts: [],
			refetch: vi.fn((): Promise<unknown> => Promise.resolve()),
			response: null,
		});

		render(<PostManagementPage />);

		fireEvent.click(screen.getByRole("button", { name: /create post/i }));
		fireEvent.click(screen.getAllByRole("button", { name: /create post/i })[1]!);

		expect(createPost).not.toHaveBeenCalled();
		expect(screen.getByText(/post title must be at least 2 characters/i)).toBeTruthy();
		expect(screen.getByText(/post content is required/i)).toBeTruthy();
	});

	it("submits a valid create payload without a blank media url", () => {
		const createPost = vi.fn((): Promise<void> => Promise.resolve());

		vi.mocked(useSession).mockReturnValue({
			currentUser: {
				name: "Jane Doe",
				username: "jdoe",
				email: "jane@example.com",
				profileImageUrl: "https://example.com/jane.png",
				authProvider: "gc-sso",
				authSubject: "subject-123",
				roleUuids: ["role-uuid-3"],
				tierUuid: "tier-uuid-2",
				uuid: "user-uuid-7",
			},
			isAuthenticated: true,
			isLoading: false,
			login: vi.fn(),
			logout: vi.fn((): Promise<void> => Promise.resolve()),
			refreshSession: vi.fn((): Promise<null> => Promise.resolve(null)),
		});
		vi.mocked(usePostManagement).mockReturnValue({
			approve: vi.fn((): Promise<void> => Promise.resolve()),
			createPost,
			deletePost: vi.fn((): Promise<void> => Promise.resolve()),
			error: null,
			isApproving: false,
			isCreating: false,
			isDeleting: false,
			isLoading: false,
			isRejecting: false,
			isSubmittingForReview: false,
			isUpdating: false,
			itemsPerPage: 25,
			page: 1,
			posts: [],
			reject: vi.fn((): Promise<void> => Promise.resolve()),
			refetch: vi.fn((): Promise<unknown> => Promise.resolve()),
			response: null,
			submitForReview: vi.fn((): Promise<void> => Promise.resolve()),
			updatePost: vi.fn((): Promise<void> => Promise.resolve()),
		});
		vi.mocked(usePendingReviewPosts).mockReturnValue({
			error: new ForbiddenRequestError(),
			isLoading: false,
			itemsPerPage: 10,
			page: 1,
			posts: [],
			refetch: vi.fn((): Promise<unknown> => Promise.resolve()),
			response: null,
		});

		render(<PostManagementPage />);

		fireEvent.click(screen.getByRole("button", { name: /create post/i }));
		fireEvent.input(screen.getByLabelText(/posts.titleLabel/i), { target: { value: "New post" } });
		fireEvent.input(screen.getByLabelText(/posts.textLabel/i), { target: { value: "Body" } });
		fireEvent.input(screen.getByLabelText(/posts.mediaUrlLabel/i), { target: { value: "" } });
		fireEvent.click(screen.getAllByRole("button", { name: /create post/i })[1]!);

		expect(createPost).toHaveBeenCalledWith({ text: "Body", title: "New post" });
	});
});