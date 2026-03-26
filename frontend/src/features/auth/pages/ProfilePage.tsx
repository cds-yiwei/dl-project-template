import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button, Heading, Notice, Text } from "@/components/ui";
import { CenteredPageLayout } from "@/components/layout";
import { useRoles, useSession } from "@/hooks";

export const ProfilePage = (): FunctionComponent => {
	const { t } = useTranslation();
	const { currentUser, isAuthenticated, isLoading, login } = useSession();
	const { roles } = useRoles(1, 100);

	const userRoles = currentUser?.roleUuids
		?.map((roleUuid) => roles.find((role) => role.uuid === roleUuid))
		.filter((role): role is NonNullable<typeof role> => role !== undefined) ?? [];

	return (
		<CenteredPageLayout className="max-w-5xl gap-600">
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
						{userRoles.length > 0 ? (
							<div className="flex flex-col gap-100">
								<Text>{t("profile.roles")}:</Text>
								{userRoles.map((role) => (
									<Text key={role.uuid}>{role.name}</Text>
								))}
							</div>
						) : null}
					</div>
				</Notice>
			) : null}
		</CenteredPageLayout>
	);
};