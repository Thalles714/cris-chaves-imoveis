import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const packageManager = process.env.npm_execpath;
if (!packageManager) {
	throw new Error("Execute este comando por pnpm para preservar o ambiente de build.");
}

const buildEnvironment = { ...process.env };
delete buildEnvironment.CLOUDFLARE_ENV;

const build = spawnSync(process.execPath, [packageManager, "run", "build"], {
	cwd: process.cwd(),
	env: buildEnvironment,
	stdio: "inherit",
});
if (build.status !== 0) process.exit(build.status ?? 1);

const outputConfigPath = resolve("build/server/wrangler.json");
const config = JSON.parse(readFileSync(outputConfigPath, "utf8"));
const expectedSecrets = [
	"SUPABASE_URL",
	"SUPABASE_PUBLISHABLE_KEY",
	"SUPABASE_SECRET_KEY",
];
const actualSecrets = [...(config.secrets?.required ?? [])].sort();
const expectedRateLimiters = ["2468031", "2468033", "2468034"];
const actualRateLimiters = (config.ratelimits ?? [])
	.map((binding) => binding.namespace_id)
	.sort();

const checks = [
	[config.name === "cris-chaves-imoveis", "nome do Worker"],
	[config.vars?.APP_ENV === "production", "APP_ENV=production"],
	[
		config.vars?.PUBLIC_SITE_URL === "https://crischaves.com.br",
		"origem canônica de produção",
	],
	[config.workers_dev === false, "rota workers.dev desativada"],
	[config.preview_urls === false, "URLs de preview por versão desativadas"],
	[config.observability?.redact_query_string === true, "query string redigida nos logs"],
	[config.observability?.logs?.persist === false, "persistência de logs desativada"],
	[config.observability?.traces?.persist === false, "persistência de traces desativada"],
	[
		JSON.stringify(actualSecrets) === JSON.stringify([...expectedSecrets].sort()),
		"segredos obrigatórios",
	],
	[
		JSON.stringify(actualRateLimiters) === JSON.stringify(expectedRateLimiters),
		"namespaces de rate limit de produção",
	],
];
const failures = checks.filter(([passed]) => !passed).map(([, label]) => label);
if (failures.length > 0) {
	throw new Error(
		`Build de produção recusado: configuração inválida em ${failures.join(", ")}.`,
	);
}

console.log(
	"Build de produção verificado: Worker, origem, ambiente, rotas, telemetria, secrets e rate limits corretos.",
);
