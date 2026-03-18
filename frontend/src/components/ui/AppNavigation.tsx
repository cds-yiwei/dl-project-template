import { useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { useSession } from "@/hooks";

type NavigationItem = {
	href: string;
	label: string;
};

const isCurrentPath = (pathname: string, href: string): boolean => {
	if (href === "/") {
		return pathname === "/";
	}

	return pathname === href || pathname.startsWith(`${href}/`);
};

const AppNavigation = (): FunctionComponent => {
	const { t } = useTranslation();
	const { isAuthenticated, isLoading } = useSession();
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});

	const commonItems: Array<NavigationItem> = [
		{ href: "/", label: t("nav.home") },
		{ href: "/health", label: t("nav.health") },
	];

	const authItems: Array<NavigationItem> = [
		{ href: "/dashboard", label: t("nav.dashboard") },
		{ href: "/profile", label: t("nav.profile") },
		{ href: "/posts", label: t("nav.posts") },
		{ href: "/access", label: t("nav.access") },
		{ href: "/users", label: t("nav.users") },
		{ href: "/policies", label: t("nav.policies") },
		{ href: "/roles", label: t("nav.roles") },
		{ href: "/tiers", label: t("nav.tiers") },
		{ href: "/logout", label: t("nav.logout") },
	];

	const publicItems: Array<NavigationItem> = [
		{ href: "/login", label: t("nav.login") },
	];

	const items = [
		...commonItems,
		...(isLoading ? [] : isAuthenticated ? authItems : publicItems),
	];

	return (
		<nav aria-label={t("nav.label")} className="border-t border-[var(--gcds-border-default)] bg-[var(--gcds-bg-white)]">
			<div className="mx-auto w-full max-w-[72rem] px-400 md:px-600">
				<ul className="flex flex-wrap gap-x-400 gap-y-150 py-250 text-sm">
					{items.map((item) => {
						const current = isCurrentPath(pathname, item.href);

						return (
							<li key={item.href}>
								<a
									aria-current={current ? "page" : undefined}
									href={item.href}
									className={[
										"underline-offset-[0.16em]",
										current ? "font-semibold text-[var(--gcds-text-primary)] no-underline" : "text-[var(--gcds-text-primary)] hover:text-[var(--gcds-text-secondary)]",
									].join(" ")}
								>
									{item.label}
								</a>
							</li>
						);
					})}
				</ul>
			</div>
		</nav>
	);
};

export default AppNavigation;