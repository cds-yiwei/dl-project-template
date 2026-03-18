import { describe, expect, it } from "vitest";
import {
	useRoleManagement,
	useRoles,
	useSession,
	useSystemStatus,
	useUserManagement,
	useUserRole,
	useUsers,
} from "@/hooks";

describe("hooks index", () => {
	it("re-exports the feature hooks from src/hooks", () => {
		expect(useRoleManagement).toBeTypeOf("function");
		expect(useRoles).toBeTypeOf("function");
		expect(useSession).toBeTypeOf("function");
		expect(useUsers).toBeTypeOf("function");
		expect(useSystemStatus).toBeTypeOf("function");
		expect(useUserManagement).toBeTypeOf("function");
		expect(useUserRole).toBeTypeOf("function");
	});
});