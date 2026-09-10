import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "~/lib/supabase/database.types";

import { AdminMemberOperationError } from "./admin-member-errors.server";

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

function isPrivilegedSupabaseKey(value: string): boolean {
	if (/^sb_secret_[A-Za-z0-9_-]{20,}$/u.test(value)) return true;
	return decodeJwtPayload(value)?.role === "service_role";
}

const privilegedDirectoryConfigSchema = z
	.object({
		url: z.url(),
		secretKey: z.string().trim().min(20).max(4096),
		appEnvironment: z.enum(["development", "preview", "production", "test"]),
		publicSiteUrl: z.string().trim().min(1).max(2048),
	})
	.strict()
	.superRefine((value, context) => {
		if (!isPrivilegedSupabaseKey(value.secretKey)) {
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
		try {
			const publicUrl = new URL(value.publicSiteUrl);
			if (
				publicUrl.username ||
				publicUrl.password ||
				publicUrl.hash ||
				publicUrl.search ||
				publicUrl.pathname !== "/" ||
				(value.appEnvironment === "production" && publicUrl.protocol !== "https:")
			) {
				throw new Error("invalid public origin");
			}
		} catch {
			context.addIssue({
				code: "custom",
				path: ["publicSiteUrl"],
				message: "Invalid public origin.",
			});
		}
	});

export interface AdminAuthDirectory {
	invite(email: string): Promise<{ userId: string }>;
	findEmails(userIds: string[]): Promise<ReadonlyMap<string, string>>;
	deleteInvitedUser(userId: string): Promise<void>;
	deleteInvitedUserStrict(userId: string): Promise<void>;
}

export class SupabasePrivilegedAuthDirectory implements AdminAuthDirectory {
	constructor(
		private readonly client: SupabaseClient<Database>,
		private readonly invitationRedirectUrl: string,
	) {}

	async invite(email: string): Promise<{ userId: string }> {
		const result = await this.client.auth.admin.inviteUserByEmail(email, {
			redirectTo: this.invitationRedirectUrl,
		});
		if (result.error || !result.data.user) {
			throw new AdminMemberOperationError("DIRECTORY_UNAVAILABLE");
		}
		return { userId: result.data.user.id };
	}

	async findEmails(userIds: string[]): Promise<ReadonlyMap<string, string>> {
		if (userIds.length === 0) return new Map();
		try {
			const result = await this.client.auth.admin.listUsers({ page: 1, perPage: 1000 });
			if (result.error) throw result.error;
			const allowed = new Set(userIds);
			return new Map(
				result.data.users.flatMap((user) => {
					const email = user.email?.trim().toLowerCase();
					return allowed.has(user.id) && email ? [[user.id, email] as const] : [];
				}),
			);
		} catch {
			throw new AdminMemberOperationError("DIRECTORY_UNAVAILABLE");
		}
	}

	async deleteInvitedUser(userId: string): Promise<void> {
		try {
			const result = await this.client.auth.admin.deleteUser(userId, false);
			if (result.error) throw result.error;
		} catch {
			// Best-effort compensation. The original error remains generic.
		}
	}

	async deleteInvitedUserStrict(userId: string): Promise<void> {
		try {
			const result = await this.client.auth.admin.deleteUser(userId, false);
			if (result.error) throw result.error;
		} catch {
			throw new AdminMemberOperationError("DIRECTORY_UNAVAILABLE");
		}
	}
}

export function createPrivilegedAuthDirectory(
	bindings: Readonly<Record<string, unknown>>,
): SupabasePrivilegedAuthDirectory {
	const parsed = privilegedDirectoryConfigSchema.safeParse({
		url: bindings.SUPABASE_URL,
		secretKey: bindings.SUPABASE_SECRET_KEY,
		appEnvironment: bindings.APP_ENV ?? "development",
		publicSiteUrl: bindings.PUBLIC_SITE_URL,
	});
	if (!parsed.success) {
		throw new AdminMemberOperationError("CONFIGURATION_UNAVAILABLE");
	}

	const publicOrigin = new URL(parsed.data.publicSiteUrl).origin;
	const client = createClient<Database>(parsed.data.url, parsed.data.secretKey, {
		auth: {
			autoRefreshToken: false,
			detectSessionInUrl: false,
			persistSession: false,
		},
	});
	return new SupabasePrivilegedAuthDirectory(
		client,
		new URL("/admin/convite", `${publicOrigin}/`).toString(),
	);
}
