import type { AppSupabaseClient } from "~/lib/supabase/index.server";

import {
	adminMemberRowSchema,
	type AdminMemberRole,
	type AdminMemberRow,
} from "./admin-member";
import { AdminMemberOperationError } from "./admin-member-errors.server";

export interface AdminMemberRepository {
	list(): Promise<AdminMemberRow[]>;
	create(userId: string, role: AdminMemberRole): Promise<void>;
	changeRole(input: {
		userId: string;
		role: AdminMemberRole;
		expectedVersion: number;
	}): Promise<void>;
	disable(input: { userId: string; expectedVersion: number }): Promise<void>;
}

function toAdminMemberRow(row: {
	user_id: string;
	role: AdminMemberRole;
	status: "invited" | "active" | "disabled";
	invited_at: string;
	activated_at: string | null;
	disabled_at: string | null;
	version: number;
}): AdminMemberRow {
	return adminMemberRowSchema.parse({
		userId: row.user_id,
		role: row.role,
		status: row.status,
		invitedAt: row.invited_at,
		activatedAt: row.activated_at,
		disabledAt: row.disabled_at,
		version: row.version,
	});
}

export class SupabaseAdminMemberRepository implements AdminMemberRepository {
	constructor(private readonly client: AppSupabaseClient) {}

	async list(): Promise<AdminMemberRow[]> {
		const result = await this.client
			.from("admin_members")
			.select("user_id,role,status,invited_at,activated_at,disabled_at,version")
			.is("deleted_at", null)
			.order("created_at", { ascending: true })
			.limit(51);
		if (result.error || !result.data || result.data.length > 50) {
			throw new AdminMemberOperationError("MEMBERSHIP_UNAVAILABLE");
		}
		return result.data.map(toAdminMemberRow);
	}

	async create(userId: string, role: AdminMemberRole): Promise<void> {
		const result = await this.client.from("admin_members").insert({
			user_id: userId,
			role,
			status: "invited",
			invited_at: new Date().toISOString(),
			activated_at: null,
			disabled_at: null,
			deleted_at: null,
		});
		if (result.error) {
			throw new AdminMemberOperationError("MEMBERSHIP_UNAVAILABLE");
		}
	}

	async changeRole(input: {
		userId: string;
		role: AdminMemberRole;
		expectedVersion: number;
	}): Promise<void> {
		const result = await this.client
			.from("admin_members")
			.update({ role: input.role })
			.eq("user_id", input.userId)
			.eq("version", input.expectedVersion)
			.eq("status", "active")
			.is("deleted_at", null)
			.select("user_id")
			.maybeSingle();
		if (result.error || !result.data) {
			throw new AdminMemberOperationError("CONFLICT");
		}
	}

	async disable(input: { userId: string; expectedVersion: number }): Promise<void> {
		const result = await this.client
			.from("admin_members")
			.update({ status: "disabled", disabled_at: new Date().toISOString() })
			.eq("user_id", input.userId)
			.eq("version", input.expectedVersion)
			.neq("status", "disabled")
			.is("deleted_at", null)
			.select("user_id")
			.maybeSingle();
		if (result.error || !result.data) {
			throw new AdminMemberOperationError("CONFLICT");
		}
	}
}
