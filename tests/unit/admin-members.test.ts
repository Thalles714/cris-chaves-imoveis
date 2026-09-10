// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import {
	adminMemberActionIntentSchema,
	adminMemberDisableInputSchema,
	adminMemberInviteInputSchema,
	adminMemberPendingActionInputSchema,
	adminMemberRowSchema,
	AdminMemberOperationError,
	AdminMemberService,
	type AdminAuthDirectory,
	type AdminMemberRepository,
} from "~/modules/members/index.server";

const ownerId = "10000000-0000-4000-8000-000000000001";
const editorId = "20000000-0000-4000-8000-000000000002";
const syntheticEmail = ["person", "example.invalid"].join("@");

function repository(): AdminMemberRepository {
	return {
		list: vi.fn(async () => []),
		findPending: vi.fn(async () => ({
			userId: editorId,
			role: "owner" as const,
			status: "invited" as const,
			invitedAt: "2026-09-07T22:10:00+00:00",
			activatedAt: null,
			disabledAt: null,
			version: 2,
		})),
		create: vi.fn(async () => undefined),
		deletePending: vi.fn(async () => undefined),
		changeRole: vi.fn(async () => undefined),
		disable: vi.fn(async () => undefined),
	};
}

function directory(): AdminAuthDirectory {
	return {
		invite: vi.fn(async () => ({ userId: editorId })),
		findEmails: vi.fn(async () => new Map()),
		deleteInvitedUser: vi.fn(async () => undefined),
		deleteInvitedUserStrict: vi.fn(async () => undefined),
	};
}

describe("admin member management", () => {
	it("accepts PostgreSQL timestamps with an explicit UTC offset", () => {
		expect(
			adminMemberRowSchema.safeParse({
				userId: ownerId,
				role: "owner",
				status: "active",
				invitedAt: "2026-09-07T22:10:00+00:00",
				activatedAt: "2026-09-07T22:15:00+00:00",
				disabledAt: null,
				version: 1,
			}).success,
		).toBe(true);
	});

	it("normalizes invite email and accepts only explicit roles", () => {
		expect(
			adminMemberInviteInputSchema.parse({
				email: ` ${syntheticEmail.toUpperCase()} `,
				role: "editor",
			}),
		).toEqual({ email: syntheticEmail, role: "editor" });
		expect(
			adminMemberInviteInputSchema.safeParse({
				email: syntheticEmail,
				role: "administrator",
			}).success,
		).toBe(false);
	});

	it("requires an explicit confirmation for disabling a member", () => {
		expect(
			adminMemberDisableInputSchema.safeParse({
				userId: editorId,
				expectedVersion: 2,
			}).success,
		).toBe(false);
	});

	it("accepts explicit actions for resending and cancelling pending invitations", () => {
		expect(adminMemberActionIntentSchema.safeParse("resend-invite").success).toBe(true);
		expect(adminMemberActionIntentSchema.safeParse("cancel-invite").success).toBe(true);
		expect(
			adminMemberPendingActionInputSchema.safeParse({
				userId: editorId,
				expectedVersion: 2,
				confirmation: "confirmed",
			}).success,
		).toBe(true);
	});

	it("replaces an expired pending invitation without trusting a submitted email or role", async () => {
		const members = repository();
		const authDirectory = directory();
		authDirectory.findEmails = vi.fn(async () => new Map([[editorId, syntheticEmail]]));
		authDirectory.invite = vi.fn(async () => ({ userId: ownerId }));
		const service = new AdminMemberService(members, authDirectory);

		await service.resendInvitation({
			userId: editorId,
			expectedVersion: 2,
			confirmation: "confirmed",
		});

		expect(members.findPending).toHaveBeenCalledWith(editorId, 2);
		expect(members.deletePending).toHaveBeenCalledWith(editorId, 2);
		expect(authDirectory.deleteInvitedUserStrict).toHaveBeenCalledWith(editorId);
		expect(authDirectory.invite).toHaveBeenCalledWith(syntheticEmail);
		expect(members.create).toHaveBeenCalledWith(ownerId, "owner");
	});

	it("cancels a pending invitation in membership and Auth", async () => {
		const members = repository();
		const authDirectory = directory();
		authDirectory.findEmails = vi.fn(async () => new Map([[editorId, syntheticEmail]]));
		const service = new AdminMemberService(members, authDirectory);

		await service.cancelInvitation({
			userId: editorId,
			expectedVersion: 2,
			confirmation: "confirmed",
		});

		expect(members.deletePending).toHaveBeenCalledWith(editorId, 2);
		expect(authDirectory.deleteInvitedUserStrict).toHaveBeenCalledWith(editorId);
		expect(authDirectory.invite).not.toHaveBeenCalled();
	});

	it("restores the pending membership when Auth refuses deletion", async () => {
		const members = repository();
		const authDirectory = directory();
		authDirectory.findEmails = vi.fn(async () => new Map([[editorId, syntheticEmail]]));
		authDirectory.deleteInvitedUserStrict = vi.fn(async () => {
			throw new Error("directory unavailable");
		});
		const service = new AdminMemberService(members, authDirectory);

		await expect(
			service.cancelInvitation({
				userId: editorId,
				expectedVersion: 2,
				confirmation: "confirmed",
			}),
		).rejects.toMatchObject({ code: "DIRECTORY_UNAVAILABLE" });
		expect(members.create).toHaveBeenCalledWith(editorId, "owner");
	});

	it("creates membership only after the directory invite succeeds", async () => {
		const members = repository();
		const authDirectory = directory();
		const service = new AdminMemberService(members, authDirectory);

		await service.invite({ email: syntheticEmail, role: "editor" });

		expect(authDirectory.invite).toHaveBeenCalledWith(syntheticEmail);
		expect(members.create).toHaveBeenCalledWith(editorId, "editor");
	});

	it("compensates an orphaned auth invite when membership creation fails", async () => {
		const members = repository();
		members.create = vi.fn(async () => {
			throw new Error("database unavailable");
		});
		const authDirectory = directory();
		const service = new AdminMemberService(members, authDirectory);

		await expect(
			service.invite({ email: syntheticEmail, role: "editor" }),
		).rejects.toMatchObject({ code: "MEMBERSHIP_UNAVAILABLE" });
		expect(authDirectory.deleteInvitedUser).toHaveBeenCalledWith(editorId);
	});

	it("blocks ordinary self role changes and self-disable before repository access", async () => {
		const members = repository();
		const service = new AdminMemberService(members, directory());

		await expect(
			service.changeRole(ownerId, {
				userId: ownerId,
				role: "editor",
				expectedVersion: 1,
			}),
		).rejects.toEqual(new AdminMemberOperationError("SELF_CHANGE_FORBIDDEN"));
		await expect(
			service.disable(ownerId, {
				userId: ownerId,
				expectedVersion: 1,
				confirmation: "confirmed",
			}),
		).rejects.toMatchObject({ code: "SELF_CHANGE_FORBIDDEN" });
		expect(members.changeRole).not.toHaveBeenCalled();
		expect(members.disable).not.toHaveBeenCalled();
	});
});
