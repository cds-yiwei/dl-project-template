import { GcdsHeading, GcdsNotice, GcdsText } from "@gcds-core/components-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { CenteredPageLayout } from "@/components/layout";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { Button, DataTable, Input, Modal, Pagination, Textarea } from "@/components/ui";
import { ForbiddenRequestError, isUnauthorizedRequestError } from "@/features/auth/auth-api";
import { usePendingReviewPosts, usePostManagement } from "@/features/posts/hooks";
import type { PostRead } from "@/features/posts/posts-api";
import { useSession } from "@/hooks";
import { releaseActiveElementFocus } from "@/lib/release-active-element-focus";

type PostFormState = {
	mediaUrl: string;
	text: string;
	title: string;
};

type PostFormErrors = {
	mediaUrl: string | null;
	text: string | null;
	title: string | null;
};

type ValueInputEvent = {
	target: {
		value: string;
	};
};

type AuthorPostRow = {
	id: number;
	mediaUrl: string;
	status: PostRead["status"];
	text: string;
	title: string;
};

type ReviewPostRow = {
	id: number;
	status: PostRead["status"];
	text: string;
	title: string;
};

const emptyPostForm: PostFormState = {
	mediaUrl: "",
	text: "",
	title: "",
};

const emptyPostFormErrors: PostFormErrors = {
	mediaUrl: null,
	text: null,
	title: null,
};

const canSubmitForReview = (status: PostRead["status"]): boolean =>
	status === "draft" || status === "rejected";

const canEditPost = (status: PostRead["status"]): boolean =>
	status === "draft" || status === "rejected";

const getEventValue = (event: ValueInputEvent): string => event.target.value;

const isValidMediaUrl = (value: string): boolean => {
	try {
		const url = new URL(value);
		return ["http:", "https:", "ftp:"].includes(url.protocol);
	} catch {
		return false;
	}
};

export const PostManagementPage = (): FunctionComponent => {
	const { t } = useTranslation();
	const { currentUser, isLoading: isSessionLoading } = useSession();
	const username = currentUser?.username ?? null;
	const [authorPage, setAuthorPage] = useState(1);
	const [reviewPage, setReviewPage] = useState(1);
	const [authorSearch, setAuthorSearch] = useState("");
	const [formState, setFormState] = useState<PostFormState>(emptyPostForm);
	const [formErrors, setFormErrors] = useState<PostFormErrors>(emptyPostFormErrors);
	const [modalMode, setModalMode] = useState<"create" | "edit" | "review" | null>(null);
	const [reviewComments, setReviewComments] = useState<Record<number, string>>({});
	const [reviewSearch, setReviewSearch] = useState("");
	const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
	const {
		approve,
		createPost,
		deletePost,
		error,
		isApproving,
		isCreating,
		isDeleting,
		isLoading,
		isRejecting,
		isSubmittingForReview,
		isUpdating,
		posts,
		reject,
		response,
		submitForReview,
		updatePost,
	} = usePostManagement(username, authorPage, 25);
	const {
		error: pendingReviewError,
		isLoading: isPendingReviewLoading,
		posts: pendingReviewPosts,
		response: pendingReviewResponse,
	} = usePendingReviewPosts(reviewPage, 10);
	const canReviewPosts = !(pendingReviewError instanceof ForbiddenRequestError);
	const isModalOpen = modalMode !== null;
	const totalAuthorPages = response ? Math.max(1, Math.ceil(response.total_count / response.items_per_page)) : 1;
	const totalReviewPages = pendingReviewResponse
		? Math.max(1, Math.ceil(pendingReviewResponse.total_count / pendingReviewResponse.items_per_page))
		: 1;
	const authorRows: Array<AuthorPostRow> = posts.map((post) => ({
		id: post.id,
		mediaUrl: post.media_url ?? "",
		status: post.status,
		text: post.text,
		title: post.title,
	}));
	const reviewRows: Array<ReviewPostRow> = pendingReviewPosts.map((post) => ({
		id: post.id,
		status: post.status,
		text: post.text,
		title: post.title,
	}));
	const selectedAuthorPost = selectedPostId ? (posts.find((post) => post.id === selectedPostId) ?? null) : null;
	const selectedReviewPost = selectedPostId ? (pendingReviewPosts.find((post) => post.id === selectedPostId) ?? null) : null;
 	const selectedReviewComment = selectedPostId ? (reviewComments[selectedPostId] ?? "") : "";

	const closeModal = (): void => {
		setModalMode(null);
		setSelectedPostId(null);
		setFormState(emptyPostForm);
		setFormErrors(emptyPostFormErrors);
	};

	const openCreateModal = (): void => {
		releaseActiveElementFocus();
		setFormState(emptyPostForm);
		setFormErrors(emptyPostFormErrors);
		setSelectedPostId(null);
		setModalMode("create");
	};

	const openEditModal = (post: PostRead): void => {
		releaseActiveElementFocus();
		setSelectedPostId(post.id);
		setFormState({
			mediaUrl: post.media_url ?? "",
			text: post.text,
			title: post.title,
		});
		setFormErrors(emptyPostFormErrors);
		setModalMode("edit");
	};

	const openReviewModal = (post: PostRead): void => {
		releaseActiveElementFocus();
		setSelectedPostId(post.id);
		setModalMode("review");
	};

	const validatePostForm = (): PostFormErrors => {
		const trimmedTitle = formState.title.trim();
		const trimmedText = formState.text.trim();
		const trimmedMediaUrl = formState.mediaUrl.trim();

		return {
			mediaUrl: trimmedMediaUrl.length > 0 && !isValidMediaUrl(trimmedMediaUrl) ? t("posts.invalidMediaUrl") : null,
			text: trimmedText.length === 0 ? t("posts.invalidText") : null,
			title: trimmedTitle.length < 2 ? t("posts.invalidTitle") : null,
		};
	};

	const hasFormErrors = (errors: PostFormErrors): boolean => Object.values(errors).some((value) => value !== null);

	const handleSavePost = async (): Promise<void> => {
		if (!username) {
			return;
		}

		const nextFormErrors = validatePostForm();
		setFormErrors(nextFormErrors);

		if (hasFormErrors(nextFormErrors)) {
			return;
		}

		const trimmedMediaUrl = formState.mediaUrl.trim();
		const payload = {
			text: formState.text.trim(),
			title: formState.title.trim(),
			...(trimmedMediaUrl.length > 0 ? { "media_url": trimmedMediaUrl } : {}),
		};

		if (modalMode === "create") {
			await createPost(payload);
			closeModal();
			return;
		}

		if (!selectedPostId) {
			return;
		}

		await updatePost(selectedPostId, payload);
		closeModal();
	};

	const handleDeletePost = async (): Promise<void> => {
		if (!selectedPostId) {
			return;
		}

		await deletePost(selectedPostId);
		closeModal();
	};

	const handleSubmitSelectedPostForReview = async (): Promise<void> => {
		if (!selectedAuthorPost) {
			return;
		}

		await submitForReview(selectedAuthorPost.id);
		closeModal();
	};

	const handleApprove = async (postId: number): Promise<void> => {
		const comment = reviewComments[postId]?.trim() ?? "";
		await approve(postId, { comment: comment.length > 0 ? comment : null });
		setReviewComments((current) => {
			const next = { ...current };
			delete next[postId];
			return next;
		});
		closeModal();
	};

	const handleReject = async (postId: number): Promise<void> => {
		const comment = reviewComments[postId]?.trim() ?? "";
		await reject(postId, { comment: comment.length > 0 ? comment : null });
		setReviewComments((current) => {
			const next = { ...current };
			delete next[postId];
			return next;
		});
		closeModal();
	};

	const authorColumns: Array<DataTableColumn<AuthorPostRow>> = [
		{ field: "title", headerName: t("posts.titleLabel"), pinned: "left" },
		{ field: "status", headerName: "Status", valueFormatter: (row) => t("posts.status", { value: row.status }) },
		{ field: "text", headerName: t("posts.textLabel") },
		{ field: "mediaUrl", headerName: t("posts.mediaUrlLabel"), valueFormatter: (row) => row.mediaUrl || "Not provided" },
	];
	const reviewColumns: Array<DataTableColumn<ReviewPostRow>> = [
		{ field: "title", headerName: t("posts.titleLabel"), pinned: "left" },
		{ field: "status", headerName: "Status", valueFormatter: (row) => t("posts.status", { value: row.status }) },
		{ field: "text", headerName: t("posts.textLabel") },
	];

	return (
		<CenteredPageLayout className="max-w-6xl gap-600">
			<div className="max-w-3xl">
				<GcdsHeading tag="h1">{t("posts.title")}</GcdsHeading>
				<GcdsText>{t("posts.summary")}</GcdsText>
			</div>

			{isSessionLoading || isLoading ? (
				<GcdsNotice noticeRole="info" noticeTitle={t("posts.loadingTitle")} noticeTitleTag="h2">
					<GcdsText>{t("posts.loadingBody")}</GcdsText>
				</GcdsNotice>
			) : null}

			{error && !isUnauthorizedRequestError(error) ? (
				<GcdsNotice noticeRole="danger" noticeTitle={t("posts.errorTitle")} noticeTitleTag="h2">
					<GcdsText>{t("posts.errorBody")}</GcdsText>
				</GcdsNotice>
			) : null}

			{hasFormErrors(formErrors) ? (
				<GcdsNotice noticeRole="warning" noticeTitle={t("posts.validationTitle")} noticeTitleTag="h2">
					<div className="flex flex-col gap-100">
						{formErrors.title ? <GcdsText>{formErrors.title}</GcdsText> : null}
						{formErrors.text ? <GcdsText>{formErrors.text}</GcdsText> : null}
						{formErrors.mediaUrl ? <GcdsText>{formErrors.mediaUrl}</GcdsText> : null}
					</div>
				</GcdsNotice>
			) : null}

			{canReviewPosts ? (
				<section className="grid gap-300 rounded-sm border border-[var(--gcds-border-default)] bg-[var(--gcds-bg-white)] px-400 py-400 shadow-[0_14px_28px_rgba(38,55,74,0.06)]">
					{isPendingReviewLoading ? (
						<GcdsText>{t("posts.pendingLoadingBody")}</GcdsText>
					) : null}

					<DataTable
						columns={reviewColumns}
						emptyMessage={t("posts.noPendingBody")}
						exportFileName="pending-review-posts.csv"
						getRowId={(row) => String(row.id)}
						itemLabel="posts"
						pagination={false}
						rows={reviewRows}
						searchLabel="Search review queue"
						searchPlaceholder="Filter by title, status, content, or comment"
						searchQuery={reviewSearch}
						summary={t("posts.reviewQueueBody")}
						title={t("posts.manageReviewQueue")}
						action={{
							buttonId: (row) => `manage-review-post-${row.id}`,
							buttonLabel: t("posts.manageAction"),
							onAction: (row) => {
								const post = pendingReviewPosts.find((entry) => entry.id === row.id);

								if (post) {
									openReviewModal(post);
								}
							},
							screenReaderLabel: (row) => row.title,
							variant: "link",
						}}
						onSearchChange={setReviewSearch}
					/>

					<Pagination currentPage={reviewPage} label={t("posts.reviewPagination")} totalPages={totalReviewPages} onPageChange={setReviewPage} />
				</section>
			) : null}

			<section className="grid gap-300 rounded-sm border border-[var(--gcds-border-default)] bg-[var(--gcds-bg-white)] px-400 py-400 shadow-[0_14px_28px_rgba(38,55,74,0.06)]">
				<DataTable
					columns={authorColumns}
					emptyMessage={t("posts.emptyBody")}
					exportFileName="my-posts.csv"
					getRowId={(row) => String(row.id)}
					itemLabel="posts"
					pagination={false}
					rows={authorRows}
					searchLabel="Search my posts"
					searchPlaceholder="Filter by title, status, content, or media URL"
					searchQuery={authorSearch}
					summary={t("posts.myPostsBody")}
					title={t("posts.myPostsTitle")}
					action={{
						buttonId: (row) => `manage-author-post-${row.id}`,
						buttonLabel: t("posts.manageAction"),
						isVisible: (row) => canEditPost(row.status) || canSubmitForReview(row.status),
						onAction: (row) => {
							const post = posts.find((entry) => entry.id === row.id);

							if (post) {
								openEditModal(post);
							}
						},
						screenReaderLabel: (row) => row.title,
						variant: "link",
					}}
					primaryAction={{
						buttonId: "create-post-action",
						buttonLabel: t("posts.createAction"),
						onAction: openCreateModal,
					}}
					onSearchChange={setAuthorSearch}
				/>

				<Pagination currentPage={authorPage} label={t("posts.authorPagination")} totalPages={totalAuthorPages} onPageChange={setAuthorPage} />
			</section>

			<Modal
				isOpen={isModalOpen}
				size="wide"
				title={modalMode === "create" ? t("posts.createTitle") : (modalMode === "review" ? t("posts.reviewTitle") : t("posts.editTitle"))}
				footer={(
					<>
						<Button buttonRole="secondary" type="button" onGcdsClick={closeModal}>
							{t("posts.cancelAction")}
						</Button>
						{modalMode === "review" ? (
							<>
								<Button buttonRole="danger" disabled={isRejecting} type="button" onGcdsClick={() => {
									if (selectedReviewPost) {
										void handleReject(selectedReviewPost.id);
									}
								}}>
									{t("posts.rejectAction")}
								</Button>
								<Button disabled={isApproving} type="button" onGcdsClick={() => {
									if (selectedReviewPost) {
										void handleApprove(selectedReviewPost.id);
									}
								}}>
									{t("posts.approveAction")}
								</Button>
							</>
						) : null}
						{modalMode === "edit" ? (
							<Button buttonRole="danger" disabled={isDeleting} type="button" onGcdsClick={() => {
								void handleDeletePost();
							}}>
								{t("posts.deleteAction")}
							</Button>
						) : null}
						{modalMode !== "review" ? (
							<>
								{modalMode === "edit" && selectedAuthorPost && canSubmitForReview(selectedAuthorPost.status) ? (
									<Button buttonRole="secondary" disabled={isSubmittingForReview} type="button" onGcdsClick={() => {
										void handleSubmitSelectedPostForReview();
									}}>
										{t("posts.submitAction")}
									</Button>
								) : null}
								<Button disabled={modalMode === "create" ? isCreating : isUpdating} type="button" onGcdsClick={() => {
									void handleSavePost();
								}}>
									{modalMode === "create"
										? (isCreating ? t("posts.creatingAction") : t("posts.createAction"))
										: (isUpdating ? t("posts.savingAction") : t("posts.saveAction"))}
								</Button>
							</>
						) : null}
					</>
				)}
				onClose={closeModal}
			>
				{modalMode === "review" && selectedReviewPost ? (
					<div className="grid gap-200">
						<GcdsText>{t("posts.status", { value: selectedReviewPost.status })}</GcdsText>
						<GcdsText>{selectedReviewPost.title}</GcdsText>
						<GcdsText>{selectedReviewPost.text}</GcdsText>
						<Textarea label={t("posts.commentLabel")} name="review-comment" textareaId="review-comment" value={selectedReviewComment} onInput={(event: ValueInputEvent): void => {
							if (!selectedPostId) {
								return;
							}

							setReviewComments((current) => ({
								...current,
								[selectedPostId]: getEventValue(event),
							}));
						}} />
					</div>
				) : (
					<div className="grid gap-200">
						<Input inputId="post-title" label={t("posts.titleLabel")} name="title" value={formState.title} onInput={(event: ValueInputEvent): void => {
							setFormState((current) => ({ ...current, title: getEventValue(event) }));
						}} />
						<Input inputId="post-media-url" label={t("posts.mediaUrlLabel")} name="media-url" value={formState.mediaUrl} onInput={(event: ValueInputEvent): void => {
							setFormState((current) => ({ ...current, mediaUrl: getEventValue(event) }));
						}} />
						<Textarea label={t("posts.textLabel")} name="text" textareaId="post-text" value={formState.text} onInput={(event: ValueInputEvent): void => {
							setFormState((current) => ({ ...current, text: getEventValue(event) }));
						}} />
					</div>
				)}
			</Modal>
		</CenteredPageLayout>
	);
};