import { access, readdir, readFile } from "node:fs/promises";
import { basename, dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCANNED_DIRECTORIES = [
	".github",
	"app",
	"public",
	"scripts",
	"supabase",
	"tests",
	"workers",
];
const ROOT_FILES = new Set([
	"eslint.config.js",
	"package.json",
	"playwright.config.ts",
	"pnpm-workspace.yaml",
	"react-router.config.ts",
	"tsconfig.cloudflare.json",
	"tsconfig.json",
	"tsconfig.node.json",
	"vite.config.ts",
	"vitest.config.ts",
	"wrangler.json",
	"wrangler.jsonc",
]);
const GENERATED_SECRET_FILES = [
	"build/server/.dev.vars",
	".build-check/server/.dev.vars",
];
const TEXT_EXTENSIONS = new Set([
	".cjs",
	".css",
	".html",
	".js",
	".json",
	".jsx",
	".md",
	".mjs",
	".ts",
	".tsx",
	".txt",
	".yaml",
	".yml",
]);

const APPROVED_PUBLIC_FINDINGS = new Map([
	["wrangler.jsonc", new Set(["CRECI numérico"])],
	["app/components/admin/media-manager.tsx", new Set(["CRECI numérico"])],
	["tests/unit/media-browser-pipeline.test.ts", new Set(["CRECI numérico"])],
]);

const RULES = [
	{
		name: "chave privada",
		pattern: /-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/g,
	},
	{
		name: "token JWT",
		pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
	},
	{
		name: "token de provedor",
		pattern:
			/\b(?:AKIA[0-9A-Z]{16}|gh[opsu]_[A-Za-z0-9]{30,}|sk_(?:live|test)_[A-Za-z0-9]{20,})\b/g,
	},
	{
		name: "chave privilegiada Supabase",
		pattern: /\bsb_secret_[A-Za-z0-9_-]{20,}\b/g,
	},
	{
		name: "segredo atribuído em código",
		pattern:
			/\b(?:API_KEY|ADMIN_PASSWORD|DATABASE_URL|PRIVATE_KEY|SECRET|SERVICE_ROLE_KEY|TOKEN)\b\s*[:=]\s*["'][^"'${}<>\s][^"']{7,}["']/gi,
	},
	{
		name: "endereço de e-mail",
		pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
	},
	{
		name: "telefone brasileiro formatado",
		pattern:
			/(?:\+\s*55[\s.-]+(?:\(?[1-9]{2}\)?[\s.-]+)?|(?:\([1-9]{2}\)|[1-9]{2}[\s.-]+)[\s.-]*)(?:9\d{4}|[2-5]\d{3})[\s.-]+\d{4}\b/g,
	},
	{
		name: "telefone brasileiro atribuído",
		pattern: /\b(?:phone|telefone|whatsapp)\b\s*[:=]\s*["'](?:\+?55)?\d{10,11}["']/gi,
	},
	{
		name: "CPF formatado",
		pattern: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g,
	},
	{
		name: "CRECI numérico",
		pattern: /\bCRECI(?:-[A-Z]{2})?\s*[:#-]?\s*\d{3,8}\b/gi,
	},
];

function normalizePath(filePath) {
	return filePath.replaceAll("\\", "/");
}

async function collectDirectory(directory) {
	let entries;
	try {
		entries = await readdir(directory, { withFileTypes: true });
	} catch (error) {
		if (error?.code === "ENOENT") return [];
		throw error;
	}

	const files = [];
	for (const entry of entries) {
		const absolutePath = resolve(directory, entry.name);
		if (entry.isDirectory()) {
			if (
				[
					"build",
					"coverage",
					"node_modules",
					"playwright-report",
					"test-results",
				].includes(entry.name)
			) {
				continue;
			}
			files.push(...(await collectDirectory(absolutePath)));
		} else if (entry.isFile() && TEXT_EXTENSIONS.has(extname(entry.name))) {
			files.push(absolutePath);
		}
	}

	return files;
}

async function collectFiles() {
	const files = [];
	for (const directory of SCANNED_DIRECTORIES) {
		files.push(...(await collectDirectory(resolve(PROJECT_ROOT, directory))));
	}

	const rootEntries = await readdir(PROJECT_ROOT, { withFileTypes: true });
	for (const entry of rootEntries) {
		if (!entry.isFile()) continue;
		if (ROOT_FILES.has(entry.name) || entry.name.startsWith(".env")) {
			files.push(resolve(PROJECT_ROOT, entry.name));
		}
	}
	for (const relativePath of GENERATED_SECRET_FILES) {
		const absolutePath = resolve(PROJECT_ROOT, relativePath);
		try {
			await access(absolutePath);
			files.push(absolutePath);
		} catch {
			// Absence is the expected secure state after a build.
		}
	}

	return [...new Set(files)];
}

function redact(value) {
	if (value.length < 5) return "[redigido]";
	return `${value.slice(0, 2)}…${value.slice(-2)}`;
}

async function main() {
	const findings = [];
	for (const absolutePath of await collectFiles()) {
		const content = await readFile(absolutePath, "utf8");
		for (const rule of RULES) {
			const relativePath = normalizePath(relative(PROJECT_ROOT, absolutePath));
			if (APPROVED_PUBLIC_FINDINGS.get(relativePath)?.has(rule.name)) continue;
			rule.pattern.lastIndex = 0;
			for (const match of content.matchAll(rule.pattern)) {
				const line = content.slice(0, match.index).split("\n").length;
				findings.push({
					file: relativePath,
					line,
					rule: rule.name,
					value: redact(match[0]),
				});
			}
		}
	}

	if (findings.length > 0) {
		console.error("Dados sensíveis encontrados na superfície executável:");
		for (const finding of findings) {
			console.error(
				`- ${finding.file}:${finding.line} — ${finding.rule} (${finding.value})`,
			);
		}
		process.exitCode = 1;
		return;
	}

	console.log(
		`Nenhum segredo ou dado pessoal encontrado em ${basename(PROJECT_ROOT)} (código, configuração e testes).`,
	);
}

await main();
