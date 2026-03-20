import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button, Heading, Notice, Text } from "@/components/ui";
import { CenteredPageLayout } from "@/components/layout";
import { useSession } from "@/hooks";
import { parseLoginMessage, parseLoginReason } from "../login-search";

const getLoginNoticeContent = (
	reason: ReturnType<typeof parseLoginReason>,
	message: ReturnType<typeof parseLoginMessage>,
): { bodyKey: string; titleKey: string } | null => {
	if (reason === "unauthorized" || message === "session-expired") {
		return {
			bodyKey: "login.unauthorizedBody",
			titleKey: "login.unauthorizedTitle",
		};
	}

	if (reason === "expired") {
		return {
			bodyKey: "login.expiredBody",
			titleKey: "login.expiredTitle",
		};
	}

	return null;
};

export const LoginPage = (): FunctionComponent => {
	const { t } = useTranslation();
	const { login } = useSession();
	const searchParameters = new URLSearchParams(window.location.search);
	const loginNotice = getLoginNoticeContent(
		parseLoginReason(searchParameters.get("reason")),
		parseLoginMessage(searchParameters.get("message")),
	);

	return (
		<CenteredPageLayout className="max-w-2xl">
			<Heading tag="h1">{t("login.title")}</Heading>
			<Text>{t("login.summary")}</Text>
			{loginNotice ? (
				<Notice noticeRole="warning" noticeTitle={t(loginNotice.titleKey as never)} noticeTitleTag="h2">
					<Text>{t(loginNotice.bodyKey as never)}</Text>
				</Notice>
			) : null}
			<div>
				<Button buttonId="login-action" buttonRole="primary" type="button" onGcdsClick={login}>
					{t("login.action")}
				</Button>
			</div>
		</CenteredPageLayout>
	);
};