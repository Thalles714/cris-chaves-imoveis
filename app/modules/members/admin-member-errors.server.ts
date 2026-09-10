export type AdminMemberOperationErrorCode =
	| "CONFIGURATION_UNAVAILABLE"
	| "DIRECTORY_UNAVAILABLE"
	| "EMAIL_RATE_LIMITED"
	| "MEMBERSHIP_UNAVAILABLE"
	| "SELF_CHANGE_FORBIDDEN"
	| "CONFLICT";

export class AdminMemberOperationError extends Error {
	readonly code: AdminMemberOperationErrorCode;

	constructor(code: AdminMemberOperationErrorCode) {
		super("The administrative member operation could not be completed.");
		this.name = "AdminMemberOperationError";
		this.code = code;
	}
}
