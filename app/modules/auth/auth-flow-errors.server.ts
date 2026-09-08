export type AdminAuthFlowErrorCode =
	| "INVALID_CREDENTIALS"
	| "AUTH_FLOW_UNAVAILABLE"
	| "RECOVERY_SESSION_REQUIRED"
	| "PASSWORD_UPDATE_FAILED"
	| "MFA_ENROLLMENT_REQUIRED"
	| "MFA_ALREADY_ENROLLED"
	| "MFA_ENROLLMENT_FAILED"
	| "MFA_VERIFICATION_FAILED";

const safeMessages: Record<AdminAuthFlowErrorCode, string> = {
	INVALID_CREDENTIALS: "E-mail ou senha inválidos.",
	AUTH_FLOW_UNAVAILABLE: "Não foi possível concluir a autenticação.",
	RECOVERY_SESSION_REQUIRED: "Solicite um novo link de recuperação.",
	PASSWORD_UPDATE_FAILED: "Não foi possível atualizar a senha.",
	MFA_ENROLLMENT_REQUIRED: "Configure o aplicativo autenticador para continuar.",
	MFA_ALREADY_ENROLLED: "Um autenticador já está configurado para esta conta.",
	MFA_ENROLLMENT_FAILED: "Não foi possível configurar o autenticador.",
	MFA_VERIFICATION_FAILED: "Código inválido ou expirado.",
};

export class AdminAuthFlowError extends Error {
	readonly code: AdminAuthFlowErrorCode;
	readonly status: 400 | 401 | 403 | 503;

	constructor(code: AdminAuthFlowErrorCode) {
		super(safeMessages[code]);
		this.name = "AdminAuthFlowError";
		this.code = code;
		this.status =
			code === "INVALID_CREDENTIALS" || code === "RECOVERY_SESSION_REQUIRED"
				? 401
				: code === "AUTH_FLOW_UNAVAILABLE"
					? 503
					: code === "MFA_ALREADY_ENROLLED"
						? 403
						: 400;
	}
}

export function isAdminAuthFlowError(value: unknown): value is AdminAuthFlowError {
	return value instanceof AdminAuthFlowError;
}
