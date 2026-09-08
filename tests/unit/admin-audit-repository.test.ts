// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import type { AppSupabaseClient } from "~/lib/supabase/index.server";
import { SupabaseAdminAuditRepository } from "~/modules/audit/index.server";

function auditListHarness(result: {
	data: unknown[] | null;
	count: number | null;
	error: unknown;
}) {
	const range = vi.fn().mockResolvedValue(result);
	const order = vi.fn();
	const ordered = { order, range };
	order.mockReturnValue(ordered);
	const select = vi.fn().mockReturnValue(ordered);
	const from = vi.fn().mockReturnValue({ select });
	const client = { from } as unknown as AppSupabaseClient;
	return {
		repository: new SupabaseAdminAuditRepository(client),
		spies: { from, order, range, select },
	};
}

describe("admin audit repository", () => {
	it("queries only the selected page in newest-first order", async () => {
		const setup = auditListHarness({ data: [], count: 83, error: null });

		await expect(setup.repository.list({ page: 3, pageSize: 25 })).resolves.toEqual({
			items: [],
			page: 3,
			pageSize: 25,
			totalItems: 83,
		});
		expect(setup.spies.from).toHaveBeenCalledWith("audit_events");
		expect(setup.spies.select).toHaveBeenCalledWith(
			"id,occurred_at,actor_id,actor_role,action,resource_type,resource_id,request_id,details",
			{ count: "exact" },
		);
		expect(setup.spies.order).toHaveBeenNthCalledWith(1, "occurred_at", {
			ascending: false,
		});
		expect(setup.spies.order).toHaveBeenNthCalledWith(2, "id", {
			ascending: false,
		});
		expect(setup.spies.range).toHaveBeenCalledWith(50, 74);
	});

	it("does not return partial data when Supabase reports an error", async () => {
		const setup = auditListHarness({
			data: [{ id: 1 }],
			count: 1,
			error: new Error("query failed"),
		});

		await expect(setup.repository.list({ page: 1, pageSize: 25 })).rejects.toThrow(
			"Não foi possível consultar a auditoria.",
		);
	});
});
