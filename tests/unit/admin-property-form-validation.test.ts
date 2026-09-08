import { describe, expect, it } from "vitest";

import {
	adminPropertyDraftErrorField,
	parseAdminPropertyDraftForm,
	parseAdminPropertyTransitionForm,
	readAdminPropertyDraftFormValues,
} from "~/routes/admin-property-form.server";

function validForm() {
	const form = new FormData();
	form.set("publicCode", "CC-001");
	form.set("title", "Casa à venda no Costa do Sol");
	form.set("slug", "casa-a-venda-costa-do-sol");
	form.set("purpose", "sale");
	form.set("propertyType", "Casa");
	form.set("priceDisplay", "show");
	form.set("price", "100000");
	form.set("city", "Cidreira");
	form.set("neighborhood", "Costa do Sol");
	form.set("description", "Casa bem localizada.");
	return form;
}

describe("admin property form validation", () => {
	it("returns a clear Portuguese message for an oversized feature", () => {
		const form = validForm();
		form.set("features", "a".repeat(101));

		const result = parseAdminPropertyDraftForm(form);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe(
				"Cada diferencial deve ter no máximo 100 caracteres.",
			);
			expect(adminPropertyDraftErrorField(result.error)).toBe("features");
		}
		expect(readAdminPropertyDraftFormValues(form).features).toHaveLength(101);
	});

	it("accepts common separators while keeping each feature short", () => {
		const form = validForm();
		form.set("features", "Sala; Cozinha • Aceita proposta\nPróximo a mercado");

		const result = parseAdminPropertyDraftForm(form);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.features).toEqual([
				"Sala",
				"Cozinha",
				"Aceita proposta",
				"Próximo a mercado",
			]);
		}
	});

	it("requires the written-authorization checkbox only for publication", () => {
		const propertyId = "10000000-0000-4000-8000-000000000001";
		const publishForm = new FormData();
		publishForm.set("expectedVersion", "3");
		publishForm.set("transition", "publish");

		expect(parseAdminPropertyTransitionForm(publishForm, propertyId).success).toBe(false);

		publishForm.set("authorizationConfirmed", "true");
		const confirmed = parseAdminPropertyTransitionForm(publishForm, propertyId);
		expect(confirmed.success).toBe(true);
		if (confirmed.success) expect(confirmed.data.authorizationConfirmed).toBe(true);

		const archiveForm = new FormData();
		archiveForm.set("expectedVersion", "3");
		archiveForm.set("transition", "archive");
		expect(parseAdminPropertyTransitionForm(archiveForm, propertyId).success).toBe(true);
	});
});
