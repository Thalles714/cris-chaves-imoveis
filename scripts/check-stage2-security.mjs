import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const migrationDirectory = resolve(root, "supabase", "migrations");
const migrationNames = (await readdir(migrationDirectory)).filter((name) =>
	name.endsWith(".sql"),
);
const migrations = (
	await Promise.all(
		migrationNames.map((name) => readFile(resolve(migrationDirectory, name), "utf8")),
	)
).join("\n");
const seed = await readFile(resolve(root, "supabase", "seed.sql"), "utf8");
const config = await readFile(resolve(root, "supabase", "config.toml"), "utf8");

const required = [
	/create table public\.properties\b/,
	/create table public\.property_private_details\b/,
	/create table public\.property_media\b/,
	/create table public\.admin_members\b/,
	/create table public\.audit_events\b/,
	/create table public\.public_property_catalog\b/,
	/public_property_catalog \([\s\S]*title text not null/,
	/create table public\.public_property_media \([\s\S]*public_object_path text/,
	/alter table public\.properties force row level security/,
	/alter table public\.property_private_details force row level security/,
	/alter table public\.property_media force row level security/,
	/alter table public\.admin_members force row level security/,
	/alter table public\.audit_events force row level security/,
	/create trigger audit_events_append_only/,
	/request_id uuid/,
	/storage\.allow_any_operation/,
	/app_private\.has_aal2\(\)/,
	/maximum of 30 images per property exceeded/,
	/one gigabyte media budget exceeded/,
	/revoke delete on public\.properties from authenticated/,
	/revoke delete on public\.property_private_details from authenticated/,
	/revoke delete on public\.property_media from authenticated/,
	/revoke delete on storage\.objects from authenticated/,
	/original_checksum_sha256/,
];

const failures = required.filter((pattern) => !pattern.test(migrations));
if (/create\s+(?:table|view).*\bleads\b/i.test(migrations)) {
	failures.push(/leads persistence must remain absent/);
}
if (!/enable_signup\s*=\s*false/.test(config)) {
	failures.push(/public signup must be disabled/);
}
if (
	!/\[auth\.mfa\.totp\][\s\S]*enroll_enabled\s*=\s*true[\s\S]*verify_enabled\s*=\s*true/.test(
		config,
	)
) {
	failures.push(/TOTP enrollment and verification must be enabled/);
}
if (/\binsert\s+into\b/i.test(seed)) {
	failures.push(/the production-shaped seed must keep the catalog empty/);
}

if (failures.length > 0) {
	console.error("A fundação de segurança da Etapa 2 está incompleta:");
	for (const failure of failures) console.error(`- ${failure.source}`);
	process.exitCode = 1;
} else {
	console.log(
		`Etapa 2 verificada estaticamente em ${migrationNames.length} migrations: RLS, AAL2, mídia, auditoria e ausência de leads presentes.`,
	);
}
