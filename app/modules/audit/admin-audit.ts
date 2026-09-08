import { z } from "zod";

export const adminAuditPageSize = 25;

export const adminAuditQuerySchema = z
	.object({
		page: z.number().int().min(1).max(10_000),
		pageSize: z.number().int().min(1).max(50),
	})
	.strict();

const safeDetailKeys = [
	"operation",
	"old_version",
	"new_version",
	"old_publication_status",
	"new_publication_status",
	"old_deal_status",
	"new_deal_status",
	"old_role",
	"new_role",
	"old_status",
	"new_status",
	"old_media_kind",
	"new_media_kind",
	"old_deleted",
	"new_deleted",
] as const;

const safeDetailValueSchema = z.union([
	z.string().max(80),
	z.number().finite(),
	z.boolean(),
	z.null(),
]);

const safeDetailsSchema = z.record(z.string(), safeDetailValueSchema);

export type AdminAuditQuery = z.infer<typeof adminAuditQuerySchema>;

export interface AdminAuditEvent {
	id: number;
	occurredAt: string;
	action: string;
	actorRole: "owner" | "editor" | null;
	actorReference: string | null;
	resourceType: string;
	resourceReference: string | null;
	requestReference: string | null;
	details: Readonly<Record<string, string | number | boolean | null>>;
}

export interface AdminAuditPage {
	items: AdminAuditEvent[];
	page: number;
	pageSize: number;
	totalItems: number;
}

export function parseAdminAuditQuery(url: URL): AdminAuditQuery {
	const rawPage = url.searchParams.get("page");
	const page = rawPage === null || rawPage === "" ? 1 : Number(rawPage);
	return adminAuditQuerySchema.parse({ page, pageSize: adminAuditPageSize });
}

/**
 * Browser DTOs never receive complete user, resource or request UUIDs. The
 * final eight hexadecimal characters are sufficient to correlate an event
 * during support without exposing the full internal identifier.
 */
export function redactAuditReference(value: string | null): string | null {
	if (!value) return null;
	const suffix = value.replaceAll("-", "").slice(-8);
	return suffix ? `…${suffix}` : null;
}

/**
 * Keep a second application-side allowlist even though the database constraint
 * already limits audit detail keys. This makes the browser DTO fail closed if
 * old or malformed rows exist.
 */
export function redactAuditDetails(
	value: unknown,
): Readonly<Record<string, string | number | boolean | null>> {
	const result = safeDetailsSchema.safeParse(value);
	if (!result.success) return {};
	const allowlist = new Set<string>(safeDetailKeys);
	return Object.fromEntries(
		Object.entries(result.data).filter(([key]) => allowlist.has(key)),
	);
}
