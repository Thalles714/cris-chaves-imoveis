import type {
	AdminSession,
	AdminSessionReader,
} from "../admin/server/admin-session.server";

import { AdminAccessError } from "./auth-errors.server";
import {
	adminMemberSchema,
	assuranceLevelSchema,
	verifiedAuthUserSchema,
	type AssuranceLevel,
	type AdminMember,
	type VerifiedAuthUser,
} from "./schemas";

export interface SupabaseAdminAuthPort {
	auth: {
		getUser(): Promise<{
			data: { user: unknown };
			error: unknown;
		}>;
		mfa: {
			getAuthenticatorAssuranceLevel(): Promise<{
				data: {
					currentLevel: string | null;
					nextLevel: string | null;
					currentAuthenticationMethods?:
						string[] | Array<{ method: string; timestamp: number }>;
				} | null;
				error: unknown;
			}>;
		};
	};
}

/** The implementation must query `admin_members` under the request user's RLS. */
export interface AdminMemberReader {
	findActiveMember(userId: string): Promise<AdminMember | null>;
}

/**
 * Verifies the remote user on every request and resolves the role from the
 * database. User metadata, request fields and email addresses are ignored.
 */
export class SupabaseAdminSessionReader implements AdminSessionReader {
	constructor(
		private readonly authClient: SupabaseAdminAuthPort,
		private readonly members: AdminMemberReader,
	) {}

	async requireSession(request: Request): Promise<AdminSession> {
		void request;
		let verifiedUser: VerifiedAuthUser;
		try {
			const result = await this.authClient.auth.getUser();
			if (result.error || !result.data.user) {
				throw new AdminAccessError("AUTHENTICATION_REQUIRED");
			}
			const rawUser = result.data.user;
			verifiedUser = verifiedAuthUserSchema.parse({
				id:
					typeof rawUser === "object" && rawUser !== null && "id" in rawUser
						? rawUser.id
						: undefined,
			});
		} catch (error) {
			if (error instanceof AdminAccessError) throw error;
			throw new AdminAccessError("AUTHENTICATION_REQUIRED");
		}

		let member: AdminMember | null;
		let assurance: AssuranceLevel;
		try {
			const [memberResult, assuranceResult] = await Promise.all([
				this.members.findActiveMember(verifiedUser.id),
				this.authClient.auth.mfa.getAuthenticatorAssuranceLevel(),
			]);
			member = memberResult ? adminMemberSchema.parse(memberResult) : null;
			if (assuranceResult.error || !assuranceResult.data) {
				throw new Error("Assurance lookup failed");
			}
			assurance = assuranceLevelSchema.parse(assuranceResult.data);
		} catch {
			throw new AdminAccessError("ADMIN_ACCESS_DENIED");
		}

		if (!member || !member.active || member.userId !== verifiedUser.id) {
			throw new AdminAccessError("ADMIN_ACCESS_DENIED");
		}

		const secondFactorVerifiedAt = assurance.currentAuthenticationMethods.reduce<
			number | null
		>((latest, method) => {
			if (
				typeof method === "string" ||
				(method.method !== "totp" && method.method !== "otp")
			) {
				return latest;
			}
			return latest === null ? method.timestamp : Math.max(latest, method.timestamp);
		}, null);

		return {
			userId: verifiedUser.id,
			role: member.role,
			authenticationLevel: assurance.currentLevel,
			secondFactorVerifiedAt,
		};
	}
}
