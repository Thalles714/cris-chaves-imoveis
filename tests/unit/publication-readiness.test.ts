import { describe, expect, it } from "vitest";

import {
	assessPublicationReadiness,
	isPublicationReady,
} from "~/modules/properties/admin/publication-readiness";

const readyListing = {
	description: "Casa à venda próxima aos serviços essenciais.",
	imageCount: 2,
	hasApprovedCover: true,
};

describe("publication readiness", () => {
	it("releases publication from editorial and media requirements without authorization", () => {
		expect(isPublicationReady(readyListing)).toBe(true);
		expect(isPublicationReady({ ...readyListing, imageCount: 0 })).toBe(false);
		expect(isPublicationReady({ ...readyListing, hasApprovedCover: false })).toBe(false);
	});

	it("returns operator-facing missing items", () => {
		const items = assessPublicationReadiness({
			...readyListing,
			description: "",
			hasApprovedCover: false,
		});

		expect(items.filter((item) => !item.complete).map((item) => item.id)).toEqual([
			"description",
			"cover",
		]);
	});
});
