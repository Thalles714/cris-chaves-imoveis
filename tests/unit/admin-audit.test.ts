import { describe, expect, it } from "vitest";

import {
	parseAdminAuditQuery,
	redactAuditDetails,
	redactAuditReference,
} from "../../app/modules/audit/admin-audit";
import { toAdminAuditEvent } from "../../app/modules/audit/supabase-admin-audit-repository.server";

describe("admin audit browser DTO", () => {
	it("redacts complete internal identifiers", () => {
		expect(redactAuditReference("10000000-0000-4000-8000-000000000001")).toBe(
			"…00000001",
		);
		expect(redactAuditReference(null)).toBeNull();
	});

	it("keeps only scalar detail keys explicitly allowed by the database contract", () => {
		expect(
			redactAuditDetails({
				operation: "update",
				old_version: 2,
				new_deleted: false,
				sensitive_value: "must not reach the browser",
			}),
		).toEqual({ operation: "update", old_version: 2, new_deleted: false });
	});

	it("fails closed for nested or malformed details", () => {
		expect(redactAuditDetails({ operation: { nested: "unsafe" } })).toEqual({});
		expect(redactAuditDetails(["update"])).toEqual({});
		expect(redactAuditDetails(null)).toEqual({});
	});

	it("maps a database row without exposing full actor, resource or request ids", () => {
		const event = toAdminAuditEvent({
			id: 7,
			occurred_at: "2026-09-03T12:00:00.000Z",
			actor_id: "10000000-0000-4000-8000-000000000001",
			actor_role: "owner",
			action: "properties.update",
			resource_type: "properties",
			resource_id: "20000000-0000-4000-8000-000000000002",
			request_id: "30000000-0000-4000-8000-000000000003",
			details: { operation: "update", old_version: 1, new_version: 2 },
		});

		expect(event).toMatchObject({
			actorReference: "…00000001",
			resourceReference: "…00000002",
			requestReference: "…00000003",
			details: { operation: "update", old_version: 1, new_version: 2 },
		});
		expect(JSON.stringify(event)).not.toContain("10000000-0000-4000-8000-000000000001");
	});
});

describe("admin audit pagination", () => {
	it("defaults to the first fixed-size page", () => {
		expect(parseAdminAuditQuery(new URL("https://example.test/admin/auditoria"))).toEqual(
			{
				page: 1,
				pageSize: 25,
			},
		);
	});

	it.each(["0", "-1", "1.5", "not-a-number", "10001"])(
		"rejects invalid page %s",
		(page) => {
			expect(() =>
				parseAdminAuditQuery(
					new URL(`https://example.test/admin/auditoria?page=${page}`),
				),
			).toThrow();
		},
	);
});
