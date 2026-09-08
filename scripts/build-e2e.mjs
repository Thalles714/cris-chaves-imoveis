import { spawnSync } from "node:child_process";
import path from "node:path";

const executable = path.resolve("node_modules", "@react-router", "dev", "bin.cjs");
const result = spawnSync(process.execPath, [executable, "build"], {
	stdio: "inherit",
	env: {
		...process.env,
		CLOUDFLARE_ENV: "test",
		XDG_CONFIG_HOME: path.resolve(".cache", "xdg-config"),
	},
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
