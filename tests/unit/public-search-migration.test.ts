// @vitest-environment node

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
	new URL(
		"../../supabase/migrations/20260905020000_public_catalog_text_search.sql",
		import.meta.url,
	),
	"utf8",
);

describe("busca textual do catálogo público", () => {
	it("pesquisa e ranqueia somente a projeção pública permitida", () => {
		expect(migration).toContain("public.search_public_properties");
		expect(migration).toContain("public.public_property_catalog");
		expect(migration).toContain("pg_catalog.ts_rank_cd");
		expect(migration).toContain("pg_catalog.websearch_to_tsquery");
		expect(migration).toContain("catalog.description");
		expect(migration).toContain("catalog.features");
		expect(migration).not.toContain("property_private_details");
		expect(migration).not.toContain("owner_contact");
		expect(migration).not.toContain("exact_address");
	});

	it("mantém a função invoker e limita paginação", () => {
		expect(migration).toContain("security invoker");
		expect(migration).toContain("least(coalesce(p_page_size, 12), 48)");
		expect(migration).toContain("grant execute on function");
	});
});
