import { GcdsHeading, GcdsNotice, GcdsText } from "@gcds-core/components-react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { CenteredPageLayout } from "@/components/layout";

export const AuthCompletePage = (): FunctionComponent => {
	const { t } = useTranslation();

	return (
		<CenteredPageLayout className="max-w-2xl">
			<GcdsHeading tag="h1">{t("authComplete.title")}</GcdsHeading>
			<GcdsNotice noticeRole="info" noticeTitle={t("authComplete.noticeTitle")} noticeTitleTag="h2">
				<GcdsText>{t("authComplete.summary")}</GcdsText>
			</GcdsNotice>
		</CenteredPageLayout>
	);
};