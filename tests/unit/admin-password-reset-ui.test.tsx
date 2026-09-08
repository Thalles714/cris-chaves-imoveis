import type { ComponentProps } from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-router", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react-router")>();
	return {
		...actual,
		Form: (props: ComponentProps<"form">) => <form {...props} />,
	};
});

import AdminPasswordReset from "~/routes/admin-password-reset";

function renderPasswordReset() {
	const props = { actionData: undefined } as Parameters<typeof AdminPasswordReset>[0];
	return render(<AdminPasswordReset {...props} />);
}

describe("administrative password reset form", () => {
	it("requires two matching passwords with at least twelve characters", () => {
		renderPasswordReset();
		const password = screen.getByLabelText("Nova senha");
		const confirmation = screen.getByLabelText("Confirmar nova senha");

		expect(password).toHaveAttribute("minlength", "12");
		expect(confirmation).toHaveAttribute("minlength", "12");
		expect(password).toHaveAttribute("maxlength", "128");
		expect(confirmation).toHaveAttribute("maxlength", "128");
		expect(password).toHaveAttribute("autocomplete", "new-password");
		expect(confirmation).toHaveAttribute("autocomplete", "new-password");

		fireEvent.input(password, { target: { value: "A1!bcDef9$xy" } });
		fireEvent.input(confirmation, { target: { value: "A1!bcDef0$xy" } });
		expect(confirmation).toBeInvalid();
		expect(confirmation).toHaveProperty(
			"validationMessage",
			"As senhas precisam ser exatamente iguais.",
		);

		fireEvent.input(confirmation, { target: { value: "A1!bcDef9$xy" } });
		expect(confirmation).toBeValid();
	});
});
