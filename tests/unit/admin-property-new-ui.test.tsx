import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { QuickPropertyDrawer } from "~/components/admin";
import { createPropertySlug } from "~/modules/properties/admin";
import AdminPropertyNew from "~/routes/admin-property-new";

describe("new property workflow", () => {
	it("creates a readable slug from the title without accents", () => {
		expect(createPropertySlug("Casa à venda — Costa do Sol")).toBe(
			"casa-a-venda-costa-do-sol",
		);
	});

	it("guides a non-technical operator and fills the slug from the title", () => {
		render(
			<AdminPropertyNew
				{...({ actionData: undefined } as Parameters<typeof AdminPropertyNew>[0])}
			/>,
		);

		expect(screen.getByText("Você está na etapa 1 de 3")).toBeVisible();
		fireEvent.change(screen.getByRole("textbox", { name: "Título" }), {
			target: { value: "Casa à venda em Cidreira" },
		});
		expect(screen.getByRole("textbox", { name: "Endereço amigável" })).toHaveValue(
			"casa-a-venda-em-cidreira",
		);
		expect(screen.getByRole("button", { name: "Salvar e continuar" })).toBeEnabled();
	});

	it("generates the friendly address in the quick draft too", async () => {
		const user = userEvent.setup();
		render(<QuickPropertyDrawer />);

		await user.click(screen.getByRole("button", { name: "Cadastrar imóvel" }));
		await user.type(screen.getByRole("textbox", { name: "Título" }), "Casa em Cidreira");

		expect(screen.getByRole("textbox", { name: "Endereço amigável" })).toHaveValue(
			"casa-em-cidreira",
		);
	});

	it("restores every submitted value and identifies the invalid field", () => {
		const values = {
			publicCode: "CC-001",
			title: "Casa à venda no Costa do Sol",
			slug: "casa-a-venda-costa-do-sol",
			purpose: "sale",
			propertyType: "Casa",
			city: "Cidreira",
			neighborhood: "Costa do Sol",
			priceDisplay: "show",
			price: "100000",
			description: "Casa bem localizada.",
			totalAreaSquareMeters: "",
			privateAreaSquareMeters: "",
			lotAreaSquareMeters: "300",
			bedrooms: "2",
			suites: "",
			bathrooms: "1",
			parkingSpaces: "",
			features: "a".repeat(101),
			isFeatured: "false",
		};
		render(
			<AdminPropertyNew
				{...({
					actionData: {
						error: "Cada diferencial deve ter no máximo 100 caracteres.",
						errorField: "features",
						values,
					},
				} as Parameters<typeof AdminPropertyNew>[0])}
			/>,
		);

		expect(screen.getByRole("textbox", { name: "Título" })).toHaveValue(values.title);
		expect(screen.getByRole("spinbutton", { name: "Valor em reais" })).toHaveValue(
			100000,
		);
		expect(screen.getByRole("textbox", { name: "Diferenciais" })).toHaveValue(
			values.features,
		);
		expect(screen.getByRole("textbox", { name: "Diferenciais" })).toHaveAttribute(
			"aria-invalid",
			"true",
		);
	});
});
