import path from "node:path";

export default async function globalSetup() {
	process.env.APP_ENV = "test";
	process.env.CC_LOCAL_PORT = "4173";
	process.env.CC_LOCAL_VARS_FILE = ".dev.vars.test";
	process.env.CLOUDFLARE_INCLUDE_PROCESS_ENV = "true";
	process.env.ComSpec ??= "C:\\Windows\\System32\\cmd.exe";
	process.env.SystemRoot ??= "C:\\Windows";
	process.env.TEMP ??= path.resolve(".cache/tmp");
	process.env.TMP ??= path.resolve(".cache/tmp");
	process.env.XDG_CONFIG_HOME = path.resolve(".cache/xdg-config");

	const { startBuiltLocalServer, stopBuiltLocalServer } =
		await import("../../scripts/serve-built-local.mjs");
	const server = await startBuiltLocalServer();

	return async () => {
		await stopBuiltLocalServer(server);
	};
}
