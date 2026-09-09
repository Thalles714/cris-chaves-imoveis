import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

const executable = path.resolve("node_modules", "@react-router", "dev", "bin.cjs");
const result = spawnSync(process.execPath, [executable, "build"], {
	stdio: "inherit",
	env: process.env,
});

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

// The Cloudflare adapter may copy the selected local `.dev.vars` beside the
// bundle. Runtime secrets come from bindings, so retaining this development
// copy adds risk and provides no deployment value.
rmSync(path.resolve("build", "server", ".dev.vars"), { force: true });
