import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { GcdsHeading, GcdsNotice, GcdsText } from "@gcds-core/components-react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { CenteredPageLayout } from "@/components/layout";
import { isUnauthorizedRequestError } from "@/features/auth/auth-api";
import { useSession, useUserTier } from "@/hooks";

export const AccessPage = (): FunctionComponent => {
	const { t } = useTranslation();
	const { currentUser } = useSession();
	const { error, isLoading, tier } = useUserTier(currentUser?.username);
	const navigate = useNavigate();
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});

	useEffect(() => {
		if (!isUnauthorizedRequestError(error)) {
			return;
		}

		void navigate({
			replace: true,
			search: { reason: "expired", redirect: pathname },
			to: "/login",
		});
	}, [error, navigate, pathname]);

	return (
		<CenteredPageLayout className="max-w-3xl">
			<GcdsHeading tag="h1">{t("access.title")}</GcdsHeading>
			<GcdsText>{t("access.summary")}</GcdsText>

			{isLoading ? (
				<GcdsNotice noticeRole="info" noticeTitle={t("access.loadingTitle")} noticeTitleTag="h2">
					<GcdsText>{t("access.loadingBody")}</GcdsText>
				</GcdsNotice>
			) : null}

			{error && !isUnauthorizedRequestError(error) ? (
				<GcdsNotice noticeRole="danger" noticeTitle={t("access.errorTitle")} noticeTitleTag="h2">
					<GcdsText>{t("access.errorBody")}</GcdsText>
				</GcdsNotice>
			) : null}

			{!isLoading && !error && !tier ? (
				<GcdsNotice noticeRole="warning" noticeTitle={t("access.emptyTitle")} noticeTitleTag="h2">
					<GcdsText>{t("access.emptyBody")}</GcdsText>
				</GcdsNotice>
			) : null}

			{tier ? (
				<GcdsNotice noticeRole="success" noticeTitle={t("access.cardTitle")} noticeTitleTag="h2">
					<div className="flex flex-col gap-200">
						<GcdsText>{t("access.username", { value: tier.username })}</GcdsText>
						<GcdsText>{t("access.tierName", { value: tier.tier_name })}</GcdsText>
						<GcdsText>{t("access.tierCreatedAt", { value: tier.tier_created_at })}</GcdsText>
					</div>
				</GcdsNotice>
			) : null}
		</CenteredPageLayout>
	);
};