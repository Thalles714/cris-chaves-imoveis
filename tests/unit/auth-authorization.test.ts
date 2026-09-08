import { describe, expect, it, vi } from "vitest";

import { AdminAccessError } from "~/modules/auth/auth-errors.server";
import { SupabaseAdminSessionReader } from "~/modules/auth/admin-session.server";
import {
	requireAdminOperation,
	requireAdminTargetOperation,
	hasRecentSecondFactor,
} from "~/modules/auth/authorize.server";
import {
	adminOperations,
	operationRequiresAal2,
	roleCan,
} from "~/modules/auth/permissions";

const userId = "10000000-0000-4000-8000-000000000001";
const request = new Request("https://example.test/admin");

function authPort(
	level: "aal1" | "aal2" = "aal2",
	authenticated = true,
	secondFactorTimestamp = 1_700_000_000,
) {
	return {
		auth: {
			getUser: vi.fn().mockResolvedValue({
				data: { user: authenticated ? { id: userId } : null },
				error: authenticated ? null : new Error("invalid"),
			}),
			mfa: {
				getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({
					data: {
						currentLevel: level,
						nextLevel: level,
						currentAuthenticationMethods: [
							{ method: "password", timestamp: secondFactorTimestamp - 1 },
							{ method: "totp", timestamp: secondFactorTimestamp },
						],
					},
					error: null,
				}),
			},
		},
	};
}

describe("admin authorization", () => {
	it("keeps the complete operation matrix explicit for editor and owner", () => {
		const editorOperations = [
			"admin.read",
			"property.create",
			"property.update",
			"property.publish",
			"property.archive",
			"property.restore",
			"property.reserve",
			"property.releaseReservation",
			"property.markSold",
			"property.softDelete",
			"media.create",
			"media.update",
			"media.softDelete",
		] as const;
		const ownerOnlyOperations = [
			"member.invite",
			"member.changeRole",
			"member.disable",
			"audit.read",
		] as const;

		expect(new Set(adminOperations)).toEqual(
			new Set([...editorOperations, ...ownerOnlyOperations]),
		);
		for (const operation of editorOperations) {
			expect(roleCan("editor", operation), operation).toBe(true);
			expect(roleCan("owner", operation), operation).toBe(true);
		}
		for (const operation of ownerOnlyOperations) {
			expect(roleCan("editor", operation), operation).toBe(false);
			expect(roleCan("owner", operation), operation).toBe(true);
		}
	});

	it("requires AAL2 for every administrative operation", () => {
		for (const operation of adminOperations) {
			expect(operationRequiresAal2(operation), operation).toBe(true);
		}
	});

	it("fails closed for an unauthenticated request", async () => {
		const reader = new SupabaseAdminSessionReader(authPort("aal1", false), {
			findActiveMember: vi.fn(),
		});
		await expect(reader.requireSession(request)).rejects.toMatchObject({
			code: "AUTHENTICATION_REQUIRED",
		});
	});

	it("ignores auth metadata and denies users without an active membership", async () => {
		const reader = new SupabaseAdminSessionReader(authPort(), {
			findActiveMember: vi.fn().mockResolvedValue(null),
		});
		await expect(reader.requireSession(request)).rejects.toMatchObject({
			code: "ADMIN_ACCESS_DENIED",
		});
	});

	it("records only a verified second-factor timestamp and enforces recency", async () => {
		const verifiedAt = 1_700_000_000;
		const reader = new SupabaseAdminSessionReader(authPort("aal2", true, verifiedAt), {
			findActiveMember: vi.fn().mockResolvedValue({
				userId,
				role: "owner",
				active: true,
			}),
		});
		const session = await reader.requireSession(request);

		expect(session.secondFactorVerifiedAt).toBe(verifiedAt);
		expect(hasRecentSecondFactor(session, (verifiedAt + 299) * 1000)).toBe(true);
		expect(hasRecentSecondFactor(session, (verifiedAt + 301) * 1000)).toBe(false);
	});

	it("requires aal2 even for administrative reads", async () => {
		const sessions = {
			requireSession: vi.fn().mockResolvedValue({
				userId,
				role: "editor" as const,
				authenticationLevel: "aal1" as const,
			}),
		};
		await expect(requireAdminOperation(request, "admin.read", sessions)).rejects.toEqual(
			new AdminAccessError("AAL2_REQUIRED"),
		);
	});

	it("allows an aal2 editor to edit properties but not manage members", async () => {
		const sessions = {
			requireSession: vi.fn().mockResolvedValue({
				userId,
				role: "editor" as const,
				authenticationLevel: "aal2" as const,
			}),
		};
		await expect(
			requireAdminOperation(request, "property.update", sessions),
		).resolves.toMatchObject({
			role: "editor",
		});
		await expect(
			requireAdminOperation(request, "member.changeRole", sessions),
		).rejects.toMatchObject({
			code: "ADMIN_ACCESS_DENIED",
		});
	});

	it("denies every direct operation from an AAL1 session", async () => {
		const sessions = {
			requireSession: vi.fn().mockResolvedValue({
				userId,
				role: "owner" as const,
				authenticationLevel: "aal1" as const,
			}),
		};

		for (const operation of adminOperations) {
			await expect(
				requireAdminOperation(request, operation, sessions),
				operation,
			).rejects.toMatchObject({ code: "AAL2_REQUIRED" });
		}
	});

	it("authorizes the target after role and AAL checks and fails closed", async () => {
		const sessions = {
			requireSession: vi.fn().mockResolvedValue({
				userId,
				role: "editor" as const,
				authenticationLevel: "aal2" as const,
			}),
		};
		const allowedTarget = vi.fn().mockResolvedValue(true);

		await expect(
			requireAdminTargetOperation(request, "property.update", sessions, allowedTarget),
		).resolves.toMatchObject({ userId, role: "editor" });
		expect(allowedTarget).toHaveBeenCalledOnce();

		await expect(
			requireAdminTargetOperation(
				request,
				"property.update",
				sessions,
				vi.fn().mockResolvedValue(false),
			),
		).rejects.toMatchObject({ code: "ADMIN_ACCESS_DENIED" });
		await expect(
			requireAdminTargetOperation(
				request,
				"property.update",
				sessions,
				vi.fn().mockRejectedValue(new Error("lookup failed")),
			),
		).rejects.toMatchObject({ code: "ADMIN_ACCESS_DENIED" });
	});
});
