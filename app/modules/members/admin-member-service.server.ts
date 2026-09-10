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
		const pending = await this.removePendingInvitation(input);
		await this.createInvitation(pending.email, pending.role);
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
