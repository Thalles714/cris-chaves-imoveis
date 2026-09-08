import { z } from "zod";

const appEnvironmentSchema = z.enum(["development", "preview", "production", "test"]);

function isAllowedSupabaseUrl(value: string, environment: string) {
	try {
		const url = new URL(value);
		if (url.username || url.password || url.hash) return false;
		if (url.protocol === "https:") return true;
		const localHost =
			url.hostname === "localhost" ||
			url.hostname === "127.0.0.1" ||
			url.hostname === "[::1]";
		return environment !== "production" && localHost && url.protocol === "http:";
	} catch {
		return false;
	}
}

function decodeJwtPayload(value: string): Record<string, unknown> | null {
	const parts = value.split(".");
	if (parts.length !== 3 || !parts[1]) return null;
	try {
		const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
		const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
		const parsed: unknown = JSON.parse(atob(padded));
		return typeof parsed === "object" && parsed !== null
			? (parsed as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
}

function isPrivilegedKey(value: string) {
	if (/^sb_secret_/i.test(value)) return true;
	const payload = decodeJwtPayload(value);
	return payload?.role === "service_role";
}

export const supabaseServerConfigSchema = z
	.object({
		url: z.string().trim().min(1).max(2048),
		publishableKey: z.string().trim().min(20).max(4096),
		appEnvironment: appEnvironmentSchema,
	})
	.strict()
	.superRefine((value, context) => {
		if (!isAllowedSupabaseUrl(value.url, value.appEnvironment)) {
			context.addIssue({
				code: "custom",
				path: ["url"],
				message: "A origem Supabase não é permitida neste ambiente.",
			});
		}
		if (isPrivilegedKey(value.publishableKey)) {
			context.addIssue({
				code: "custom",
				path: ["publishableKey"],
				message: "Uma chave privilegiada não pode ser usada neste cliente.",
			});
		}
	});

export type SupabaseServerConfig = z.infer<typeof supabaseServerConfigSchema>;

/** Reads only allowlisted public client configuration from server bindings. */
export function readSupabaseServerConfig(
	bindings: Readonly<Record<string, unknown>>,
): SupabaseServerConfig {
	return supabaseServerConfigSchema.parse({
		url: bindings.SUPABASE_URL,
		publishableKey: bindings.SUPABASE_PUBLISHABLE_KEY,
		appEnvironment: bindings.APP_ENV ?? "development",
	});
}
