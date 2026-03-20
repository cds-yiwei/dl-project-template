import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Heading, Notice, Text } from "@/components/ui";
import { CenteredPageLayout } from "@/components/layout";
import {
	ForbiddenRequestError,
	getRequestErrorNotice,
} from "@/fetch";
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
	const isLoading = isSessionLoading || isRoleLoading || arePostsLoading;
	const combinedError = postsError ?? roleError;
	const errorNotice = getRequestErrorNotice(combinedError, {
		bodyKey: "dashboard.errorBody",
		titleKey: "dashboard.errorTitle",
	});
	const canReviewPosts = !(pendingReviewError instanceof ForbiddenRequestError);
	const draftCount = posts.filter((post) => post.status === "draft").length;
	const inReviewCount = posts.filter((post) => post.status === "in_review").length;
	const approvedCount = posts.filter((post) => post.status === "approved").length;
	const pendingApprovalCount = pendingReviewResponse?.total_count ?? 0;

	return (
		<CenteredPageLayout className="max-w-6xl gap-600">
			<div className="max-w-3xl">
				<Heading tag="h1">{t("dashboard.title")}</Heading>
				<Text>{t("dashboard.summary")}</Text>
			</div>

			{isLoading ? (
				<Notice noticeRole="info" noticeTitle={t("dashboard.loadingTitle")} noticeTitleTag="h2">
					<Text>{t("dashboard.loadingBody")}</Text>
				</Notice>
			) : null}

			{errorNotice ? (
				<Notice noticeRole={errorNotice.noticeRole} noticeTitle={t(errorNotice.titleKey as never)} noticeTitleTag="h2">
					<Text>{t(errorNotice.bodyKey as never)}</Text>
				</Notice>
			) : null}

			{currentUser ? (
				<section className="grid gap-300 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
					<div className={summaryCardClasses}>
						<p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gcds-text-secondary)]">
							{t("dashboard.profileEyebrow")}
						</p>
						<div className="mt-150 flex flex-col gap-150">
							<Text>{t("dashboard.username", { value: currentUser.username })}</Text>
							<Text>{t("dashboard.email", { value: currentUser.email })}</Text>
							<Text>{t("dashboard.role", { value: role?.name ?? t("dashboard.noRole") })}</Text>
						</div>
					</div>

					<div className="grid gap-200 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
						<div className={summaryCardClasses}>
							<p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gcds-text-secondary)]">
								{t("dashboard.draftLabel")}
							</p>
							<Text>{t("dashboard.draftPosts", { count: draftCount })}</Text>
						</div>
						<div className={summaryCardClasses}>
							<p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gcds-text-secondary)]">
								{t("dashboard.inReviewLabel")}
							</p>
							<Text>{t("dashboard.inReviewPosts", { count: inReviewCount })}</Text>
						</div>
						<div className={summaryCardClasses}>
							<p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gcds-text-secondary)]">
								{t("dashboard.approvedLabel")}
							</p>
							<Text>{t("dashboard.approvedPosts", { count: approvedCount })}</Text>
						</div>
					</div>
				</section>
			) : null}

			{canReviewPosts ? (
				<section className={summaryCardClasses}>
					<div className="flex flex-col gap-150 sm:flex-row sm:items-start sm:justify-between">
						<div>
							<Heading tag="h2">{t("dashboard.awaitingApproval")}</Heading>
							<Text>{t("dashboard.pendingReviewSummary", { count: pendingApprovalCount })}</Text>
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