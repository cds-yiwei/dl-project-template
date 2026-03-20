import { describe, expect, it } from "vitest";
import { Route } from "@/routes/login";

describe("login route", () => {
	it("does not gate the login page behind a beforeLoad auth redirect", () => {
		expect(Route.options.beforeLoad).toBeUndefined();
	});
});