import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { requireAuthenticatedUser } from "../features/auth/auth-routing";

const RolesPage = lazy(async () => ({ default: (await import("../features/roles/pages/RolesPage")).RolesPage }));

export const Route = createFileRoute("/roles")({
	beforeLoad: async () => requireAuthenticatedUser("/roles"),
	component: RolesPage,
});
