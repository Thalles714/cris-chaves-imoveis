// @vitest-environment node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "../..");

const protectedAdminFiles = [
	"admin-audit.tsx",
	"admin-dashboard.tsx",
	"admin-layout.tsx",
	"admin-properties.tsx",
	"admin-property-edit.tsx",
	"admin-property-media.tsx",
	"admin-property-new.tsx",
	"admin-property-review.tsx",
	"admin-members.tsx",
] as const;

async function routeSource(fileName: string): Promise<string> {
	return readFile(resolve(projectRoot, "app/routes", fileName), "utf8");
}

async function registeredAdminRouteFiles(): Promise<string[]> {
	const manifest = await readFile(resolve(projectRoot, "app/routes.ts"), "utf8");
	return [
		...manifest.matchAll(/route\(\s*"admin(?:\/[^"\s]*)?"\s*,\s*"routes\/([^"\s]+)"/gu),
	]
		.map((match) => match[1])
		.filter((fileName): fileName is string => fileName !== undefined);
}

describe("administrative route boundary", () => {
	it("keeps every registered admin route on the private response policy", async () => {
		const adminRouteFiles = await registeredAdminRouteFiles();
		expect(adminRouteFiles.length).toBeGreaterThan(0);
		for (const fileName of adminRouteFiles) {
			const source = await routeSource(fileName);
			expect(source, fileName).toContain("adminResponseHeaders");
		}
	});

	it("applies the form-request guard before every administrative action", async () => {
		const adminRouteFiles = await registeredAdminRouteFiles();
		for (const fileName of adminRouteFiles) {
			const source = await routeSource(fileName);
			if (!source.includes("export async function action")) continue;
			expect(source, fileName).toContain("await assertAdminFormRequest(request)");
		}
	});

	it("reauthorizes each protected admin loader or action at the server boundary", async () => {
		for (const fileName of protectedAdminFiles) {
			const source = await routeSource(fileName);
			expect(source, fileName).toContain("requireAdminRoute(");
		}
	});

	it("keeps the protected admin tree behind its authenticated layout", async () => {
		const manifest = await readFile(resolve(projectRoot, "app/routes.ts"), "utf8");
		const layoutStart = manifest.indexOf('layout("routes/admin-layout.tsx"');
		expect(layoutStart).toBeGreaterThan(-1);
		const protectedTree = manifest.slice(layoutStart);

		for (const fileName of protectedAdminFiles.filter(
			(fileName) => fileName !== "admin-layout.tsx",
		)) {
			expect(protectedTree, fileName).toContain(`"routes/${fileName}"`);
		}
	});

	it("does not opt any administrative route into static prerendering", async () => {
		const adminRouteFiles = [...(await registeredAdminRouteFiles()), "admin-layout.tsx"];
		for (const fileName of new Set(adminRouteFiles)) {
			const source = await routeSource(fileName);
			expect(source, fileName).not.toMatch(/\bprerender\b/u);
		}
	});
});
