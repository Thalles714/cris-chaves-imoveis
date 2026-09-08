// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import type { AppSupabaseClient } from "~/lib/supabase/index.server";
import { requireAdminTargetOperation } from "~/modules/auth/authorize.server";
import { SupabaseAdminPropertyRepository } from "~/modules/properties/admin/index.server";

const authenticatedUserId = "10000000-0000-4000-8000-000000000001";
const differentPropertyId = "20000000-0000-4000-8000-000000000002";
const request = new Request("https://example.test/admin/imoveis");

function ownerSession() {
	return {
		requireSession: vi.fn().mockResolvedValue({
			userId: authenticatedUserId,
			role: "owner" as const,
			authenticationLevel: "aal2" as const,
		}),
	};
}

describe("admin target and identifier boundary", () => {
	it.each(["../segredo", "1 OR 1=1", "", "not-a-uuid"])(
		"rejects an invalid property identifier before touching the data client (%s)",
		async (invalidId) => {
			const from = vi.fn();
			const repository = new SupabaseAdminPropertyRepository({
				from,
			} as unknown as AppSupabaseClient);

			await expect(repository.findById(invalidId)).rejects.toThrow();
			expect(from).not.toHaveBeenCalled();
		},
	);

	it("passes the verified server session to target authorization, not a client actor id", async () => {
		const sessions = ownerSession();
		const authorizeTarget = vi.fn().mockImplementation(async (session) => {
			return session.userId === authenticatedUserId;
		});

		await expect(
			requireAdminTargetOperation(request, "property.update", sessions, authorizeTarget),
		).resolves.toMatchObject({ userId: authenticatedUserId });
		expect(authorizeTarget).toHaveBeenCalledWith(
			expect.objectContaining({ userId: authenticatedUserId }),
		);
		expect(authorizeTarget).not.toHaveBeenCalledWith(
			expect.objectContaining({ userId: differentPropertyId }),
		);
	});

	it("does not evaluate a target callback when the role is already denied", async () => {
		const authorizeTarget = vi.fn().mockResolvedValue(true);
		const editorSessions = {
			requireSession: vi.fn().mockResolvedValue({
				userId: authenticatedUserId,
				role: "editor" as const,
				authenticationLevel: "aal2" as const,
			}),
		};

		await expect(
			requireAdminTargetOperation(
				request,
				"member.changeRole",
				editorSessions,
				authorizeTarget,
			),
		).rejects.toMatchObject({ code: "ADMIN_ACCESS_DENIED" });
		expect(authorizeTarget).not.toHaveBeenCalled();
	});

	it("fails closed when target lookup throws", async () => {
		await expect(
			requireAdminTargetOperation(
				request,
				"property.update",
				ownerSession(),
				vi.fn().mockRejectedValue(new Error("lookup unavailable")),
			),
		).rejects.toMatchObject({ code: "ADMIN_ACCESS_DENIED" });
	});
});
