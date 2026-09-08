import { z } from "zod";

import { contactSubmissionSchema, type ContactSubmission } from "./contact-schema";

export interface ContactRateLimiter {
	limit(key: string): Promise<boolean>;
}

export interface TurnstileVerification {
	success: boolean;
	action?: string;
	hostname?: string;
	errorCodes: readonly string[];
}

export interface TurnstileVerifier {
	verify(input: {
		token: string;
		remoteIp?: string;
		idempotencyKey: string;
	}): Promise<TurnstileVerification>;
}

export interface ContactDelivery {
	deliver(submission: Omit<ContactSubmission, "turnstileToken">): Promise<boolean>;
}

export type ContactServiceResult =
	| { ok: true; status: 200 }
	| { ok: false; status: 400 | 429 | 503; code: "invalid" | "limited" | "unavailable" };

export async function processContactSubmission(input: {
	formData: FormData;
	rateLimitKey: string;
	remoteIp?: string;
	rateLimiter: ContactRateLimiter;
	turnstile: TurnstileVerifier;
	delivery: ContactDelivery;
}): Promise<ContactServiceResult> {
	const allowedFields = new Set([
		"name",
		"phone",
		"email",
		"message",
		"intent",
		"propertyCode",
		"cf-turnstile-response",
	]);
	const fields = Array.from(input.formData.keys());
	if (
		fields.some((field) => !allowedFields.has(field)) ||
		Array.from(allowedFields).some((field) => input.formData.getAll(field).length > 1)
	) {
		return { ok: false, status: 400, code: "invalid" };
	}
	const parsed = contactSubmissionSchema.safeParse({
		name: input.formData.get("name"),
		phone: input.formData.get("phone"),
		email: input.formData.get("email") ?? "",
		message: input.formData.get("message"),
		intent: input.formData.get("intent"),
		propertyCode: input.formData.get("propertyCode") ?? "",
		turnstileToken: input.formData.get("cf-turnstile-response"),
	});
	if (!parsed.success) {
		return { ok: false, status: 400, code: "invalid" };
	}

	if (!(await input.rateLimiter.limit(input.rateLimitKey))) {
		return { ok: false, status: 429, code: "limited" };
	}

	const verification = await input.turnstile.verify({
		token: parsed.data.turnstileToken,
		remoteIp: input.remoteIp,
		idempotencyKey: crypto.randomUUID(),
	});
	if (!verification.success || verification.action !== "contact") {
		return { ok: false, status: 400, code: "invalid" };
	}

	const submission = {
		name: parsed.data.name,
		phone: parsed.data.phone,
		email: parsed.data.email,
		message: parsed.data.message,
		intent: parsed.data.intent,
		propertyCode: parsed.data.propertyCode,
	};
	if (!(await input.delivery.deliver(submission))) {
		return { ok: false, status: 503, code: "unavailable" };
	}
	return { ok: true, status: 200 };
}

const siteverifyResponseSchema = z
	.object({
		success: z.boolean(),
		hostname: z.string().optional(),
		action: z.string().optional(),
		["error-codes"]: z.array(z.string()).optional(),
	})
	.passthrough();

export class CloudflareTurnstileVerifier implements TurnstileVerifier {
	constructor(
		private readonly secret: string,
		private readonly expectedHostname: string,
		private readonly fetcher: typeof fetch = fetch,
	) {}

	async verify(input: {
		token: string;
		remoteIp?: string;
		idempotencyKey: string;
	}): Promise<TurnstileVerification> {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 8_000);
		try {
			const body = new URLSearchParams({
				secret: this.secret,
				response: input.token,
				idempotency_key: input.idempotencyKey,
			});
			if (input.remoteIp) body.set("remoteip", input.remoteIp);
			const response = await this.fetcher(
				"https://challenges.cloudflare.com/turnstile/v0/siteverify",
				{
					method: "POST",
					headers: { "Content-Type": "application/x-www-form-urlencoded" },
					body,
					signal: controller.signal,
				},
			);
			if (!response.ok) return { success: false, errorCodes: ["siteverify-error"] };
			const result = siteverifyResponseSchema.safeParse(await response.json());
			if (!result.success) return { success: false, errorCodes: ["invalid-response"] };
			const hostnameMatches = result.data.hostname === this.expectedHostname;
			return {
				success: result.data.success && hostnameMatches,
				action: result.data.action,
				hostname: result.data.hostname,
				errorCodes: result.data["error-codes"] ?? [],
			};
		} catch {
			return { success: false, errorCodes: ["siteverify-unavailable"] };
		} finally {
			clearTimeout(timeout);
		}
	}
}

export class UnavailableContactDelivery implements ContactDelivery {
	deliver() {
		return Promise.resolve(false);
	}
}
