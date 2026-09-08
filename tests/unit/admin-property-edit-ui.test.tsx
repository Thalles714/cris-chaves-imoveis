import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AdminPropertyEdit from "~/routes/admin-property-edit";

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
		addressLine: "Rua Petúnia",
		addressNumber: "2215",
		addressComplement: null,
		postalCode: null,
		ownerName: null,
		ownerContact: null,
		internalNotes: "Chave com o proprietário. Aceita proposta.",
		version: 1,
	},
};

function renderEdit(saved: boolean, publicationReady = false) {
	const props = {
		loaderData: {
			property,
			publicationReadiness: [],
			publicationReady,
			justCreated: false,
			saved,
		},
		actionData: undefined,
	} as unknown as Parameters<typeof AdminPropertyEdit>[0];

	return render(<AdminPropertyEdit {...props} />);
}

describe("property private-data workflow", () => {
	it("confirms visibly that the submitted data was saved", () => {
		renderEdit(true);

		expect(screen.getByText("Dados salvos")).toBeVisible();
	});

	it("keeps internal information optional and out of the publication checklist", () => {
		renderEdit(false);

		expect(screen.getByText("Informações internas")).toBeVisible();
		expect(screen.queryByText(/Autorização para anunciar/u)).not.toBeInTheDocument();
	});

	it("sends a ready property to the dedicated review step", () => {
		renderEdit(false, true);

		expect(screen.getByRole("link", { name: "Revisar e publicar" })).toHaveAttribute(
			"href",
			`/admin/imoveis/${property.id}/revisar`,
		);
		expect(
			screen.queryByRole("button", { name: "Publicar imóvel" }),
		).not.toBeInTheDocument();
	});
});
