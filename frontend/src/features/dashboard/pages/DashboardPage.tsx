import { useNavigate, useRouterState } from "@tanstack/react-router";
import { GcdsHeading, GcdsNotice, GcdsText } from "@gcds-core/components-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { CenteredPageLayout } from "@/components/layout";
import {
	ForbiddenRequestError,
	isUnauthorizedRequestError,
} from "@/features/auth/auth-api";
import { usePendingReviewPosts, usePosts } from "@/features/posts/hooks";
import { useSession, useUserRole } from "@/hooks";

const summaryCardClasses = "rounded-sm border border-[var(--gcds-border-default)] bg-[var(--gcds-bg-white)] px-400 py-350 shadow-[0_14px_28px_rgba(38,55,74,0.06)]";

export const DashboardPage = (): FunctionComponent => {
	const { t } = useTranslation();
	const { currentUser, isLoading: isSessionLoading } = useSession();
	const username = currentUser?.username ?? null;
	const {
		error: roleError,
		isLoading: isRoleLoading,
		role,
	} = useUserRole(username);
	const {
		error: postsError,
		isLoading: arePostsLoading,
		posts,
	} = usePosts(username, 1, 500);
	const {
		error: pendingReviewError,
		isLoading: isPendingReviewLoading,
		response: pendingReviewResponse,
	} = usePendingReviewPosts(1, 10);
	const navigate = useNavigate();
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const isLoading = isSessionLoading || isRoleLoading || arePostsLoading;
	const combinedError = postsError ?? roleError;
	const canReviewPosts = !(pendingReviewError instanceof ForbiddenRequestError);
	const draftCount = posts.filter((post) => post.status === "draft").length;
	const inReviewCount = posts.filter((post) => post.status === "in_review").length;
	const approvedCount = posts.filter((post) => post.status === "approved").length;
	const pendingApprovalCount = pendingReviewResponse?.total_count ?? 0;

	useEffect(() => {
		if (
			!isUnauthorizedRequestError(combinedError)
			&& !isUnauthorizedRequestError(pendingReviewError)
		) {
			return;
		}

		void navigate({
			replace: true,
			search: { reason: "expired", redirect: pathname },
			to: "/login",
		});
	}, [combinedError, navigate, pathname, pendingReviewError]);

	return (
		<CenteredPageLayout className="max-w-6xl gap-600">
			<div className="max-w-3xl">
				<GcdsHeading tag="h1">{t("dashboard.title")}</GcdsHeading>
				<GcdsText>{t("dashboard.summary")}</GcdsText>
			</div>

			{isLoading ? (
				<GcdsNotice noticeRole="info" noticeTitle={t("dashboard.loadingTitle")} noticeTitleTag="h2">
					<GcdsText>{t("dashboard.loadingBody")}</GcdsText>
				</GcdsNotice>
			) : null}

			{combinedError && !isUnauthorizedRequestError(combinedError) ? (
				<GcdsNotice noticeRole="danger" noticeTitle={t("dashboard.errorTitle")} noticeTitleTag="h2">
					<GcdsText>{t("dashboard.errorBody")}</GcdsText>
				</GcdsNotice>
			) : null}

			{currentUser ? (
				<section className="grid gap-300 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
					<div className={summaryCardClasses}>
						<p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gcds-text-secondary)]">
							{t("dashboard.profileEyebrow")}
						</p>
						<div className="mt-150 flex flex-col gap-150">
							<GcdsText>{t("dashboard.username", { value: currentUser.username })}</GcdsText>
							<GcdsText>{t("dashboard.email", { value: currentUser.email })}</GcdsText>
							<GcdsText>{t("dashboard.role", { value: role?.name ?? t("dashboard.noRole") })}</GcdsText>
						</div>
					</div>

					<div className="grid gap-200 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
						<div className={summaryCardClasses}>
							<p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gcds-text-secondary)]">
								{t("dashboard.draftLabel")}
							</p>
							<GcdsText>{t("dashboard.draftPosts", { count: draftCount })}</GcdsText>
						</div>
						<div className={summaryCardClasses}>
							<p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gcds-text-secondary)]">
								{t("dashboard.inReviewLabel")}
							</p>
							<GcdsText>{t("dashboard.inReviewPosts", { count: inReviewCount })}</GcdsText>
						</div>
						<div className={summaryCardClasses}>
							<p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gcds-text-secondary)]">
								{t("dashboard.approvedLabel")}
							</p>
							<GcdsText>{t("dashboard.approvedPosts", { count: approvedCount })}</GcdsText>
						</div>
					</div>
				</section>
			) : null}

			{canReviewPosts ? (
				<section className={summaryCardClasses}>
					<div className="flex flex-col gap-150 sm:flex-row sm:items-start sm:justify-between">
						<div>
							<GcdsHeading tag="h2">{t("dashboard.awaitingApproval")}</GcdsHeading>
							<GcdsText>{t("dashboard.pendingReviewSummary", { count: pendingApprovalCount })}</GcdsText>
						</div>
						{isPendingReviewLoading ? (
							<p className="text-sm text-[var(--gcds-text-secondary)]">{t("dashboard.pendingLoadingBody")}</p>
						) : null}
					</div>
				</section>
			) : null}
		</CenteredPageLayout>
	);
};