import { GcdsButton, GcdsHeading, GcdsNotice, GcdsText } from "@gcds-core/components-react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { CenteredPageLayout } from "@/components/layout";
import { useSession } from "@/hooks";

export const LoginPage = (): FunctionComponent => {
	const { t } = useTranslation();
	const { login } = useSession();
	const loginReason = new URLSearchParams(window.location.search).get("reason");

	return (
		<CenteredPageLayout className="max-w-2xl">
			<GcdsHeading tag="h1">{t("login.title")}</GcdsHeading>
			<GcdsText>{t("login.summary")}</GcdsText>
			{loginReason === "expired" ? (
				<GcdsNotice noticeRole="warning" noticeTitle={t("login.expiredTitle")} noticeTitleTag="h2">
					<GcdsText>{t("login.expiredBody")}</GcdsText>
				</GcdsNotice>
			) : null}
			<div>
				<GcdsButton buttonId="login-action" buttonRole="primary" type="button" onClick={login}>
					{t("login.action")}
				</GcdsButton>
			</div>
		</CenteredPageLayout>
	);
};