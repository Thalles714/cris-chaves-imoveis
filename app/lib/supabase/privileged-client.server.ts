import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "./database.types";

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
	if (/^sb_secret_[A-Za-z0-9_-]{20,}$/u.test(value)) return true;
	return decodeJwtPayload(value)?.role === "service_role";
}

const privilegedClientConfigSchema = z
	.object({
		url: z.string().trim().min(1).max(2048),
		secretKey: z.string().trim().min(20).max(4096),
		appEnvironment: z.enum(["development", "preview", "production", "test"]),
	})
	.strict()
	.superRefine((value, context) => {
		if (!isPrivilegedKey(value.secretKey)) {
			context.addIssue({
				code: "custom",
				path: ["secretKey"],
				message: "A privileged Supabase key is required.",
			});
		}
		try {
			const url = new URL(value.url);
			const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
			if (
				url.username ||
				url.password ||
				url.hash ||
				(url.protocol !== "https:" && !(local && value.appEnvironment !== "production"))
			) {
				throw new Error("invalid origin");
			}
		} catch {
			context.addIssue({ code: "custom", path: ["url"], message: "Invalid URL." });
		}
	});

export function createPrivilegedSupabaseClient(
	bindings: Readonly<Record<string, unknown>>,
) {
	const config = privilegedClientConfigSchema.parse({
		url: bindings.SUPABASE_URL,
		secretKey: bindings.SUPABASE_SECRET_KEY,
		appEnvironment: bindings.APP_ENV ?? "development",
	});
	return createClient<Database>(config.url, config.secretKey, {
		auth: {
			autoRefreshToken: false,
			detectSessionInUrl: false,
			persistSession: false,
		},
	});
}
