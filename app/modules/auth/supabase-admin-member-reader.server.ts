import type { AppSupabaseClient } from "~/lib/supabase/index.server";

import type { AdminMemberReader } from "./admin-session.server";
import { adminMemberSchema } from "./schemas";

export class SupabaseAdminMemberReader implements AdminMemberReader {
	constructor(private readonly client: AppSupabaseClient) {}

	async findActiveMember(userId: string) {
		const result = await this.client
			.from("admin_members")
			.select("user_id,role,status,deleted_at")
			.eq("user_id", userId)
			.eq("status", "active")
			.is("deleted_at", null)
			.maybeSingle();

		if (result.error || !result.data) return null;
		return adminMemberSchema.parse({
			userId: result.data.user_id,
			role: result.data.role,
			active: result.data.status === "active" && result.data.deleted_at === null,
		});
	}
}
