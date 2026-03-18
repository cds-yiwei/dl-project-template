import { redirect } from "@tanstack/react-router";
import { ensureCurrentUser, revalidateCurrentUser } from "./session-queries";
import type { UserRead } from "./auth-api";

export type LoginRedirectSearch = {
	reason?: "expired";
	redirect?: string;
};

const defaultPostLoginPath = "/dashboard";

export const sanitizeAppPath = (
	path: string | null | undefined,
	fallback = defaultPostLoginPath,
): string => {
	if (!path) {
		return fallback;
	}

	return path.startsWith("/") ? path : fallback;
};

export const getPostLoginPath = (): string =>
	sanitizeAppPath(import.meta.env.VITE_AUTH_POST_LOGIN_PATH, defaultPostLoginPath);

export const requireAuthenticatedUser = async (
	redirectTo: string,
): Promise<UserRead> => {
	const currentUser = await ensureCurrentUser();

	if (!currentUser) {
		// TanStack Router uses thrown redirect objects to short-circuit route loading.
		// eslint-disable-next-line @typescript-eslint/only-throw-error
		throw redirect({
			replace: true,
			search: { redirect: sanitizeAppPath(redirectTo, getPostLoginPath()) },
			to: "/login",
		});
	}

	return currentUser;
};

export const redirectAuthenticatedUser = async (
	redirectTo?: string,
): Promise<void> => {
	const currentUser = await ensureCurrentUser();

	if (currentUser) {
		// eslint-disable-next-line @typescript-eslint/only-throw-error
		throw redirect({
			replace: true,
			to: sanitizeAppPath(redirectTo, getPostLoginPath()),
		});
	}
};

export const completeLoginRedirect = async (
	redirectTo?: string,
): Promise<never> => {
	const currentUser = await revalidateCurrentUser();
	const targetPath = sanitizeAppPath(redirectTo, getPostLoginPath());

	if (!currentUser) {
		// eslint-disable-next-line @typescript-eslint/only-throw-error
		throw redirect({
			replace: true,
			search: { redirect: targetPath },
			to: "/login",
		});
	}

	// eslint-disable-next-line @typescript-eslint/only-throw-error
	throw redirect({
		replace: true,
		to: targetPath,
	});
};