import type { Config } from "@react-router/dev/config";

export default {
	ssr: true,
	buildDirectory: process.env.CC_BUILD_DIRECTORY ?? "build",
} satisfies Config;
