import type { AdminAuditPage, AdminAuditQuery } from "./admin-audit";

export interface AdminAuditRepository {
	list(query: AdminAuditQuery): Promise<AdminAuditPage>;
}
