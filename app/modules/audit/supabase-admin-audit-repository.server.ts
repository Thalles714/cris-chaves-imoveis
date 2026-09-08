import type { Database } from "~/lib/supabase/database.types";
import type { AppSupabaseClient } from "~/lib/supabase/index.server";

import {
	adminAuditQuerySchema,
	redactAuditDetails,
	redactAuditReference,
	type AdminAuditEvent,
} from "./admin-audit";
import type { AdminAuditRepository } from "./admin-audit-repository.server";

const columns =
	"id,occurred_at,actor_id,actor_role,action,resource_type,resource_id,request_id,details";

type AuditRow = Pick<
	Database["public"]["Tables"]["audit_events"]["Row"],
	| "id"
	| "occurred_at"
	| "actor_id"
	| "actor_role"
	| "action"
	| "resource_type"
	| "resource_id"
	| "request_id"
	| "details"
>;

export function toAdminAuditEvent(row: AuditRow): AdminAuditEvent {
	return {
		id: row.id,
		occurredAt: row.occurred_at,
		action: row.action,
		actorRole: row.actor_role,
		actorReference: redactAuditReference(row.actor_id),
		resourceType: row.resource_type,
		resourceReference: redactAuditReference(row.resource_id),
		requestReference: redactAuditReference(row.request_id),
		details: redactAuditDetails(row.details),
	};
}

export class SupabaseAdminAuditRepository implements AdminAuditRepository {
	constructor(private readonly client: AppSupabaseClient) {}

	async list(rawQuery: Parameters<AdminAuditRepository["list"]>[0]) {
		const query = adminAuditQuerySchema.parse(rawQuery);
		const from = (query.page - 1) * query.pageSize;
		const to = from + query.pageSize - 1;
		const result = await this.client
			.from("audit_events")
			.select(columns, { count: "exact" })
			.order("occurred_at", { ascending: false })
			.order("id", { ascending: false })
			.range(from, to);

		if (result.error) {
			throw new Error("Não foi possível consultar a auditoria.");
		}

		return {
			items: (result.data ?? []).map((row) => toAdminAuditEvent(row)),
			page: query.page,
			pageSize: query.pageSize,
			totalItems: result.count ?? 0,
		};
	}
}
