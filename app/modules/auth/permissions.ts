import type { AdminRole } from "./schemas";

export const adminOperations = [
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
	"member.invite",
	"member.changeRole",
	"member.disable",
	"audit.read",
] as const;

export type AdminOperation = (typeof adminOperations)[number];

const editorOperations = new Set<AdminOperation>([
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
]);

const ownerOperations = new Set<AdminOperation>(adminOperations);

export function roleCan(role: AdminRole, operation: AdminOperation): boolean {
	return (role === "owner" ? ownerOperations : editorOperations).has(operation);
}

export function operationRequiresAal2(operation: AdminOperation): boolean {
	void operation;
	return true;
}
