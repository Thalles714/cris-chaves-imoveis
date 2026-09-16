import {
	adminMemberDisableInputSchema,
	adminMemberDtoSchema,
	adminMemberInviteInputSchema,
	adminMemberPendingActionInputSchema,
	adminMemberRoleChangeInputSchema,
	type AdminMemberDto,
} from "./admin-member";
import { AdminMemberOperationError } from "./admin-member-errors.server";
import type { AdminAuthDirectory } from "./privileged-auth-directory.server";
import type { AdminMemberRepository } from "./supabase-admin-member-repository.server";

export class AdminMemberService {
	private static readonly INVITATION_RESEND_COOLDOWN_MS = 30 * 60 * 1000;

	constructor(
		private readonly members: AdminMemberRepository,
		private readonly directory: AdminAuthDirectory,
	) {}

	async list(): Promise<AdminMemberDto[]> {
		const rows = await this.members.list();
		const emails = await this.directory.findEmails(rows.map((row) => row.userId));
		return rows.map((row) =>
			adminMemberDtoSchema.parse({ ...row, email: emails.get(row.userId) ?? null }),
		);
	}

	async invite(input: unknown): Promise<void> {
		const parsed = adminMemberInviteInputSchema.safeParse(input);
		if (!parsed.success) throw new AdminMemberOperationError("CONFLICT");

		await this.createInvitation(parsed.data.email, parsed.data.role);
	}

	async resendInvitation(input: unknown): Promise<void> {
		const parsed = adminMemberPendingActionInputSchema.safeParse(input);
		if (!parsed.success) throw new AdminMemberOperationError("CONFLICT");
		const existing = await this.members.findPending(
			parsed.data.userId,
			parsed.data.expectedVersion,
		);
		if (!existing) throw new AdminMemberOperationError("CONFLICT");
		const invitedAt = Date.parse(existing.invitedAt);
		if (
			Number.isFinite(invitedAt) &&
			Date.now() - invitedAt < AdminMemberService.INVITATION_RESEND_COOLDOWN_MS
		) {
			throw new AdminMemberOperationError("EMAIL_RATE_LIMITED");
		}
		const emails = await this.directory.findEmails([existing.userId]);
		const email = emails.get(existing.userId);
		if (!email) throw new AdminMemberOperationError("DIRECTORY_UNAVAILABLE");

		await this.members.deletePending(existing.userId, existing.version);
		try {
			await this.directory.deleteInvitedUserStrict(existing.userId);
		} catch {
			try {
				await this.members.create(existing.userId, existing.role);
			} catch {
				await this.recordRecoveryFailure(
					existing.userId,
					"directory_delete_and_membership_restore_failed",
				);
				throw new AdminMemberOperationError("INVITATION_RECOVERY_REQUIRED");
			}
			throw new AdminMemberOperationError("DIRECTORY_UNAVAILABLE");
		}

		let invited: { userId: string };
		try {
			invited = await this.directory.invite(email);
		} catch (error) {
			try {
				const pendingUser = await this.directory.findPendingUserByEmail(email);
				if (pendingUser) {
					await this.members.create(pendingUser.userId, existing.role);
					throw error;
				}
			} catch (recoveryError) {
				if (recoveryError === error) throw error;
			}
			await this.recordRecoveryFailure(
				existing.userId,
				"invite_failed_after_previous_removal",
			);
			throw new AdminMemberOperationError("INVITATION_RECOVERY_REQUIRED");
		}

		try {
			await this.members.create(invited.userId, existing.role);
		} catch {
			await this.directory.deleteInvitedUser(invited.userId);
			await this.recordRecoveryFailure(
				invited.userId,
				"membership_create_failed_after_invite",
			);
			throw new AdminMemberOperationError("INVITATION_RECOVERY_REQUIRED");
		}
	}

	async cancelInvitation(input: unknown): Promise<void> {
		await this.removePendingInvitation(input);
	}

	private async createInvitation(email: string, role: "owner" | "editor"): Promise<void> {
		const invited = await this.directory.invite(email);
		try {
			await this.members.create(invited.userId, role);
		} catch {
			await this.directory.deleteInvitedUser(invited.userId);
			throw new AdminMemberOperationError("MEMBERSHIP_UNAVAILABLE");
		}
	}

	private async recordRecoveryFailure(
		userId: string,
		reason: Parameters<AdminMemberRepository["recordInvitationRecoveryFailure"]>[1],
	): Promise<void> {
		try {
			await this.members.recordInvitationRecoveryFailure(userId, reason);
		} catch {
			// The recovery-required result remains fail-closed if audit persistence also fails.
		}
	}

	private async removePendingInvitation(input: unknown): Promise<{
		email: string;
		role: "owner" | "editor";
	}> {
		const parsed = adminMemberPendingActionInputSchema.safeParse(input);
		if (!parsed.success) throw new AdminMemberOperationError("CONFLICT");
		const pending = await this.members.findPending(
			parsed.data.userId,
			parsed.data.expectedVersion,
		);
		if (!pending) throw new AdminMemberOperationError("CONFLICT");
		const emails = await this.directory.findEmails([pending.userId]);
		const email = emails.get(pending.userId);
		if (!email) throw new AdminMemberOperationError("DIRECTORY_UNAVAILABLE");

		await this.members.deletePending(pending.userId, pending.version);
		try {
			await this.directory.deleteInvitedUserStrict(pending.userId);
		} catch {
			try {
				await this.members.create(pending.userId, pending.role);
			} catch {
				// The directory error remains the actionable failure.
			}
			throw new AdminMemberOperationError("DIRECTORY_UNAVAILABLE");
		}
		return { email, role: pending.role };
	}

	async changeRole(actorUserId: string, input: unknown): Promise<void> {
		const parsed = adminMemberRoleChangeInputSchema.safeParse(input);
		if (!parsed.success) throw new AdminMemberOperationError("CONFLICT");
		if (parsed.data.userId === actorUserId) {
			throw new AdminMemberOperationError("SELF_CHANGE_FORBIDDEN");
		}
		await this.members.changeRole(parsed.data);
	}

	async disable(actorUserId: string, input: unknown): Promise<void> {
		const parsed = adminMemberDisableInputSchema.safeParse(input);
		if (!parsed.success) throw new AdminMemberOperationError("CONFLICT");
		if (parsed.data.userId === actorUserId) {
			throw new AdminMemberOperationError("SELF_CHANGE_FORBIDDEN");
		}
		await this.members.disable(parsed.data);
	}
}
