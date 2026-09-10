import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "app/app.css"), "utf8");

describe("public mobile header", () => {
	it("shows only the compact contact label throughout the mobile breakpoint", () => {
		const mobileBlock = css.match(
			/@media \(max-width: 47\.5rem\) \{(?<rules>[\s\S]*?)\n\}/u,
		)?.groups?.rules;

		expect(mobileBlock).toBeDefined();
		expect(mobileBlock).toMatch(
			/\.site-header-cta \.site-header-cta__wide\s*\{\s*display:\s*none\s*!important;/u,
		);
		expect(mobileBlock).toMatch(
			/\.site-header-cta \.site-header-cta__short\s*\{\s*display:\s*inline\s*!important;/u,
		);
	});

	it("preserves the credential instead of the logo on ultra-compact screens", () => {
		const compactBlock = css.match(
			/@media \(max-width: 23\.5rem\) \{(?<rules>[\s\S]*?)\n\}/u,
		)?.groups?.rules;

		expect(compactBlock).toBeDefined();
		expect(compactBlock).toMatch(
			/\.brand-lockup--header \.brand-lockup__mark\s*\{\s*display:\s*none;/u,
		);
		expect(compactBlock).not.toMatch(
			/\.brand-lockup__credential\s*\{\s*display:\s*none/u,
		);
	});
});
