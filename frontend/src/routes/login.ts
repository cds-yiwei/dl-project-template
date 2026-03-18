import { createFileRoute } from "@tanstack/react-router";
import {
	redirectAuthenticatedUser,
	type LoginRedirectSearch,
} from "../features/auth/auth-routing";
import { LoginPage } from "../features/auth/pages/LoginPage";

const validateSearch = (search: Record<string, unknown>): LoginRedirectSearch => ({
	reason: search["reason"] === "expired" ? "expired" : undefined,
	redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
});

export const Route = createFileRoute("/login")({
	beforeLoad: async ({ search }) => redirectAuthenticatedUser(search.redirect),
	component: LoginPage,
	validateSearch,
});