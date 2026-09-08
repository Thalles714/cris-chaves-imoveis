// @vitest-environment node

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
	new URL(
		"../../supabase/migrations/20260903021000_reserved_sold_catalog_policy.sql",
		import.meta.url,
	),
	"utf8",
);

describe("reserved and sold database policy migration", () => {
	it("allows a reserved property to return to available without opening sold", () => {
		expect(migration).toMatch(
			/old\.deal_status = 'reserved'[\s\S]*new\.deal_status in \('available'[\s\S]*'sold'/u,
		);
		expect(migration).not.toMatch(/old\.deal_status = 'sold'[\s\S]*new\.deal_status/u);
	});

	it("excludes sold listings from the catalog, media projection and Storage", () => {
		const publicEligibilityChecks = migration.match(
			/property\.deal_status in \('available'::public\.deal_status, 'reserved'::public\.deal_status\)/gu,
		);
		expect(publicEligibilityChecks).toHaveLength(3);
		expect(migration).toContain(
			"delete from public.public_property_catalog\nwhere deal_status = 'sold'::public.deal_status;",
		);
		expect(migration).toContain("public_property_catalog_public_deal_status");
	});
});
