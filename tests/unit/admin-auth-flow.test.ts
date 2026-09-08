import { describe, expect, it, vi } from "vitest";

import {
	SupabaseAdminAuthFlow,
	type AdminAuthFlowPort,
} from "~/modules/auth/admin-auth-flow.server";
import { AdminAccessError } from "~/modules/auth/auth-errors.server";
import { createRequestScopedAdminAuth } from "~/modules/auth/request-auth.server";

const request = new Request("https://cris-chaves.example/admin/login");
const userId = "10000000-0000-4000-8000-000000000001";
const factorId = "20000000-0000-4000-8000-000000000002";
const totpSeed = ["ABCDEFGH", "IJKLMNOP"].join("");
const syntheticEmail = (local: string) => `${local}@${["example", "test"].join(".")}`;

function createAuthPort() {
	return {
		auth: {
			signInWithPassword: vi.fn().mockResolvedValue({
				data: { user: { id: userId }, session: { access_token: "redacted" } },
				error: null,
			}),
			signOut: vi.fn().mockResolvedValue({ data: {}, error: null }),
			resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
			exchangeCodeForSession: vi.fn().mockResolvedValue({
				data: { user: { id: userId }, session: { access_token: "redacted" } },
				error: null,
			}),
			updateUser: vi.fn().mockResolvedValue({
				data: { user: { id: userId } },
				error: null,
			}),
			mfa: {
				unenroll: vi.fn().mockResolvedValue({ data: {}, error: null }),
				enroll: vi.fn().mockResolvedValue({
					data: {
						id: factorId,
						type: "totp",
						totp: {
							qr_code: "data:image/svg+xml;base64,PHN2Zy8+",
							secret: totpSeed,
							uri: "otpauth://totp/Cris%20Chaves",
						},
					},
					error: null,
				}),
				challengeAndVerify: vi.fn().mockResolvedValue({
					data: { access_token: "redacted" },
					error: null,
				}),
				listFactors: vi.fn().mockResolvedValue({
					data: { totp: [], all: [] },
					error: null,
				}),
				getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({
					data: { currentLevel: "aal2", nextLevel: "aal2" },
					error: null,
				}),
			},
		},
	} satisfies AdminAuthFlowPort;
}

function createFlow(port = createAuthPort(), level: "aal1" | "aal2" = "aal1") {
	const sessions = {
		requireSession: vi.fn().mockResolvedValue({
			userId,
			role: "owner" as const,
			authenticationLevel: level,
		}),
	};
	return {
		flow: new SupabaseAdminAuthFlow(
			request,
			port,
			sessions,
			"https://cris-chaves.example/admin/auth/callback?next=%2Fadmin%2Fredefinir-senha",
		),
		port,
		sessions,
	};
}

describe("administrative authentication flow", () => {
	it("routes a valid AAL1 member only to MFA and an AAL2 member to admin", async () => {
		await expect(
			createFlow().flow.signInPassword({
				email: ` ${syntheticEmail("CRIS").toUpperCase()} `,
				password: "password-manager-value",
			}),
		).resolves.toEqual({ next: "mfa" });
		await expect(
			createFlow(createAuthPort(), "aal2").flow.signInPassword({
				email: syntheticEmail("cris"),
				password: "password-manager-value",
			}),
		).resolves.toEqual({ next: "admin" });
	});

	it("turns a missing membership into the same generic login denial and clears cookies", async () => {
		const setup = createFlow();
		setup.sessions.requireSession.mockRejectedValue(
			new AdminAccessError("ADMIN_ACCESS_DENIED"),
		);

		await expect(
			setup.flow.signInPassword({ email: syntheticEmail("unknown"), password: "secret" }),
		).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
		expect(setup.port.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
	});

	it("does not reveal whether a recovery address or provider request exists", async () => {
		const setup = createFlow();
		const observed = vi.spyOn(console, "error").mockImplementation(() => undefined);
		setup.port.auth.resetPasswordForEmail.mockRejectedValue(new Error("offline"));

		await expect(
			setup.flow.requestPasswordRecovery({
				email: ` ${syntheticEmail("ANY").toUpperCase()} `,
			}),
		).resolves.toEqual({ accepted: true });
		await expect(
			setup.flow.requestPasswordRecovery({ email: "not-an-email" }),
		).resolves.toEqual({ accepted: true });
		expect(setup.port.auth.resetPasswordForEmail).toHaveBeenCalledWith(
			syntheticEmail("any"),
			{
				redirectTo:
					"https://cris-chaves.example/admin/auth/callback?next=%2Fadmin%2Fredefinir-senha",
			},
		);
		expect(observed).toHaveBeenCalledOnce();
		expect(observed).toHaveBeenCalledWith(
			"[admin-auth] Password recovery request failed.",
			{ source: "request_exception", code: "unknown" },
		);
		observed.mockRestore();
	});

	it("records a sanitized provider response error without changing the public recovery result", async () => {
		const setup = createFlow();
		const privateAddress = syntheticEmail("private-member");
		const observed = vi.spyOn(console, "error").mockImplementation(() => undefined);
		setup.port.auth.resetPasswordForEmail.mockResolvedValue({
			data: null,
			error: {
				code: "over_email_send_rate_limit",
				status: 429,
				message: `Rate limited while sending to ${privateAddress}`,
			},
		});

		await expect(
			setup.flow.requestPasswordRecovery({ email: privateAddress }),
		).resolves.toEqual({ accepted: true });
		expect(observed).toHaveBeenCalledWith(
			"[admin-auth] Password recovery request failed.",
			{
				source: "provider_response",
				code: "over_email_send_rate_limit",
				status: 429,
			},
		);
		expect(JSON.stringify(observed.mock.calls)).not.toContain(privateAddress);
		observed.mockRestore();
	});

	it("exchanges only a validated PKCE callback code into the SSR session", async () => {
		const setup = createFlow();
		await expect(
			setup.flow.exchangeRecoveryCode({ code: "valid-pkce_code.123" }),
		).resolves.toBeUndefined();
		expect(setup.port.auth.exchangeCodeForSession).toHaveBeenCalledWith(
			"valid-pkce_code.123",
		);

		await expect(
			setup.flow.exchangeRecoveryCode({ code: "bad code" }),
		).rejects.toMatchObject({ code: "RECOVERY_SESSION_REQUIRED" });
	});

	it("requires an active recovery session and globally signs out after password reset", async () => {
		const setup = createFlow();
		await expect(
			setup.flow.updatePassword({
				password: "nova-senha-longa-e-unica",
				passwordConfirmation: "nova-senha-longa-e-unica",
			}),
		).resolves.toBeUndefined();
		expect(setup.port.auth.updateUser).toHaveBeenCalledWith({
			password: "nova-senha-longa-e-unica",
		});
		expect(setup.port.auth.signOut).toHaveBeenCalledWith({ scope: "global" });

		setup.sessions.requireSession.mockRejectedValue(
			new AdminAccessError("AUTHENTICATION_REQUIRED"),
		);
		await expect(
			setup.flow.updatePassword({
				password: "outra-senha-longa-e-unica",
				passwordConfirmation: "outra-senha-longa-e-unica",
			}),
		).rejects.toMatchObject({ code: "RECOVERY_SESSION_REQUIRED" });
	});

	it("requires at least nine matching password characters", async () => {
		const valid = createFlow();
		await expect(
			valid.flow.updatePassword({
				password: "A1!bcDef9",
				passwordConfirmation: "A1!bcDef9",
			}),
		).resolves.toBeUndefined();

		for (const input of [
			{ password: "A1!bcDe8", passwordConfirmation: "A1!bcDe8" },
			{ password: "A1!bcDef9", passwordConfirmation: "A1!bcDef0" },
		]) {
			const invalid = createFlow();
			await expect(invalid.flow.updatePassword(input)).rejects.toMatchObject({
				code: "PASSWORD_UPDATE_FAILED",
			});
			expect(invalid.port.auth.updateUser).not.toHaveBeenCalled();
		}
	});

	it("reports MFA enrollment, challenge and ready states without exposing admin data", async () => {
		const enrollment = createFlow();
		await expect(enrollment.flow.getMfaState()).resolves.toBe("enrollment_required");

		const challenge = createFlow();
		challenge.port.auth.mfa.listFactors.mockResolvedValue({
			data: {
				totp: [{ id: factorId, factor_type: "totp", status: "verified" }],
			},
			error: null,
		});
		await expect(challenge.flow.getMfaState()).resolves.toBe("challenge_required");
		await expect(createFlow(createAuthPort(), "aal2").flow.getMfaState()).resolves.toBe(
			"ready",
		);
	});

	it("starts TOTP enrollment only for an active AAL1 member without a verified factor", async () => {
		const setup = createFlow();
		await expect(setup.flow.startTotpEnrollment()).resolves.toEqual({
			factorId,
			qrCode: "data:image/svg+xml;base64,PHN2Zy8+",
			secret: totpSeed,
			uri: "otpauth://totp/Cris%20Chaves",
		});
		expect(setup.port.auth.mfa.enroll).toHaveBeenCalledWith({
			factorType: "totp",
			friendlyName: "Cris Chaves Imóveis",
		});
	});

	it("replaces an orphaned unverified TOTP factor before starting again", async () => {
		const staleFactorId = "30000000-0000-4000-8000-000000000003";
		const setup = createFlow();
		setup.port.auth.mfa.listFactors.mockResolvedValue({
			data: {
				totp: [],
				all: [
					{
						id: staleFactorId,
						factor_type: "totp",
						status: "unverified",
					},
				],
			},
			error: null,
		});

		await expect(setup.flow.startTotpEnrollment()).resolves.toMatchObject({
			factorId,
		});
		expect(setup.port.auth.mfa.unenroll).toHaveBeenCalledWith({
			factorId: staleFactorId,
		});
		expect(setup.port.auth.mfa.enroll).toHaveBeenCalledOnce();
	});

	it("cleans up a newly created factor when its enrollment payload is invalid", async () => {
		const setup = createFlow();
		setup.port.auth.mfa.enroll.mockResolvedValue({
			data: {
				id: factorId,
				type: "totp",
				totp: {
					qr_code: "invalid-qr-payload",
					secret: totpSeed,
					uri: "otpauth://totp/Cris%20Chaves",
				},
			},
			error: null,
		});

		await expect(setup.flow.startTotpEnrollment()).rejects.toMatchObject({
			code: "MFA_ENROLLMENT_FAILED",
		});
		expect(setup.port.auth.mfa.unenroll).toHaveBeenCalledWith({ factorId });
	});

	it("uses only the verified server-side factor for a TOTP challenge", async () => {
		const setup = createFlow();
		setup.port.auth.mfa.listFactors.mockResolvedValue({
			data: {
				totp: [{ id: factorId, factor_type: "totp", status: "verified" }],
			},
			error: null,
		});

		await setup.flow.verifyTotpChallenge({ code: "123456" });
		expect(setup.port.auth.mfa.challengeAndVerify).toHaveBeenCalledWith({
			factorId,
			code: "123456",
		});
	});

	it("accepts an enrollment factor id only through the enrollment flow and confirms AAL2", async () => {
		const setup = createFlow();
		await setup.flow.verifyTotpEnrollment({ factorId, code: "654321" });
		expect(setup.port.auth.mfa.getAuthenticatorAssuranceLevel).toHaveBeenCalledOnce();

		setup.port.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
			data: { currentLevel: "aal1", nextLevel: "aal2" },
			error: null,
		});
		await expect(
			setup.flow.verifyTotpEnrollment({ factorId, code: "654321" }),
		).rejects.toMatchObject({ code: "MFA_VERIFICATION_FAILED" });
	});

	it("fails closed when Supabase configuration is absent", () => {
		expect(() => createRequestScopedAdminAuth(request, {})).toThrow();
	});

	it("fails closed without a canonical recovery origin in production", () => {
		expect(() =>
			createRequestScopedAdminAuth(request, {
				APP_ENV: "production",
				SUPABASE_URL: "https://project-ref.supabase.co",
				SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_key_1234567890",
			}),
		).toThrow("PUBLIC_SITE_URL is required in production.");
	});
});
