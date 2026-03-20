import { redirect } from "@tanstack/react-router";
import type { UserRead } from "@/fetch/auth";
import { revalidateCurrentUser } from "./session-queries";
import { buildLoginLocation, sanitizeAppPath } from "./login-search";

const defaultPostLoginPath = "/dashboard";

export const getPostLoginPath = (): string =>
	sanitizeAppPath(import.meta.env.VITE_AUTH_POST_LOGIN_PATH, defaultPostLoginPath);

export { sanitizeAppPath } from "./login-search";

export const requireAuthenticatedUser = async (
	redirectTo: string,
): Promise<UserRead> => {
	let currentUser: UserRead | null;

	try {
		currentUser = await revalidateCurrentUser();
	} catch {
		currentUser = null;
	}

	if (!currentUser) {
		// TanStack Router uses thrown redirect objects to short-circuit route loading.
		// eslint-disable-next-line @typescript-eslint/only-throw-error
		throw redirect({
			replace: true,
			...buildLoginLocation({
				redirect: sanitizeAppPath(redirectTo, getPostLoginPath()),
			}),
		});
	}

	return currentUser;
};

export const redirectAuthenticatedUser = async (
	redirectTo?: string,
): Promise<void> => {
	const currentUser = await revalidateCurrentUser();

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
			...buildLoginLocation({ redirect: targetPath }),
		});
	}

	// eslint-disable-next-line @typescript-eslint/only-throw-error
	throw redirect({
		replace: true,
		to: targetPath,
	});
};