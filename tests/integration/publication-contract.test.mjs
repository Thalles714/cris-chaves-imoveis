import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const projectRoot = new URL("../../", import.meta.url);
const migration14 = readFileSync(
	new URL(
		"supabase/migrations/20260905030000_atomic_property_publication.sql",
		projectRoot,
	),
	"utf8",
);
const migration15 = readFileSync(
	new URL(
		"supabase/migrations/20260905040000_simplify_property_publication.sql",
		projectRoot,
	),
	"utf8",
);

function resolveDockerExecutable() {
	const candidates = [
		process.env.LOCALAPPDATA
			? join(
					process.env.LOCALAPPDATA,
					"Programs",
					"DockerDesktop",
					"resources",
					"bin",
					"docker.exe",
				)
			: null,
		process.env.ProgramFiles
			? join(
					process.env.ProgramFiles,
					"Docker",
					"Docker",
					"resources",
					"bin",
					"docker.exe",
				)
			: null,
	].filter(Boolean);

	return candidates.find((candidate) => existsSync(candidate)) ?? "docker";
}

const assertions = `
create or replace function pg_temp.assert_contract(condition boolean, failure text)
returns void
language plpgsql
as $$
begin
  if condition is not true then
    raise exception using errcode = 'P0001', message = failure;
  end if;
end;
$$;
`;

const sql = `
begin;
${assertions}

-- Reproduce the remote database before migration 15.
drop function if exists public.publish_property(uuid, bigint, boolean);
${migration14}

select pg_temp.assert_contract(
  to_regprocedure('public.publish_property(uuid,bigint)') is not null,
  'migration 14 must expose the legacy two-argument publication contract'
);
select pg_temp.assert_contract(
  to_regprocedure('public.publish_property(uuid,bigint,boolean)') is null,
  'migration 14 must not expose the final-confirmation contract'
);
select pg_temp.assert_contract(
  has_function_privilege('authenticated', 'public.publish_property(uuid,bigint)', 'EXECUTE'),
  'authenticated must execute the legacy publication contract'
);
select pg_temp.assert_contract(
  not has_function_privilege('anon', 'public.publish_property(uuid,bigint)', 'EXECUTE'),
  'anon must not execute the legacy publication contract'
);

-- Apply the exact migration pending in production.
${migration15}

select pg_temp.assert_contract(
  to_regprocedure('public.publish_property(uuid,bigint)') is null,
  'migration 15 must remove the legacy publication contract'
);
select pg_temp.assert_contract(
  to_regprocedure('public.publish_property(uuid,bigint,boolean)') is not null,
  'migration 15 must expose the final-confirmation contract'
);
select pg_temp.assert_contract(
  has_function_privilege(
    'authenticated',
    'public.publish_property(uuid,bigint,boolean)',
    'EXECUTE'
  ),
  'authenticated must execute the current publication contract'
);
select pg_temp.assert_contract(
  not has_function_privilege(
    'anon',
    'public.publish_property(uuid,bigint,boolean)',
    'EXECUTE'
  ),
  'anon must not execute the current publication contract'
);
select pg_temp.assert_contract(
  (
    select pg_get_function_identity_arguments(procedure.oid)
    from pg_proc as procedure
    inner join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'publish_property'
  ) = 'p_property_id uuid, p_expected_version bigint, p_authorization_confirmed boolean',
  'the current publication arguments must keep their expected names, order and types'
);
select pg_temp.assert_contract(
  (
    select count(*)
    from pg_proc as procedure
    inner join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'publish_property'
  ) = 1,
  'only one public publication contract may remain after migration 15'
);

rollback;
`;

const result = spawnSync(
	resolveDockerExecutable(),
	[
		"exec",
		"-i",
		"supabase_db_cris-chaves-imoveis",
		"psql",
		"-X",
		"-v",
		"ON_ERROR_STOP=1",
		"-U",
		"postgres",
		"-d",
		"postgres",
	],
	{ cwd: projectRoot, encoding: "utf8", input: sql },
);

if (result.status !== 0) {
	process.stderr.write(result.stderr || result.stdout);
	process.exit(result.status ?? 1);
}

process.stdout.write(
	"Contratos de publicação das migrations 14 e 15 validados com rollback.\n",
);
