import {
	UnauthorizedRequestError,
	buildApiUrl,
	type UserRead,
} from "../auth/auth-api";

export type UserTierRead = UserRead & {
	tier_name: string;
	tier_created_at: string;
	tier_id: number;
};

export const getUserTier = async (
	username: string,
): Promise<UserTierRead | null> => {
	const response = await fetch(
		buildApiUrl(`/api/v1/user/${encodeURIComponent(username)}/tier`),
		{
			credentials: "include",
			headers: {
				Accept: "application/json",
			},
			method: "GET",
		},
	);

	if (response.status === 401) {
		throw new UnauthorizedRequestError();
	}

	if (!response.ok) {
		throw new Error(`Unable to load user tier: ${response.status}`);
	}

	return (await response.json()) as UserTierRead | null;
};