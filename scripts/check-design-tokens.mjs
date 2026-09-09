import { readdir, readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DEFINITION_PATTERN = /--(cc-[a-z0-9-]+)\s*:/gu;
const USAGE_PATTERN = /var\(\s*--(cc-[a-z0-9-]+)/gu;

async function collectCssFiles(directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const path = resolve(directory, entry.name);
		if (entry.isDirectory()) files.push(...(await collectCssFiles(path)));
		if (entry.isFile() && entry.name.endsWith(".css")) files.push(path);
	}
	return files;
}

export async function findUndefinedDesignTokens(projectRoot = PROJECT_ROOT) {
	const files = await collectCssFiles(resolve(projectRoot, "app"));
	const definitions = new Set();
	const usages = [];

	for (const path of files) {
		const content = await readFile(path, "utf8");
		for (const match of content.matchAll(DEFINITION_PATTERN)) definitions.add(match[1]);
		for (const match of content.matchAll(USAGE_PATTERN)) {
			usages.push({
				name: match[1],
				path: relative(projectRoot, path).replaceAll("\\", "/"),
				line: content.slice(0, match.index).split("\n").length,
			});
		}
	}

	return usages
		.filter(({ name }) => !definitions.has(name))
		.map(({ name, path, line }) => `${path}:${line} usa --${name} sem definição`);
}

async function main() {
	const violations = await findUndefinedDesignTokens();
	if (violations.length) {
		console.error("Tokens visuais indefinidos:\n" + violations.join("\n"));
		process.exitCode = 1;
		return;
	}
	console.log("Tokens visuais: todos os usos --cc-* possuem definição.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	await main();
}
