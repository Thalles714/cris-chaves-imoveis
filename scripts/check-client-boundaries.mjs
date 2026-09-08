import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const BUNDLE_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".map", ".mjs"]);
const IMPORT_PATTERN =
	/\b(?:import|export)\s+(?:[^"'()]*?\s+from\s+)?["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)|\brequire\s*\(\s*["']([^"']+)["']\s*\)/g;
const SERVER_SPECIFIER_PATTERN = /(?:^|\/)\.server\/|\.server(?:\.[cm]?[jt]sx?)?(?:$|\/)/;
const SERVER_BUNDLE_MARKERS = [
	/\.server(?:\.[cm]?[jt]sx?|\/)/,
	/ADMIN_PASSWORD/,
	/DATABASE_URL/,
	/PRIVATE_KEY/,
	/SERVICE_ROLE_KEY/,
	/SUPABASE_SERVICE_ROLE_KEY/,
	/SUPABASE_SECRET_KEY/,
	/sb_secret_[A-Za-z0-9_-]{20,}/,
];

function normalizePath(filePath) {
	return filePath.replaceAll("\\", "/");
}

async function collectFiles(directory, extensions, root = directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const absolutePath = resolve(directory, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await collectFiles(absolutePath, extensions, root)));
		} else if (entry.isFile() && extensions.has(extname(entry.name))) {
			files.push({
				absolutePath,
				relativePath: normalizePath(relative(root, absolutePath)),
				content: await readFile(absolutePath, "utf8"),
			});
		}
	}

	return files;
}

export function isServerOnlySpecifier(specifier) {
	return SERVER_SPECIFIER_PATTERN.test(normalizePath(specifier));
}

export function isClientCapableModule(relativePath) {
	const normalized = normalizePath(relativePath);
	if (!normalized.startsWith("app/")) return false;
	if (isServerOnlySpecifier(normalized)) return false;
	if (/^app\/routes\//.test(normalized)) return false;
	if (/^app\/(?:root|entry\.server)\.[^/]+$/.test(normalized)) return false;
	return SOURCE_EXTENSIONS.has(extname(normalized));
}

export function analyzeSourceFiles(files) {
	const violations = [];

	for (const file of files) {
		if (!isClientCapableModule(file.relativePath)) continue;

		for (const match of file.content.matchAll(IMPORT_PATTERN)) {
			const specifier = match[1] ?? match[2] ?? match[3];
			if (!specifier || !isServerOnlySpecifier(specifier)) continue;

			const line = file.content.slice(0, match.index).split("\n").length;
			violations.push(`${file.relativePath}:${line} importa ${specifier}`);
		}
	}

	return violations;
}

export async function findSourceViolations(projectRoot = PROJECT_ROOT) {
	const appDirectory = resolve(projectRoot, "app");
	const files = await collectFiles(appDirectory, SOURCE_EXTENSIONS, projectRoot);
	return analyzeSourceFiles(files);
}

export async function findBundleViolations(projectRoot = PROJECT_ROOT) {
	const clientDirectory = resolve(projectRoot, "build", "client");
	const files = await collectFiles(clientDirectory, BUNDLE_EXTENSIONS, projectRoot);
	const violations = [];

	for (const file of files) {
		for (const marker of SERVER_BUNDLE_MARKERS) {
			if (marker.test(file.content)) {
				violations.push(`${file.relativePath} contém o marcador ${marker.source}`);
			}
		}
	}

	return violations;
}

async function main() {
	const requireBuild = process.argv.includes("--require-build");
	const sourceViolations = await findSourceViolations();
	let bundleViolations = [];

	try {
		bundleViolations = await findBundleViolations();
	} catch (error) {
		if (error?.code !== "ENOENT" || requireBuild) throw error;
		console.warn(
			"Bundle do navegador ainda não existe; verificação de origem concluída.",
		);
	}

	const violations = [...sourceViolations, ...bundleViolations];
	if (violations.length > 0) {
		console.error("Fronteira cliente/servidor violada:\n" + violations.join("\n"));
		process.exitCode = 1;
		return;
	}

	console.log("Fronteira cliente/servidor verificada sem vazamentos.");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	await main();
}
