import { requestJson } from "@/fetch";
import type { UserRead } from "./auth";

export type UserTierRead = UserRead & {
	tier_name: string;
	tier_created_at: string;
	tier_id: number;
};

export const getUserTier = async (
	username: string,
): Promise<UserTierRead | null> =>
	requestJson<UserTierRead>(`/api/v1/user/${encodeURIComponent(username)}/tier`, {
		method: "GET",
	});