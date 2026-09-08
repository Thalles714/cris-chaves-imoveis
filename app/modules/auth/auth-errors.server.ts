export type AdminAccessErrorCode =
	"AUTHENTICATION_REQUIRED" | "ADMIN_ACCESS_DENIED" | "AAL2_REQUIRED";

const safeMessages: Record<AdminAccessErrorCode, string> = {
	AUTHENTICATION_REQUIRED: "Autenticação necessária.",
	ADMIN_ACCESS_DENIED: "Acesso não autorizado.",
	AAL2_REQUIRED: "Confirme o segundo fator para continuar.",
};

export class AdminAccessError extends Error {
	readonly code: AdminAccessErrorCode;
	readonly status: 401 | 403;

	constructor(code: AdminAccessErrorCode) {
		super(safeMessages[code]);
		this.name = "AdminAccessError";
		this.code = code;
		this.status = code === "AUTHENTICATION_REQUIRED" ? 401 : 403;
	}
}

export function isAdminAccessError(value: unknown): value is AdminAccessError {
	return value instanceof AdminAccessError;
}

export function adminPrivateResponseHeaders(): Headers {
	return new Headers({
		"Cache-Control": "private, no-store",
		"X-Robots-Tag": "noindex, nofollow",
	});
}
