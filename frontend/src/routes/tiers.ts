import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { requireAuthenticatedUser } from "../features/auth/auth-routing";

const TiersPage = lazy(async () => ({ default: (await import("../features/tiers/pages/TiersPage")).TiersPage }));

export const Route = createFileRoute("/tiers")({
	beforeLoad: async () => requireAuthenticatedUser("/tiers"),
	component: TiersPage,
});
