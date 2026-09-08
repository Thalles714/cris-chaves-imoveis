import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import AdminPropertyReview from "~/routes/admin-property-review";

const property = {
	id: "1af6b5f5-55cb-4d85-a426-6828d2d90ac7",
	publicCode: "CC-001",
	title: "Casa à venda no Costa do Sol, em Cidreira",
	purpose: "sale" as const,
	propertyType: "Casa",
	publicationStatus: "draft" as const,
	dealStatus: "available" as const,
	priceDisplay: "show" as const,
	priceInCents: 10_000_000,
	city: "Cidreira",
	neighborhood: "Costa do Sol",
	isFeatured: false,
	updatedAt: "2026-09-04T12:00:00.000Z",
	version: 2,
	isDeleted: false,
	slug: "casa-a-venda-costa-do-sol-cidreira",
	description: "Casa bem localizada.",
	totalAreaSquareMeters: 300,
	privateAreaSquareMeters: null,
	lotAreaSquareMeters: 300,
	bedrooms: 2,
	suites: null,
	bathrooms: 1,
	parkingSpaces: null,
	features: ["Perto de mercado"],
	privateDetails: {
		addressLine: null,
		addressNumber: null,
		addressComplement: null,
		postalCode: null,
		ownerName: null,
		ownerContact: null,
		internalNotes: null,
		version: 0,
	},
};

function renderReview(publicationReady = true) {
	return render(
		<AdminPropertyReview
			{...({
				loaderData: {
					property,
					mediaCount: 3,
					publicationReadiness: [
						{ id: "description", label: "Descrição pública preenchida", complete: true },
						{ id: "images", label: "Pelo menos uma foto tratada", complete: true },
						{ id: "cover", label: "Foto de capa definida", complete: true },
					],
					publicationReady,
					saved: false,
				},
			} as unknown as Parameters<typeof AdminPropertyReview>[0])}
		/>,
	);
}

describe("property review and publication step", () => {
	it("places publication and editorial actions in the third step", () => {
		renderReview();

		expect(screen.getByRole("heading", { name: "Revisar e publicar" })).toBeVisible();
		expect(screen.getByRole("button", { name: "Publicar imóvel" })).toBeVisible();
		expect(screen.getByRole("button", { name: "Arquivar" })).toBeVisible();
		expect(screen.getByRole("button", { name: "Mover para excluídos" })).toBeVisible();
		expect(screen.getByText("Dormitórios")).toBeVisible();
		expect(screen.getByText("2", { selector: "dd" })).toBeVisible();
		expect(screen.getByText("Área do terreno")).toBeVisible();
		expect(screen.getAllByText("300 m²")).toHaveLength(2);
	});

	it("keeps the written authorization confirmation on publication", async () => {
		const user = userEvent.setup();
		renderReview();

		await user.click(screen.getByRole("button", { name: "Publicar imóvel" }));

		expect(screen.getByRole("dialog", { name: "Confirme a alteração" })).toBeVisible();
		expect(
			screen.getByRole("checkbox", { name: /autorização escrita do proprietário/u }),
		).toBeRequired();
	});
});
