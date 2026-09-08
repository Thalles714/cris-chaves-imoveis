import type {
	AdminPropertyDraftInput,
	AdminPropertyEditRecord,
	AdminPropertyListItem,
	AdminPropertyPage,
	AdminPropertyQuery,
	AdminPropertyPrivateInput,
	AdminPropertySummary,
	AdminPropertyTransition,
	AdminPropertyUpdateInput,
} from "./admin-property";

export interface AdminPropertyRepository {
	summary(): Promise<AdminPropertySummary>;
	list(query: AdminPropertyQuery): Promise<AdminPropertyPage>;
	findById(propertyId: string): Promise<AdminPropertyEditRecord | null>;
	createDraft(input: AdminPropertyDraftInput): Promise<AdminPropertyListItem>;
	update(
		propertyId: string,
		input: AdminPropertyUpdateInput,
	): Promise<AdminPropertyListItem>;
	updatePrivate(
		propertyId: string,
		input: AdminPropertyPrivateInput,
	): Promise<AdminPropertyEditRecord["privateDetails"]>;
	transition(input: AdminPropertyTransition): Promise<AdminPropertyListItem>;
}

export class AdminPropertyConflictError extends Error {
	constructor() {
		super("O imóvel foi alterado em outra sessão. Atualize a página antes de continuar.");
		this.name = "AdminPropertyConflictError";
	}
}
