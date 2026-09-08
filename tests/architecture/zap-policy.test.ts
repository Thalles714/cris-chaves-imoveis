import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const expectedIgnoredRules = [
	"10015",
	"10031",
	"10049",
	"10094",
	"10111",
	"10202",
	"120000",
	"90004",
	"90005",
];

describe("ZAP staging policy", () => {
	it("keeps the scanner pinned, fail-closed and limited to reviewed exceptions", async () => {
		const workflow = await readFile(
			resolve(process.cwd(), ".github/workflows/zap-staging.yml"),
			"utf8",
		);
		const rules = await readFile(resolve(process.cwd(), ".zap/rules.tsv"), "utf8");
		const ignored = rules
			.split(/\r?\n/u)
			.filter((line) => line && !line.startsWith("#"))
			.map((line) => {
				const [id, disposition, reason] = line.split("\t");
				expect(disposition).toBe("IGNORE");
				expect(reason).toMatch(/^\(.+\)$/u);
				return id;
			})
			.sort();

		expect(ignored).toEqual(expectedIgnoredRules);
		expect(ignored).not.toContain("10021");
		expect(ignored).not.toContain("10035");
		expect(ignored).not.toContain("10063");
		expect(workflow).toContain(
			"zaproxy/action-baseline@de8ad967d3548d44ef623df22cf95c3b0baf8b25",
		);
		expect(workflow).toContain("fail_action: true");
		expect(workflow).toContain("allow_issue_writing: false");
		expect(workflow).toContain("rules_file_name: .zap/rules.tsv");
	});
});
