import { z } from "zod";

import type { AdminSessionReader } from "../admin/server/admin-session.server";

import { AdminAccessError } from "./auth-errors.server";
import { AdminAuthFlowError } from "./auth-flow-errors.server";

const credentialsSchema = z
	.object({
		email: z
			.string()
			.trim()
			.max(254)
			.pipe(z.email())
			.transform((value) => value.toLowerCase()),
		password: z.string().min(1).max(1024),
	})
	.strict();

const recoverySchema = z
	.object({
		email: z
			.string()
			.trim()
			.max(254)
			.pipe(z.email())
			.transform((value) => value.toLowerCase()),
	})
	.strict();

const passwordResetSchema = z
	.object({
		password: z.string().min(12).max(128),
		passwordConfirmation: z.string().min(12).max(128),
	})
	.strict()
	.refine(({ password, passwordConfirmation }) => password === passwordConfirmation, {
		path: ["passwordConfirmation"],
	});

const pkceCallbackSchema = z
	.object({
		code: z
			.string()
			.trim()
			.min(8)
			.max(4096)
			.regex(/^[A-Za-z0-9._~-]+$/),
	})
	.strict();

const totpCodeSchema = z.object({ code: z.string().regex(/^\d{6}$/) }).strict();

const totpEnrollmentVerificationSchema = totpCodeSchema.extend({
	factorId: z.uuid(),
});

const totpEnrollmentSchema = z
	.object({
		id: z.uuid(),
		type: z.literal("totp"),
		totp: z
			.object({
				qr_code: z
					.string()
					.min(1)
					.max(512_000)
					.regex(/^data:image\/svg\+xml(?:;[^,]*)?,/i),
				secret: z
					.string()
					.min(16)
					.max(256)
					.regex(/^[A-Z2-7]+=*$/i),
				uri: z.string().startsWith("otpauth://totp/").max(4096),
			})
			.passthrough(),
	})
	.passthrough();

const factorSchema = z
	.object({
		id: z.uuid(),
		factor_type: z.literal("totp"),
		status: z.literal("verified"),
	})
	.passthrough();

const listedFactorSchema = z
	.object({
		id: z.uuid(),
		factor_type: z.enum(["totp", "phone", "webauthn"]),
		status: z.enum(["unverified", "verified"]),
	})
	.passthrough();

type AuthResult<Data> = Promise<{ data: Data | null; error: unknown }>;
type AuthErrorResult = Promise<{ error: unknown }>;
type PasswordRecoveryFailureSource = "provider_response" | "request_exception";

const observableAuthErrorCodeSchema = z.string().regex(/^[a-z0-9_]{1,64}$/);

function reportPasswordRecoveryFailure(
	source: PasswordRecoveryFailureSource,
	error: unknown,
): void {
	const details: {
		source: PasswordRecoveryFailureSource;
		code: string;
		status?: number;
	} = { source, code: "unknown" };

	if (typeof error === "object" && error !== null) {
		const candidate = error as { code?: unknown; status?: unknown };
		const code = observableAuthErrorCodeSchema.safeParse(candidate.code);
		if (code.success) details.code = code.data;
		if (
			typeof candidate.status === "number" &&
			Number.isInteger(candidate.status) &&
			candidate.status >= 400 &&
			candidate.status <= 599
		) {
			details.status = candidate.status;
		}
	}

	try {
		console.error("[admin-auth] Password recovery request failed.", details);
	} catch {
		// Observability must never alter the anti-enumeration response contract.
	}
}

export interface AdminAuthFlowPort {
	auth: {
		signInWithPassword(credentials: {
			email: string;
			password: string;
		}): AuthResult<{ user: unknown; session: unknown }>;
		signOut(options?: { scope?: "global" | "local" | "others" }): AuthErrorResult;
		resetPasswordForEmail(
			email: string,
			options: { redirectTo: string },
		): AuthResult<Record<string, never>>;
		exchangeCodeForSession(code: string): AuthResult<{
			session: unknown;
			user: unknown;
		}>;
		updateUser(attributes: { password: string }): AuthResult<{ user: unknown }>;
		mfa: {
			unenroll(options: { factorId: string }): AuthErrorResult;
			enroll(options: { factorType: "totp"; friendlyName: string }): AuthResult<unknown>;
			challengeAndVerify(options: {
				factorId: string;
				code: string;
			}): AuthResult<unknown>;
			listFactors(): AuthResult<{
				totp: unknown[];
				all?: unknown[];
			}>;
			getAuthenticatorAssuranceLevel(): AuthResult<{
				currentLevel: string | null;
				nextLevel: string | null;
			}>;
		};
	};
}

export type AdminLoginResult = { next: "mfa" | "admin" };
export type AdminMfaState = "enrollment_required" | "challenge_required" | "ready";

export interface TotpEnrollment {
	factorId: string;
	qrCode: string;
	secret: string;
	uri: string;
}

/**
 * Request-scoped authentication use cases. The client must be a Supabase SSR
 * client so token refreshes and MFA upgrades are persisted through Set-Cookie.
 */
export class SupabaseAdminAuthFlow {
	constructor(
		private readonly request: Request,
		private readonly authClient: AdminAuthFlowPort,
		private readonly sessions: AdminSessionReader,
		private readonly recoveryRedirectUrl: string,
	) {}

	async signInPassword(input: unknown): Promise<AdminLoginResult> {
		const parsed = credentialsSchema.safeParse(input);
		if (!parsed.success) throw new AdminAuthFlowError("INVALID_CREDENTIALS");

		try {
			const result = await this.authClient.auth.signInWithPassword(parsed.data);
			if (result.error || !result.data?.user || !result.data.session) {
				throw new AdminAuthFlowError("INVALID_CREDENTIALS");
			}

			const session = await this.sessions.requireSession(this.request);
			return { next: session.authenticationLevel === "aal2" ? "admin" : "mfa" };
		} catch (error) {
			if (error instanceof AdminAuthFlowError) throw error;
			if (error instanceof AdminAccessError) {
				await this.clearLocalSession();
				throw new AdminAuthFlowError("INVALID_CREDENTIALS");
			}
			throw new AdminAuthFlowError("AUTH_FLOW_UNAVAILABLE");
		}
	}

	async signOut(): Promise<void> {
		try {
			const result = await this.authClient.auth.signOut({ scope: "local" });
			if (result.error) throw new Error("Supabase sign-out failed");
		} catch {
			throw new AdminAuthFlowError("AUTH_FLOW_UNAVAILABLE");
		}
	}

	/** Always returns the same public result; callers must not enumerate accounts. */
	async requestPasswordRecovery(input: unknown): Promise<{ accepted: true }> {
		const parsed = recoverySchema.safeParse(input);
		if (!parsed.success) return { accepted: true };

		try {
			const result = await this.authClient.auth.resetPasswordForEmail(parsed.data.email, {
				redirectTo: this.recoveryRedirectUrl,
			});
			if (result.error) {
				reportPasswordRecoveryFailure("provider_response", result.error);
			}
		} catch (error) {
			reportPasswordRecoveryFailure("request_exception", error);
		}
		return { accepted: true };
	}

	/** Persists the PKCE recovery session through the request-scoped SSR cookies. */
	async exchangeRecoveryCode(input: unknown): Promise<void> {
		const parsed = pkceCallbackSchema.safeParse(input);
		if (!parsed.success) throw new AdminAuthFlowError("RECOVERY_SESSION_REQUIRED");

		try {
			const result = await this.authClient.auth.exchangeCodeForSession(parsed.data.code);
			if (result.error || !result.data?.session || !result.data.user) {
				throw new AdminAuthFlowError("RECOVERY_SESSION_REQUIRED");
			}
		} catch (error) {
			if (error instanceof AdminAuthFlowError) throw error;
			throw new AdminAuthFlowError("RECOVERY_SESSION_REQUIRED");
		}
	}

	async updatePassword(input: unknown): Promise<void> {
		const parsed = passwordResetSchema.safeParse(input);
		if (!parsed.success) throw new AdminAuthFlowError("PASSWORD_UPDATE_FAILED");

		try {
			await this.sessions.requireSession(this.request);
		} catch {
			throw new AdminAuthFlowError("RECOVERY_SESSION_REQUIRED");
		}

		try {
			const update = await this.authClient.auth.updateUser({
				password: parsed.data.password,
			});
			if (update.error || !update.data?.user) {
				throw new AdminAuthFlowError("PASSWORD_UPDATE_FAILED");
			}
			const logout = await this.authClient.auth.signOut({ scope: "global" });
			if (logout.error) throw new Error("Supabase global sign-out failed");
		} catch (error) {
			if (error instanceof AdminAuthFlowError) throw error;
			throw new AdminAuthFlowError("PASSWORD_UPDATE_FAILED");
		}
	}

	async getMfaState(): Promise<AdminMfaState> {
		const session = await this.requireActiveMember();
		if (session.authenticationLevel === "aal2") return "ready";
		return (await this.readVerifiedTotpFactors()).length > 0
			? "challenge_required"
			: "enrollment_required";
	}

	async startTotpEnrollment(): Promise<TotpEnrollment> {
		const session = await this.requireActiveMember();
		if (session.authenticationLevel === "aal2") {
			throw new AdminAuthFlowError("MFA_ALREADY_ENROLLED");
		}
		const factors = await this.readAllFactors();
		if (
			factors.some(
				(factor) => factor.factor_type === "totp" && factor.status === "verified",
			)
		) {
			throw new AdminAuthFlowError("MFA_ALREADY_ENROLLED");
		}

		for (const factor of factors) {
			if (factor.factor_type === "totp" && factor.status === "unverified") {
				await this.unenrollFactor(factor.id);
			}
		}

		let createdFactorId: string | null = null;
		try {
			const result = await this.authClient.auth.mfa.enroll({
				factorType: "totp",
				friendlyName: "Cris Chaves Imóveis",
			});
			if (result.error || !result.data) throw result.error;
			const candidateId =
				typeof result.data === "object" && result.data !== null && "id" in result.data
					? z.uuid().safeParse(result.data.id)
					: null;
			createdFactorId = candidateId?.success ? candidateId.data : null;
			const parsedEnrollment = totpEnrollmentSchema.safeParse(result.data);
			if (!parsedEnrollment.success) {
				console.error(
					"[admin-auth] Supabase returned an invalid MFA enrollment shape.",
					parsedEnrollment.error.issues.map(({ code, path }) => ({ code, path })),
				);
				throw new Error("Invalid MFA enrollment response");
			}
			const enrollment = parsedEnrollment.data;
			return {
				factorId: enrollment.id,
				qrCode: enrollment.totp.qr_code,
				secret: enrollment.totp.secret,
				uri: enrollment.totp.uri,
			};
		} catch {
			if (createdFactorId) {
				try {
					await this.unenrollFactor(createdFactorId);
				} catch {
					// The next setup attempt removes any remaining unverified factor.
				}
			}
			throw new AdminAuthFlowError("MFA_ENROLLMENT_FAILED");
		}
	}

	async verifyTotpEnrollment(input: unknown): Promise<void> {
		const parsed = totpEnrollmentVerificationSchema.safeParse(input);
		if (!parsed.success) throw new AdminAuthFlowError("MFA_VERIFICATION_FAILED");
		await this.requireActiveMember();
		await this.verifyFactor(parsed.data.factorId, parsed.data.code);
	}

	async verifyTotpChallenge(input: unknown): Promise<void> {
		const parsed = totpCodeSchema.safeParse(input);
		if (!parsed.success) throw new AdminAuthFlowError("MFA_VERIFICATION_FAILED");
		await this.requireActiveMember();
		const [factor] = await this.readVerifiedTotpFactors();
		if (!factor) throw new AdminAuthFlowError("MFA_ENROLLMENT_REQUIRED");
		await this.verifyFactor(factor.id, parsed.data.code);
	}

	private async verifyFactor(factorId: string, code: string): Promise<void> {
		try {
			const result = await this.authClient.auth.mfa.challengeAndVerify({
				factorId,
				code,
			});
			if (result.error || !result.data) throw result.error;

			const assurance = await this.authClient.auth.mfa.getAuthenticatorAssuranceLevel();
			if (assurance.error || assurance.data?.currentLevel !== "aal2") {
				throw assurance.error;
			}
		} catch {
			throw new AdminAuthFlowError("MFA_VERIFICATION_FAILED");
		}
	}

	private async requireActiveMember() {
		try {
			return await this.sessions.requireSession(this.request);
		} catch (error) {
			if (error instanceof AdminAccessError) throw error;
			throw new AdminAccessError("ADMIN_ACCESS_DENIED");
		}
	}

	private async readVerifiedTotpFactors() {
		try {
			const result = await this.authClient.auth.mfa.listFactors();
			if (result.error || !result.data) throw result.error;
			return z.array(factorSchema).parse(result.data.totp);
		} catch (error) {
			if (error instanceof AdminAuthFlowError) throw error;
			throw new AdminAuthFlowError("AUTH_FLOW_UNAVAILABLE");
		}
	}

	private async readAllFactors() {
		try {
			const result = await this.authClient.auth.mfa.listFactors();
			if (result.error || !result.data) throw result.error;
			return z.array(listedFactorSchema).parse(result.data.all ?? result.data.totp);
		} catch {
			throw new AdminAuthFlowError("AUTH_FLOW_UNAVAILABLE");
		}
	}

	private async unenrollFactor(factorId: string): Promise<void> {
		const result = await this.authClient.auth.mfa.unenroll({ factorId });
		if (result.error) throw new Error("Supabase MFA unenrollment failed");
	}

	private async clearLocalSession() {
		try {
			await this.authClient.auth.signOut({ scope: "local" });
		} catch {
			// The original denial remains the only public result.
		}
	}
}
