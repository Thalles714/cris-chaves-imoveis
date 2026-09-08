import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const email = z.email().parse(process.argv[2]?.trim().toLowerCase());
const root = resolve(import.meta.dirname, "..");
const allowedVarsFiles = new Set([".dev.vars", ".dev.vars.local"]);
const varsFileArgument = process.argv
	.slice(3)
	.find((argument) => argument.startsWith("--vars-file="));
const requestedVarsFile = varsFileArgument?.slice("--vars-file=".length) ?? ".dev.vars";
if (!allowedVarsFiles.has(requestedVarsFile)) {
	throw new Error("Arquivo de variáveis não permitido para o bootstrap.");
}

function parseDevVars(source) {
	const values = {};
	for (const rawLine of source.split(/\r?\n/u)) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;
		const separator = line.indexOf("=");
		if (separator < 1) continue;
		const name = line.slice(0, separator).trim();
		let value = line.slice(separator + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		values[name] = value;
	}
	return values;
}

const variables = parseDevVars(await readFile(resolve(root, requestedVarsFile), "utf8"));
const configuration = z
	.object({
		SUPABASE_URL: z.url(),
		SUPABASE_SECRET_KEY: z.string().min(20),
		PUBLIC_SITE_URL: z.url(),
	})
	.parse(variables);

const client = createClient(
	configuration.SUPABASE_URL,
	configuration.SUPABASE_SECRET_KEY,
	{
		auth: {
			autoRefreshToken: false,
			detectSessionInUrl: false,
			persistSession: false,
		},
	},
);

const members = await client.from("admin_members").select("user_id").limit(1);
if (members.error) {
	throw new Error(
		`Não foi possível verificar os membros existentes (${members.error.code}: ${members.error.message}).`,
	);
}
if ((members.data?.length ?? 0) > 0) {
	throw new Error("O bootstrap foi bloqueado porque já existe um membro administrativo.");
}

const users = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (users.error) {
	throw new Error(
		`Não foi possível verificar o diretório de usuários (${users.error.status}: ${users.error.message}).`,
	);
}
if (users.data.users.some((user) => user.email?.toLowerCase() === email)) {
	throw new Error("O bootstrap foi bloqueado porque este e-mail já existe no diretório.");
}

const invitationRedirectUrl = new URL(
	"/admin/convite",
	configuration.PUBLIC_SITE_URL,
).toString();
const invited = await client.auth.admin.inviteUserByEmail(email, {
	redirectTo: invitationRedirectUrl,
});
if (invited.error || !invited.data.user) {
	throw new Error("Não foi possível enviar o convite do proprietário.");
}

const membership = await client.from("admin_members").insert({
	user_id: invited.data.user.id,
	role: "owner",
	status: "invited",
	invited_at: new Date().toISOString(),
	activated_at: null,
	disabled_at: null,
	deleted_at: null,
});

if (membership.error) {
	await client.auth.admin.deleteUser(invited.data.user.id, false);
	throw new Error("O convite foi invalidado porque a associação administrativa falhou.");
}

console.log("Convite enviado; proprietário inicial cadastrado como pendente.");
