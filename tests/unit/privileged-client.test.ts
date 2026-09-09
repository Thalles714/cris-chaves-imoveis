import { describe, expect, it } from "vitest";

import { createPrivilegedSupabaseClient } from "~/lib/supabase/privileged-client.server";

const testSecret = ["sb", "secret", "test_only_abcdefghijklmnopqrstuvwxyz"].join("_");

describe("cliente privilegiado do Supabase", () => {
	it("recusa chaves publicáveis na fronteira confiável", () => {
		expect(() =>
			createPrivilegedSupabaseClient({
				APP_ENV: "production",
				SUPABASE_URL: "https://example.supabase.co",
				SUPABASE_SECRET_KEY: [
					"sb",
					"publishable",
					"test_only_abcdefghijklmnopqrstuvwxyz",
				].join("_"),
			}),
		).toThrow(/privileged Supabase key/u);
	});

	it("exige HTTPS fora do desenvolvimento local", () => {
		expect(() =>
			createPrivilegedSupabaseClient({
				APP_ENV: "production",
				SUPABASE_URL: "http://example.supabase.co",
				SUPABASE_SECRET_KEY: testSecret,
			}),
		).toThrow(/Invalid URL/u);
	});

	it("recusa URLs com credenciais incorporadas", () => {
		const credentialedUrl = new URL("https://example.supabase.co");
		credentialedUrl.username = "usuario";
		credentialedUrl.password = "senha";
		expect(() =>
			createPrivilegedSupabaseClient({
				APP_ENV: "preview",
				SUPABASE_URL: credentialedUrl.toString(),
				SUPABASE_SECRET_KEY: testSecret,
			}),
		).toThrow(/Invalid URL/u);
	});

	it("aceita a origem HTTPS e uma chave secreta somente no servidor", () => {
		const client = createPrivilegedSupabaseClient({
			APP_ENV: "production",
			SUPABASE_URL: "https://example.supabase.co",
			SUPABASE_SECRET_KEY: testSecret,
		});
		expect(client).toBeDefined();
	});
});
