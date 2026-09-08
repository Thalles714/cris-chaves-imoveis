import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminRecordTabs } from "~/components/admin";

describe("property workflow tabs", () => {
	it("exposes information, media and review as three real steps", () => {
		render(<AdminRecordTabs propertyId="property-1" active="review" />);

		expect(screen.getByRole("link", { name: "1. Informações" })).toHaveAttribute(
			"href",
			"/admin/imoveis/property-1",
		);
		expect(screen.getByRole("link", { name: "2. Fotos e vídeos" })).toHaveAttribute(
			"href",
			"/admin/imoveis/property-1/midia",
		);
		expect(screen.getByRole("link", { name: "3. Revisar e publicar" })).toHaveAttribute(
			"href",
			"/admin/imoveis/property-1/revisar",
		);
		expect(screen.getByRole("link", { name: "3. Revisar e publicar" })).toHaveAttribute(
			"aria-current",
			"page",
		);
	});
});
