import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const sourceRoots = [
	resolve(process.cwd(), "app"),
	resolve(process.cwd(), "docs"),
	resolve(process.cwd(), "scripts"),
	resolve(process.cwd(), "supabase"),
	resolve(process.cwd(), "tests"),
	resolve(process.cwd(), "workers"),
];
const sourceFile = /\.(?:css|html|js|json|md|mjs|sql|ts|tsx|yaml|yml)$/u;
const mojibake =
	/(?:\u00c3[\u0080-\u00bf]|\u00c2[\u0080-\u00bf]|\u00e2\u0080[\u0080-\u00bf])/u;

async function listSourceFiles(directory: string): Promise<string[]> {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = await Promise.all(
		entries.map(async (entry) => {
			const path = `${directory}/${entry.name}`;
			if (entry.isDirectory()) return listSourceFiles(path);
			return sourceFile.test(entry.name) ? [path] : [];
		}),
	);
	return files.flat();
}

describe("source text encoding", () => {
	it("does not contain mojibake signatures in source, tests, database or docs", async () => {
		const files = (await Promise.all(sourceRoots.map(listSourceFiles))).flat();
		const corrupted = (
			await Promise.all(
				files.map(async (path) => ({ path, source: await readFile(path, "utf8") })),
			)
		)
			.filter(({ source }) => mojibake.test(source))
			.map(({ path }) => path.replaceAll("\\", "/"));

		expect(corrupted).toEqual([]);
	});
});
