import {
  GcdsLink,
  GcdsNotice,
} from "@gcds-core/components-react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button, Card, Grid, Heading, Text } from "@/components";
import { CenteredPageLayout } from "@/components/layout";
import { getBackendOrigin } from "@/features/auth/auth-api";
import { useSession } from "@/hooks";

export const Home = (): FunctionComponent => {
	const { t } = useTranslation();
	const { currentUser, isAuthenticated, isLoading, login, logout } = useSession();

	const onLogoutClick = (): void => {
		void logout();
	};

	return (
		<CenteredPageLayout className="max-w-6xl gap-600">
			<div className="max-w-3xl">
				<Heading tag="h1">{t("home.title")}</Heading>
				<Text>{t("home.summary")}</Text>
			</div>

			{isLoading ? (
				<GcdsNotice
					noticeRole="info"
					noticeTitle={t("home.loadingTitle")}
					noticeTitleTag="h2"
				>
					<Text>{t("home.loadingBody")}</Text>
				</GcdsNotice>
			) : null}

			<section className="border border-[var(--gcds-border-default)] bg-[var(--gcds-bg-white)] px-500 py-600 shadow-[0_18px_40px_rgba(38,55,74,0.08)]">
				<div className="grid gap-500 lg:grid-cols-[minmax(0,1fr)_1px_minmax(18rem,0.85fr)]">
					<div className="flex flex-col gap-300">
						<p className="text-sm font-semibold tracking-[0.08em] text-[var(--gcds-text-secondary)] uppercase">
							{t("home.panelEyebrow")}
						</p>
						<Heading tag="h2">{isAuthenticated ? t("home.signedInTitle") : t("home.panelTitle")}</Heading>
						<Text>
							{isAuthenticated && currentUser
								? t("home.signedInBody", { name: currentUser.name })
								: t("home.signedOutBody")}
						</Text>
						<Text>{t("home.backendOrigin", { origin: getBackendOrigin() })}</Text>

						{isAuthenticated && currentUser ? (
							<div className="flex flex-col gap-200">
								<Text>{t("home.signedInUsername", { username: currentUser.username })}</Text>
								<Text>{t("home.signedInEmail", { email: currentUser.email })}</Text>
							</div>
						) : null}

						<div className="flex flex-wrap items-center gap-250 pt-100">
							{!isAuthenticated ? (
								<Button buttonId="oidc-login" buttonRole="primary" type="button" onGcdsClick={login}>
									{t("home.signInAction")}
								</Button>
							) : (
								<Button buttonId="logout" buttonRole="secondary" type="button" onGcdsClick={onLogoutClick}>
									{t("home.signOutAction")}
								</Button>
							)}
							<GcdsLink href="/profile">{t("home.profilePageLink")}</GcdsLink>
						</div>
					</div>

					<div className="hidden bg-[var(--gcds-border-default)] lg:block" />

					<div className="flex flex-col gap-250">
						<Heading tag="h2">{t("home.quickLinksTitle")}</Heading>
						<Text>{t("home.quickLinksBody")}</Text>
						<nav className="flex flex-col gap-150">
							<GcdsLink href="/dashboard">{t("home.dashboardPageLink")}</GcdsLink>
							<GcdsLink href="/login">{t("home.loginPageLink")}</GcdsLink>
							<GcdsLink href="/posts">{t("home.postsPageLink")}</GcdsLink>
							<GcdsLink href="/access">{t("home.accessPageLink")}</GcdsLink>
							<GcdsLink href="/users">{t("home.usersPageLink")}</GcdsLink>
							<GcdsLink href="/policies">{t("home.policiesPageLink")}</GcdsLink>
							<GcdsLink href="/roles">{t("home.rolesPageLink")}</GcdsLink>
							<GcdsLink href="/tiers">{t("home.tiersPageLink")}</GcdsLink>
							<GcdsLink href="/health">{t("home.healthPageLink")}</GcdsLink>
							<GcdsLink href="/logout">{t("home.logoutPageLink")}</GcdsLink>
						</nav>
					</div>
				</div>
			</section>

			<section className="flex flex-col gap-350">
				<div className="max-w-2xl">
					<Heading tag="h2">{t("home.referenceSectionTitle")}</Heading>
					<Text>{t("home.referenceSectionBody")}</Text>
				</div>
				<Grid columnsDesktop="1fr 1fr 1fr" columnsTablet="1fr 1fr" tag="section">
					<Card
						badge="Sample"
						cardTitle={t("home.aboutCardTitle")}
						cardTitleTag="h3"
						description={t("home.aboutCardDescription")}
						href="/about"
					/>
					<Card
						badge="Sample"
						cardTitle={t("home.federalCardTitle")}
						cardTitleTag="h3"
						description={t("home.federalCardDescription")}
						href="/federal-and-provincial-holidays"
					/>
					<Card
						badge="Sample"
						cardTitle={t("home.optionalCardTitle")}
						cardTitleTag="h3"
						description={t("home.optionalCardDescription")}
						href="/optional-holidays"
					/>
				</Grid>
			</section>
		</CenteredPageLayout>
	);
};
