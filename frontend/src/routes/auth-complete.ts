import { createFileRoute } from "@tanstack/react-router";
import {
	completeLoginRedirect,
	type LoginRedirectSearch,
} from "../features/auth/auth-routing";
import { AuthCompletePage } from "../features/auth/pages/AuthCompletePage";

const validateSearch = (search: Record<string, unknown>): LoginRedirectSearch => ({
	redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
});

export const Route = createFileRoute("/auth-complete")({
	beforeLoad: async ({ search }) => completeLoginRedirect(search.redirect),
	component: AuthCompletePage,
	validateSearch,
});