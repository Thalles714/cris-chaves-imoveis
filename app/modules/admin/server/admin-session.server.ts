export type AdminRole = "owner" | "editor";

export interface AdminSession {
	userId: string;
	role: AdminRole;
	authenticationLevel: "aal1" | "aal2";
	secondFactorVerifiedAt: number | null;
}

/** The authentication stage will implement this server-only contract. */
export interface AdminSessionReader {
	requireSession(request: Request): Promise<AdminSession>;
}
