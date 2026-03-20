import { createFileRoute } from "@tanstack/react-router";
import {
	parseLoginMessage,
	parseLoginReason,
	type LoginRedirectSearch,
} from "../features/auth/login-search";
import { LoginPage } from "../features/auth/pages/LoginPage";

const validateSearch = (search: Record<string, unknown>): LoginRedirectSearch => ({
	message: parseLoginMessage(search["message"]),
	reason: parseLoginReason(search["reason"]),
	redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
});

export const Route = createFileRoute("/login")({
	component: LoginPage,
	validateSearch,
});