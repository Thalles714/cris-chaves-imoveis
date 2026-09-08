// @vitest-environment node

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const atomicMigration = readFileSync(
	new URL(
		"../../supabase/migrations/20260905030000_atomic_property_publication.sql",
		import.meta.url,
	),
	"utf8",
);
const simplifiedMigration = readFileSync(
	new URL(
		"../../supabase/migrations/20260905040000_simplify_property_publication.sql",
		import.meta.url,
	),
	"utf8",
);

describe("publicação atômica de imóveis", () => {
	it("valida descrição, foto e capa sem exigir cadastro separado de autorização", () => {
		expect(simplifiedMigration).toContain("nullif(btrim(new.description), '') is null");
		expect(simplifiedMigration).toContain("processing_status = 'processed'");
		expect(simplifiedMigration).toContain("is_approved_for_publication");
		expect(simplifiedMigration).toContain("is_cover");
		expect(simplifiedMigration).not.toContain("authorization_confirmed_at is not null");
		expect(simplifiedMigration).not.toContain("authorization_confirmed_by is not null");
		expect(simplifiedMigration).toContain("p_authorization_confirmed boolean");
		expect(simplifiedMigration).toContain(
			"current_setting('app.publication_authorization_confirmed', true) is distinct from 'true'",
		);
		expect(simplifiedMigration).toContain(
			"drop trigger if exists property_private_details_20_protect_authorization",
		);
	});

	it("exige a confirmação apenas na ação final e preserva o banco contra bypass", () => {
		expect(simplifiedMigration).toContain("if p_authorization_confirmed is not true");
		expect(simplifiedMigration).toContain(
			"set_config('app.publication_authorization_confirmed', 'true', true)",
		);
		expect(simplifiedMigration).toContain(
			"set_config('app.publication_authorization_confirmed', 'false', true)",
		);
		expect(simplifiedMigration).toContain(
			"drop function if exists public.publish_property(uuid, bigint)",
		);
		expect(simplifiedMigration).toContain(
			"grant execute on function public.publish_property(uuid, bigint, boolean) to authenticated",
		);
	});

	it("publica por uma função versionada e serializa mudanças concorrentes", () => {
		expect(atomicMigration).toContain("public.publish_property");
		expect(atomicMigration).toContain("p_expected_version");
		expect(atomicMigration).toContain("pg_advisory_xact_lock");
		expect(atomicMigration).toContain("create constraint trigger");
		expect(atomicMigration).toContain("deferrable initially deferred");
	});

	it("não expõe a função de publicação para visitantes", () => {
		expect(atomicMigration).toContain(
			"revoke all on function public.publish_property(uuid, bigint) from public, anon",
		);
		expect(atomicMigration).toContain(
			"grant execute on function public.publish_property(uuid, bigint) to authenticated",
		);
	});
});
