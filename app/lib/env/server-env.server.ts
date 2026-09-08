export type AppEnvironment = "development" | "preview" | "production" | "test";

export interface ServerEnvironment {
	appEnvironment: AppEnvironment;
}

export function readServerEnvironment(
	bindings: Readonly<Record<string, unknown>>,
): ServerEnvironment {
	// Missing deployment configuration must fail closed. Local development and
	// tests set APP_ENV explicitly through .dev.vars / the Playwright process.
	const value = bindings.APP_ENV ?? "production";

	if (
		value !== "development" &&
		value !== "preview" &&
		value !== "production" &&
		value !== "test"
	) {
		throw new Error("APP_ENV inválido.");
	}

	return { appEnvironment: value };
}
