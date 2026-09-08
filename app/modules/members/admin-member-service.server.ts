import {
	adminMemberDisableInputSchema,
	adminMemberDtoSchema,
	adminMemberInviteInputSchema,
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

		const invited = await this.directory.invite(parsed.data.email);
		try {
			await this.members.create(invited.userId, parsed.data.role);
		} catch {
			await this.directory.deleteInvitedUser(invited.userId);
			throw new AdminMemberOperationError("MEMBERSHIP_UNAVAILABLE");
		}
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
