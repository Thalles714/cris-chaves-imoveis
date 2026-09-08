export interface CloudflareRateLimitBinding {
	limit(options: { key: string }): Promise<{ success: boolean }>;
}

export class BindingContactRateLimiter {
	constructor(private readonly binding: CloudflareRateLimitBinding) {}

	async limit(key: string) {
		return (await this.binding.limit({ key })).success;
	}
}

export async function buildAnonymousRateLimitKey(input: {
	ip: string | null;
	userAgent: string | null;
	salt: string;
}) {
	const day = new Date().toISOString().slice(0, 10);
	const value = `${input.salt}\u0000${day}\u0000${input.ip ?? "unknown"}\u0000${
		input.userAgent ?? "unknown"
	}`;
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0"))
		.join("")
		.slice(0, 32);
}
