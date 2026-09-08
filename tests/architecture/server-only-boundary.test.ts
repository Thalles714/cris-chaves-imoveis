// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
	analyzeSourceFiles,
	findSourceViolations,
	isClientCapableModule,
	isServerOnlySpecifier,
} from "../../scripts/check-client-boundaries.mjs";

describe("fronteira entre navegador e servidor", () => {
	it("reconhece módulos e diretórios exclusivos do servidor", () => {
		expect(isServerOnlySpecifier("~/modules/catalog/catalog.server")).toBe(true);
		expect(isServerOnlySpecifier("../services/property.server.ts")).toBe(true);
		expect(isServerOnlySpecifier("~/modules/catalog/public-dto")).toBe(false);
	});

	it("classifica rotas como pontos de separação e componentes como código de cliente", () => {
		expect(isClientCapableModule("app/components/property-card.tsx")).toBe(true);
		expect(isClientCapableModule("app/components/admin/property-form.tsx")).toBe(true);
		expect(isClientCapableModule("app/modules/properties/admin/index.ts")).toBe(true);
		expect(isClientCapableModule("app/routes/home.tsx")).toBe(false);
		expect(isClientCapableModule("app/services/catalog.server.ts")).toBe(false);
		expect(isClientCapableModule("app/modules/properties/admin/index.server.ts")).toBe(
			false,
		);
	});

	it("rejeita um import server-only em um módulo compartilhado", () => {
		const violations = analyzeSourceFiles([
			{
				absolutePath: "app/components/property-card.tsx",
				relativePath: "app/components/property-card.tsx",
				content: 'import { readProperty } from "../services/property.server";',
			},
		]);

		expect(violations).toEqual([
			"app/components/property-card.tsx:1 importa ../services/property.server",
		]);
	});

	it("rejeita reexports e imports dinâmicos server-only no cliente", () => {
		const violations = analyzeSourceFiles([
			{
				absolutePath: "app/modules/properties/admin/index.ts",
				relativePath: "app/modules/properties/admin/index.ts",
				content: [
					'export * from "./admin-property-repository.server";',
					'const repository = import("./supabase-admin-property-repository.server");',
				].join("\n"),
			},
		]);

		expect(violations).toEqual([
			"app/modules/properties/admin/index.ts:1 importa ./admin-property-repository.server",
			"app/modules/properties/admin/index.ts:2 importa ./supabase-admin-property-repository.server",
		]);
	});

	it("mantém a árvore de código atual sem imports server-only em módulos de cliente", async () => {
		await expect(findSourceViolations()).resolves.toEqual([]);
	});
});
