import { GcdsHeading, GcdsNotice, GcdsText } from "@gcds-core/components-react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { CenteredPageLayout } from "@/components/layout";
import { useSystemStatus } from "@/hooks";

export const HealthPage = (): FunctionComponent => {
	const { t } = useTranslation();
	const { health, ready, isLoading } = useSystemStatus();

	return (
		<CenteredPageLayout className="max-w-3xl">
			<GcdsHeading tag="h1">{t("health.title")}</GcdsHeading>
			<GcdsText>{t("health.summary")}</GcdsText>

			{isLoading ? (
				<GcdsNotice noticeRole="info" noticeTitle={t("health.loadingTitle")} noticeTitleTag="h2">
					<GcdsText>{t("health.loadingBody")}</GcdsText>
				</GcdsNotice>
			) : null}

			{health ? (
				<GcdsNotice noticeRole="info" noticeTitle={t("health.cardTitle")} noticeTitleTag="h2">
					<div className="flex flex-col gap-200">
						<GcdsText>{t("health.healthStatus", { status: health.status })}</GcdsText>
						<GcdsText>{t("health.environment", { value: health.environment })}</GcdsText>
						<GcdsText>{t("health.version", { value: health.version })}</GcdsText>
					</div>
				</GcdsNotice>
			) : null}

			{ready ? (
				<GcdsNotice noticeRole="success" noticeTitle={t("health.readyTitle")} noticeTitleTag="h2">
					<div className="flex flex-col gap-200">
						<GcdsText>{t("health.readyStatus", { status: ready.status })}</GcdsText>
						<GcdsText>{t("health.databaseStatus", { status: ready.database })}</GcdsText>
						<GcdsText>{t("health.redisStatus", { status: ready.redis })}</GcdsText>
					</div>
				</GcdsNotice>
			) : null}
		</CenteredPageLayout>
	);
};