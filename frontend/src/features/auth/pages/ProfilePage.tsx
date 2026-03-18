import { GcdsButton, GcdsHeading, GcdsNotice, GcdsText } from "@gcds-core/components-react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { CenteredPageLayout } from "@/components/layout";
import { useSession } from "@/hooks";

export const ProfilePage = (): FunctionComponent => {
	const { t } = useTranslation();
	const { currentUser, isAuthenticated, isLoading, login } = useSession();

	return (
		<CenteredPageLayout className="max-w-3xl">
			<GcdsHeading tag="h1">{t("profile.title")}</GcdsHeading>
			<GcdsText>{t("profile.summary")}</GcdsText>

			{isLoading ? (
				<GcdsNotice noticeRole="info" noticeTitle={t("profile.loadingTitle")} noticeTitleTag="h2">
					<GcdsText>{t("profile.loadingBody")}</GcdsText>
				</GcdsNotice>
			) : null}

			{!isLoading && !isAuthenticated ? (
				<GcdsNotice noticeRole="warning" noticeTitle={t("profile.signedOutTitle")} noticeTitleTag="h2">
					<div className="flex flex-col gap-300">
						<GcdsText>{t("profile.signedOutBody")}</GcdsText>
						<div>
							<GcdsButton buttonId="profile-login" buttonRole="primary" type="button" onClick={login}>
								{t("profile.action")}
							</GcdsButton>
						</div>
					</div>
				</GcdsNotice>
			) : null}

			{!isLoading && currentUser ? (
				<GcdsNotice noticeRole="success" noticeTitle={t("profile.cardTitle")} noticeTitleTag="h2">
					<div className="flex flex-col gap-200">
						<GcdsText>{t("profile.name", { value: currentUser.name })}</GcdsText>
						<GcdsText>{t("profile.username", { value: currentUser.username })}</GcdsText>
						<GcdsText>{t("profile.email", { value: currentUser.email })}</GcdsText>
					</div>
				</GcdsNotice>
			) : null}
		</CenteredPageLayout>
	);
};