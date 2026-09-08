import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicPropertyCard } from "~/components/public/property-presenter";

describe("public property card", () => {
	it("hides only the numeric price when the value is under consultation", () => {
		render(
			<PublicPropertyCard
				property={{
					publicCode: "DEMO-099",
					slug: "casa-demonstrativa",
					title: "Casa demonstrativa",
					purpose: "sale",
					propertyType: "Casa",
					dealStatus: "available",
					priceInCents: null,
					priceDisplay: "on_request",
					city: "Cidreira",
					neighborhood: "Centro",
					privateAreaSquareMeters: 145,
					bedrooms: 3,
					suites: 1,
					bathrooms: 2,
					parkingSpaces: 2,
					coverImageUrl: null,
					coverImageAlt: "",
				}}
			/>,
		);

		expect(screen.getByText("Sob consulta")).toBeVisible();
		expect(screen.getByText("Dormitórios")).toBeVisible();
		expect(screen.getByText("3")).toBeVisible();
		expect(screen.getByText("Banheiros")).toBeVisible();
		expect(screen.getByText("Vagas")).toBeVisible();
		expect(screen.getByText("145 m²")).toBeVisible();
	});
});
