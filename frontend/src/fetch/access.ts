import { requestJson } from "@/fetch";
import type { UserRead } from "./auth";

export type UserTierRead = UserRead & {
	tier_name: string;
	tier_created_at: string;
	tier_uuid: string;
};

export const getUserTier = async (
	userUuid: string,
): Promise<UserTierRead | null> =>
	requestJson<UserTierRead>(`/api/v1/user/${encodeURIComponent(userUuid)}/tier`, {
		method: "GET",
	});