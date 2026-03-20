import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button, Heading, Notice, Text } from "@/components/ui";
import { CenteredPageLayout } from "@/components/layout";
import { useSession } from "@/hooks";

export const ProfilePage = (): FunctionComponent => {
	const { t } = useTranslation();
	const { currentUser, isAuthenticated, isLoading, login } = useSession();

	return (
		<CenteredPageLayout className="max-w-3xl">
			<Heading tag="h1">{t("profile.title")}</Heading>
			<Text>{t("profile.summary")}</Text>

			{isLoading ? (
				<Notice noticeRole="info" noticeTitle={t("profile.loadingTitle")} noticeTitleTag="h2">
					<Text>{t("profile.loadingBody")}</Text>
				</Notice>
			) : null}

			{!isLoading && !isAuthenticated ? (
				<Notice noticeRole="warning" noticeTitle={t("profile.signedOutTitle")} noticeTitleTag="h2">
					<div className="flex flex-col gap-300">
						<Text>{t("profile.signedOutBody")}</Text>
						<div>
							<Button buttonId="profile-login" buttonRole="primary" type="button" onGcdsClick={login}>
								{t("profile.action")}
							</Button>
						</div>
					</div>
				</Notice>
			) : null}

			{!isLoading && currentUser ? (
				<Notice noticeRole="success" noticeTitle={t("profile.cardTitle")} noticeTitleTag="h2">
					<div className="flex flex-col gap-200">
						<Text>{t("profile.name", { value: currentUser.name })}</Text>
						<Text>{t("profile.username", { value: currentUser.username })}</Text>
						<Text>{t("profile.email", { value: currentUser.email })}</Text>
					</div>
				</Notice>
			) : null}
		</CenteredPageLayout>
	);
};